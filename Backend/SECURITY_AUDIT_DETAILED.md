# AUDITORÍA DE SEGURIDAD - NEXUS IA FITNESS BACKEND
**Fecha**: 18 de Abril de 2026
**Auditor**: AppSec Security Engineer (Senior)
**Enfoque**: Node.js/Express + Prisma PostgreSQL Backend

---

## RESUMEN EJECUTIVO

El backend de Nexus Athletics exhibe una **postura de seguridad MIXTA**:

**FORTALEZAS:**
- JWT implementation con expiración (15m access, 7d refresh)
- Bcrypt con cost factor adecuado (12 rounds)
- CORS whitelist explícito (no wildcard)
- Helmet y security headers configurados
- Rate limiting en endpoints de auth
- Admin authorization checks
- Validación de input básica
- OAuth verification (Google ID token signature checking)

**DEBILIDADES CRÍTICAS:**
1. **9 vulnerabilidades críticas en dependencias** (fast-xml-parser, axios, multer, lodash, node-forge)
2. **Variables de entorno expuestas en .env** (credenciales en repositorio)
3. **Falta de validación de entrada con express-validator** en varias rutas
4. **JWT_REFRESH_SECRET no implementado** (solo JWT_SECRET)
5. **PayPal orderId no verificado** antes de procesar pagos
6. **Missing rate limiting global** (solo en auth endpoints)
7. **Falta de middleware de error handling global**
8. **Logging expone datos sensibles** en algunos casos
9. **Morgan no configurado** (sin request logging)
10. **Ausencia de Input Sanitization** contra XSS en campos de texto libre

---

## HALLAZGOS DETALLADOS

---

### 🔴 CRÍTICO #1: Vulnerabilidades en Dependencias NPM

**Categoría**: OWASP A06:2021 - Vulnerable & Outdated Components | CWE-1104: Use of Unmaintained Third Party Components

**Severidad**: Crítico

**Ubicación**: `package.json` (múltiples dependencias)

**Descripción**
El proyecto contiene **11+ vulnerabilidades críticas/altas** en dependencias:
- **fast-xml-parser** (CRÍTICO): Múltiples bypasses en entity expansion, stack overflow
- **axios** (ALTO): DoS via __proto__, SSRF, metadata exfiltration
- **multer** (ALTO): DoS via incomplete cleanup, uncontrolled recursion
- **lodash** (ALTO): Code injection, prototype pollution
- **node-forge** (ALTO): Signature forgery, certificate chain bypass
- **follow-redirects** (MEDIO): Header leakage across redirects
- **path-to-regexp** (ALTO): ReDoS via wildcards
- **nodemailer/mailparser** (MEDIO): SMTP injection, XSS

**Vector de Ataque**
Un atacante podría explotar estas vulnerabilidades para:
- XML bombs/DoS (fast-xml-parser)
- Prototipue pollution en axios
- Upload-based DoS (multer)
- SSRF/metadata exfiltration (axios)
- Auth header leakage (follow-redirects)

**Impacto**
- Denegación de servicio
- Inyección remota de código
- Exfiltración de metadatos en entornos cloud
- Bypass de autenticación
- Corrupción de estado de la aplicación

**✅ Solución**
```bash
cd Backend
npm audit fix
npm install axios@latest multer@latest lodash@latest follow-redirects@latest --save
```

Si hay breaking changes con `npm audit fix --force`, considerar:
- firebase-admin: Requiere refactorización mínima si se usa
- express upgrade si es requerido

**Recomendaciones Adicionales**
- Ejecutar `npm audit` en CI/CD antes de cada deploy
- Configurar Dependabot o Snyk para alertas automáticas
- Mantener un schedule semanal de security updates

---

### 🔴 CRÍTICO #2: Credenciales Expuestas en .env

**Categoría**: OWASP A02:2021 - Cryptographic Failures | CWE-798: Use of Hard-coded Credentials

**Severidad**: Crítico

**Ubicación**: `/Backend/.env` (líneas 1-25, todo el archivo)

**Descripción**
El archivo `.env` contiene credenciales en claro en el repositorio Git:
- JWT_SECRET expuesto (64 caracteres, pero en VCS)
- GEMINI_API_KEY (Google AI)
- OPENAI_API_KEY (sk_proj-...)
- STRIPE_SECRET_KEY (sk_test_...)
- PAYPAL_CLIENT_ID/SECRET
- RESEND_API_KEY
- CLOUDINARY credenciales
- SUPABASE_URL y ANON_KEY
- Google OAuth IDs

**Vector de Ataque**
```bash
git log --all --full-history -- Backend/.env
git show <commit>:.env
# Extraer todas las credenciales del historial Git
```

Un atacante que tenga acceso al repositorio (privado pero comprometido) puede:
1. Usar Google Gemini/OpenAI APIs para AI abuse
2. Procesar pagos fraudulentos con Stripe/PayPal
3. Explotar Google OAuth con client IDs expuestos
4. Acceder a Cloudinary y editar/eliminar imágenes
5. Impersonar la aplicación en Resend (email spoofing)

**Impacto**
- Pérdida total de confidencialidad de secretos
- Abuso de APIs (costos significativos)
- Fraude de pagos
- Suplantación de identidad de la aplicación
- Acceso no autorizado a datos de usuarios

**✅ Código Seguro**
```bash
# 1. Eliminar .env del historial Git (WARNING: destructive)
# IMPORTANTE: Solo hacer si el repo es PRIVADO
git filter-branch --tree-filter 'rm -f Backend/.env' HEAD
# O usar git-filter-repo (recomendado):
git filter-repo --path Backend/.env --invert-paths

# 2. Crear .env.example (sin secretos):
cp Backend/.env Backend/.env.example
# Editar .env.example para reemplazar valores con placeholders

# 3. Actualizar .gitignore
echo "Backend/.env" >> .gitignore
git add .gitignore
git commit -m "Add .env to .gitignore"

# 4. En producción, USAR VARIABLES DE ENTORNO del sistema operativo
# Ejemplo para Render.com:
# - Ir a Environment Variables en el dashboard
# - Pegar cada key=value
# - El proceso nunca toca Git

# 5. ROTAR todas las credenciales comprometidas:
# - Google: Regenerar API key en Cloud Console
# - Stripe: Revoke sk_test_*, generate new
# - PayPal: Change app secret
# - OpenAI: Regenerate API key
# - Resend: Regenerate API key
# - Cloudinary: Regenerate API secret
# - Supabase: Regenerate anon key
```

**Recomendaciones Adicionales**
- Implementar pre-commit hook que prevenga commits de .env:
  ```bash
  # .githooks/pre-commit
  #!/bin/bash
  if git diff --cached --name-only | grep -E "\.env"; then
    echo "ERROR: .env files cannot be committed"
    exit 1
  fi
  ```
- Usar `git secrets` o `pre-commit` framework para detectar patterns
- En CI/CD, inyectar secrets como variables de entorno del runner
- Audit git log regularmente: `git log --all --source --remotes --oneline | grep -i secret`

---

### 🔴 CRÍTICO #3: JWT_REFRESH_SECRET No Implementado

**Categoría**: OWASP A02:2021 - Cryptographic Failures | CWE-347: Improper Verification of Cryptographic Signature

**Severidad**: Crítico

**Ubicación**: `src/controllers/authController.js` líneas 49-55 y 542-592

**Descripción**
El refresh token se firma con el **mismo JWT_SECRET** que el access token. En implementaciones robustas, cada tipo de token debe tener su propio secret:

```javascript
// VULNERABLE - línea 49-55
function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,  // <-- Mismo secret que access token
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
}

// VULNERABLE - línea 555
decoded = jwt.verify(oldRefreshToken, JWT_SECRET);
```

**Vector de Ataque**
Si alguien comprometiera JWT_SECRET (ej: a través de .env en repositorio):
1. Podrían crear access tokens válidos directamente
2. Podrían crear refresh tokens válidos directamente
3. Sin poder diferenciarse, ambos tokens son equivalentes

Un refresh token comprometido de larga vida (7 días) es más peligroso que un access token corto (15 min).

**Impacto**
- Reutilización del mismo secreto reduce el benefit de separación
- Si JWT_SECRET es comprometido, TODOS los tokens de ambos tipos son inválidos
- No hay rotación independiente de secrets
- Violación del principio de "least privilege" para secrets

**❌ Código Vulnerable**
```javascript
// authController.js línea 49-55
function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,  // PROBLEMA: mismo secret
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
}

// middleware/authMiddleware.js - No diferencia entre tipos
jwt.verify(token, JWT_SECRET, (err, user) => {
    // No verifica que type === 'access'
    req.user = user;
    next();
});
```

**✅ Código Seguro**
```javascript
// authMiddleware.js - MEJORADO
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
    throw new Error('FATAL: JWT_SECRET not configured or weak');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 64) {
    throw new Error('FATAL: JWT_REFRESH_SECRET not configured or weak');
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "No autorizado. Token falta." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn(`[SECURITY] Invalid token from IP: ${req.ip}`);
            return res.status(403).json({ error: "Token inválido o expirado" });
        }

        // Verificar que sea un access token, no un refresh token
        if (user.type === 'refresh') {
            return res.status(403).json({ error: "Refresh token cannot be used as access token" });
        }

        req.user = user;
        next();
    });
};

// authController.js - MEJORADO
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_REFRESH_SECRET,  // DIFERENTE SECRET
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
}

const refreshToken = async (req, res) => {
    try {
        const { refreshToken: oldRefreshToken } = req.body;

        if (!oldRefreshToken) {
            return res.status(400).json({
                error: 'Refresh token requerido',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);  // Usar JWT_REFRESH_SECRET
        } catch (err) {
            return res.status(401).json({
                error: 'Refresh token inválido o expirado',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        // Verificar que sea efectivamente un refresh token
        if (decoded.type !== 'refresh') {
            return res.status(403).json({
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await oauthService.logAuthAction(user.id, 'token_refresh', 'jwt', true, null, req);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 15 * 60
        });

    } catch (error) {
        console.error('Error en refreshToken:', error);
        res.status(500).json({
            error: 'Error al refrescar el token',
            code: 'REFRESH_ERROR'
        });
    }
};
```

**Recomendaciones Adicionales**
- Generar JWT_REFRESH_SECRET en producción:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Añadir ambos secrets a .env.example
- Implementar token revocation list (blacklist) si es necesario logout inmediato
- Considerar JWT_SECRET rotation cada 6 meses (con grace period)
- En el .env.example:
  ```
  JWT_SECRET="<generate-with-openssl-rand-hex-64>"
  JWT_REFRESH_SECRET="<generate-with-openssl-rand-hex-64>"
  ```

---

### 🔴 CRÍTICO #4: PayPal Payment Bypass (No Verificación de Order ID)

**Categoría**: OWASP A01:2021 - Broken Access Control | CWE-358: Improperly Restricted Modification of Extensible Markup Language Attribute

**Severidad**: Crítico

**Ubicación**: `src/controllers/paymentController.js` líneas 14-53

**Descripción**
El endpoint `/payments/paypal` actualiza el plan del usuario sin verificar con PayPal que el pago realmente fue procesado:

```javascript
const processPayPal = async (req, res) => {
    const { amount, plan, orderId } = req.body;
    // ...
    // SECURITY NOTE: In production, verify orderId with PayPal API
    // to ensure the transaction actually occurred before updating plan

    const user = await prisma.user.update({
        where: { id: userId },
        data: { plan }  // Se actualiza sin verificar!
        // ...
    });
```

**Vector de Ataque**
Un atacante puede:
1. Interceptar cualquier request y cambiar `orderId` a un valor falso
2. Enviar `amount: 0.01` (pago mínimo) pero recibir plan `Ultimate` ($99.99)
3. Usar orderId de otro usuario para activar su plan
4. Activar planes sin pagar en absoluto

```bash
curl -X POST http://localhost:3000/payments/paypal \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.01,
    "plan": "Ultimate",
    "orderId": "fake-order-id"
  }'
# Respuesta: plan actualizado a Ultimate sin pagar
```

**Impacto**
- Pérdida de ingresos por fraude de pagos
- Usuarios pueden obtener planes premium sin pagar
- Transacciones duplicadas si no verificadas
- Violación del PCI DSS (si se procesa tarjetas)

**❌ Código Vulnerable**
```javascript
const processPayPal = async (req, res) => {
    const { amount, plan, orderId } = req.body;

    try {
        // Input validation, pero NO VERIFICA CON PAYPAL
        if (!amount || !plan || !orderId) {
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        // ... validación de amount y plan ...

        // BUG: Se actualiza el plan sin verificar el orderId con PayPal
        const user = await prisma.user.update({
            where: { id: userId },
            data: { plan },
            select: safeUserSelect
        });

        res.json({ success: true, user, message: "Pago procesado" });
    } catch (error) {
        // ...
    }
};
```

**✅ Código Seguro**
```javascript
const axios = require('axios');

// Función auxiliar para obtener PayPal access token
async function getPayPalAccessToken() {
    try {
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
        ).toString('base64');

        const response = await axios.post(
            'https://api.paypal.com/v1/oauth2/token',
            'grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Failed to get PayPal token:', error.message);
        throw new Error('PayPal authentication failed');
    }
}

// Función para verificar orden en PayPal
async function verifyPayPalOrder(orderId) {
    try {
        const accessToken = await getPayPalAccessToken();

        const response = await axios.get(
            `https://api.paypal.com/v2/checkout/orders/${orderId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            }
        );

        const order = response.data;

        // Validar que la orden existe y está completada
        if (order.status !== 'COMPLETED') {
            console.warn(`[SECURITY] PayPal order ${orderId} not completed. Status: ${order.status}`);
            return { valid: false, error: 'Order not completed' };
        }

        // Validar que hay al menos una captura de pago
        if (!order.purchase_units || order.purchase_units.length === 0) {
            return { valid: false, error: 'No purchase units found' };
        }

        const purchase = order.purchase_units[0];
        if (!purchase.payments || !purchase.payments.captures || purchase.payments.captures.length === 0) {
            return { valid: false, error: 'No payment capture found' };
        }

        const capture = purchase.payments.captures[0];
        if (capture.status !== 'COMPLETED') {
            console.warn(`[SECURITY] PayPal capture ${capture.id} not completed`);
            return { valid: false, error: 'Payment not captured' };
        }

        return {
            valid: true,
            orderId,
            amount: capture.amount.value,
            currency: capture.amount.currency_code,
            payer: order.payer.email_address,
            timestamp: capture.create_time
        };
    } catch (error) {
        console.error('PayPal verification error:', error.message);
        return { valid: false, error: 'Verification failed' };
    }
}

const processPayPal = async (req, res) => {
    const { amount, plan, orderId } = req.body;
    const userId = req.user.id;

    try {
        // 1. VALIDAR ENTRADA
        if (!amount || !plan || !orderId) {
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        if (typeof amount !== 'number' || amount <= 0 || amount > 10000) {
            return res.status(400).json({ error: "Cantidad inválida" });
        }

        const validPlans = ['Gratis', 'Pro', 'Ultimate'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: "Plan inválido" });
        }

        // 2. VALIDAR ORDEN CON PAYPAL (CRÍTICO)
        const verification = await verifyPayPalOrder(orderId);
        if (!verification.valid) {
            console.warn(`[SECURITY] PayPal order verification failed for user ${userId}: ${verification.error}`);
            return res.status(400).json({
                error: "La orden no pudo ser verificada",
                details: verification.error
            });
        }

        // 3. VALIDAR MONTO CON EL CONFIGURADO EN TU SISTEMA
        const planPrices = {
            'Gratis': 0,
            'Pro': 9.99,
            'Ultimate': 19.99
        };

        const expectedAmount = planPrices[plan];
        const paypalAmount = parseFloat(verification.amount);

        if (Math.abs(paypalAmount - expectedAmount) > 0.01) {
            console.warn(
                `[SECURITY] PayPal amount mismatch for user ${userId}: ` +
                `Expected €${expectedAmount}, got €${paypalAmount}`
            );
            return res.status(400).json({
                error: "El monto no coincide con el plan seleccionado"
            });
        }

        // 4. REGISTRAR TRANSACCIÓN (antes de actualizar, para auditoria)
        const transaction = await prisma.paymentTransaction.create({
            data: {
                userId,
                provider: 'paypal',
                orderId,
                amount: paypalAmount,
                currency: verification.currency,
                status: 'COMPLETED',
                payer: verification.payer,
                plan,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // 5. ACTUALIZAR PLAN (ya verificado)
        const user = await prisma.user.update({
            where: { id: userId },
            data: { plan },
            select: safeUserSelect
        });

        console.log(
            `[PAYMENT SUCCESS] PayPal - User ${userId}, Plan ${plan}, ` +
            `Amount €${paypalAmount}, Order ${orderId}`
        );

        res.json({
            success: true,
            user,
            message: "Pago procesado exitosamente con PayPal",
            transactionId: transaction.id
        });
    } catch (error) {
        console.error("[PAYMENT ERROR] PayPal error:", error.message);
        res.status(500).json({
            error: "Error al procesar pago con PayPal"
        });
    }
};
```

**Nota**: Requiere modelo `PaymentTransaction` en Prisma para auditar transacciones.

**Recomendaciones Adicionales**
- Implementar tabla `PaymentTransaction` para auditar TODOS los pagos
- Usar webhooks de PayPal para confirmar pagos asincronamente (complementario)
- Implementar idempotency keys (ya parcialmente en Stripe)
- Realizar reconciliación diaria: comparar órdenes en BD con órdenes en PayPal
- PCI DSS: Nunca procesar números de tarjeta en el backend (delegar a PayPal/Stripe)

---

### 🟠 ALTO #5: Falta de Rate Limiting Global

**Categoría**: OWASP A04:2021 - Insecure Design | CWE-770: Allocation of Resources Without Limits or Throttling

**Severidad**: Alto

**Ubicación**: `index.js` (falta de middleware global)

**Descripción**
Solo hay rate limiting en endpoints de auth. Las rutas protegidas (chat, activities, pagos) carecen de protección contra abuso:

```javascript
// index.js - solo tiene rate limiting en auth routes
app.use('/auth', authRoutes);  // Limitado
app.use('/user', userRoutes);  // SIN limitar
app.use('/chat', chatRoutes);  // SIN limitar
```

**Vector de Ataque**
Un usuario autenticado podría:
1. Abusar del chat para hacer 999k requests/día (llena BD, costos Gemini)
2. Crear actividades infinitas
3. Spamear notificaciones
4. Abuso de APIs externas (Gemini, OpenAI)

```bash
# Ataque: 1000 requests en paralelo al endpoint de chat
for i in {1..1000}; do
  curl -X POST http://localhost:3000/chat/send \
    -H "Authorization: Bearer <token>" \
    -d '{"message":"test"}' &
done
```

**Impacto**
- DoS (Denegación de Servicio)
- Costos inflados de APIs (Gemini, OpenAI)
- Llenado de base de datos
- Degradación de performance para otros usuarios

**❌ Código Vulnerable** (actual)
```javascript
// index.js - no hay rate limiting global
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
// ... ningún middleware de rate limiting global ...
app.use('/auth', authRoutes);
```

**✅ Código Seguro**
```javascript
const rateLimit = require('express-rate-limit');

// GLOBAL rate limiter: 100 requests por 15 minutos
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                    // Max 100 requests
    message: {
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting para health checks
        return req.path === '/health';
    },
    keyGenerator: (req, res) => {
        // Usar IP real (detrás de proxy)
        return req.ip || req.connection.remoteAddress;
    }
});

// API-specific limiters
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 30,                     // 30 messages/min
    message: { error: 'Límite de chat alcanzado' },
    skip: (req) => process.env.NODE_ENV === 'test'
});

const activityLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 20,                     // 20 activities/min
    message: { error: 'Límite de actividades alcanzado' }
});

const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,    // 1 hour
    max: 10,                     // 10 payment attempts/hour
    message: { error: 'Límite de pagos alcanzado' }
});

// Aplicar global limiter a TODAS las rutas (excepto health)
app.use(globalLimiter);

// Aplicar limiters específicos
app.use('/chat', chatLimiter, chatRoutes);
app.use('/activities', activityLimiter, activityRoutes);
app.use('/payments', paymentLimiter, paymentRoutes);
```

---

### 🟠 ALTO #6: Falta de Validación de Entrada Centralizada

**Categoría**: OWASP A03:2021 - Injection | CWE-89: SQL Injection

**Severidad**: Alto

**Ubicación**: Múltiples controllers (chatController, communityController, socialRoutes, etc.)

**Descripción**
Aunque hay validación parcial, NO hay validación sistemática con express-validator. Campos de texto libre pueden contener XSS, SQLi (aunque Prisma las previene), etc.

**Vector de Ataque**
```javascript
// Un usuario puede enviar:
POST /chat/send
{
  "message": "<img src=x onerror='alert(\"xss\")'>"  // XSS payload
}

POST /user/update-profile
{
  "nombre": "<script>alert('xss')</script>"
}
```

**Impacto**
- XSS en respuestas de API (si frontend no sanitiza)
- Stored XSS si datos son mostrados sin escaping
- Datos malformados en BD

**✅ Solución**
Crear validadores centralizados:

```javascript
// src/validators/authValidators.js
const { body, validationResult } = require('express-validator');

const registerValidator = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .isLength({ min: 8 })
        .matches(/[A-Z]/)
        .withMessage('Contraseña debe tener 8+ chars y una mayúscula'),
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .escape()  // Sanitizar XSS
        .withMessage('Nombre inválido'),
    body('apellido')
        .trim()
        .isLength({ min: 2, max: 100 })
        .escape()
        .optional()
];

const loginValidator = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

module.exports = { registerValidator, loginValidator };

// src/validators/chatValidators.js
const { body, validationResult } = require('express-validator');

const sendChatValidator = [
    body('message')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .escape()
        .withMessage('Mensaje debe tener 1-2000 caracteres'),
    body('sessionId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Session ID inválido')
];

module.exports = { sendChatValidator };

// Middleware para ejecutar validadores
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Uso en routes:
// src/routes/authRoutes.js
router.post('/register', registerValidator, validateRequest, authController.register);
router.post('/login', loginValidator, validateRequest, authController.login);

// src/routes/chatRoutes.js
router.post('/send', authenticateToken, sendChatValidator, validateRequest, chatController.sendChat);
```

---

### 🟠 ALTO #7: Ausencia de Middleware Global de Error Handling

**Categoría**: OWASP A05:2021 - Broken Access Control | CWE-754: Improper Exception Handling

**Severidad**: Alto

**Ubicación**: `index.js` (falta middleware al final)

**Descripción**
No hay middleware de error global. Errores no capturados pueden:
- Exponer stack traces en producción
- Dejar conexiones abiertas
- Inconsistencia en formato de respuesta

**Vector de Ataque**
```javascript
throw new Error("SELECT * FROM users WHERE id = " + req.params.id);
// Stack trace expone query SQL completa
```

**✅ Solución**
```javascript
// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // Log error
    console.error('[ERROR]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        error: err.message,
        stack: isDev ? err.stack : undefined
    });

    // Respuesta al cliente
    const statusCode = err.status || 500;
    const response = {
        error: isDev ? err.message : 'Internal server error',
        ...(isDev && { stack: err.stack })
    };

    res.status(statusCode).json(response);
};

module.exports = errorHandler;

// En index.js, al final:
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);
```

---

### 🟠 ALTO #8: PayPal y Stripe Idempotency Incompleta

**Categoría**: OWASP A01:2021 - Broken Access Control | CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization

**Severidad**: Alto

**Ubicación**: `paymentController.js` línea 76 (Stripe) - PayPal no tiene

**Descripción**
Stripe usa una clave de idempotencia por minuto, pero PayPal no tiene protección contra double-charging si la request se reintenta.

```javascript
// Stripe: Parcial (línea 76)
const idempotencyKey = `${userId}-${plan}-${Math.floor(Date.now() / 60000)}`;
// Problema: Si usuario hace 2 pagos en el mismo minuto, no se detecta

// PayPal: NINGUNA protección
const processPayPal = async (req, res) => {
    // ...
    const user = await prisma.user.update({...});  // Sin protección
};
```

**✅ Solución**
```javascript
// Usar database-backed idempotency
const processPayment = async (req, res) => {
    const { amount, plan, paymentMethodId, idempotencyKey } = req.body;
    const userId = req.user.id;

    try {
        // 1. Generar idempotencyKey en el cliente si no existe
        if (!idempotencyKey) {
            return res.status(400).json({ error: 'idempotencyKey requerida' });
        }

        // 2. Buscar si ya existe una transacción con esta clave
        const existing = await prisma.paymentTransaction.findUnique({
            where: { idempotencyKey }
        });

        if (existing) {
            // Ya fue procesada
            if (existing.status === 'COMPLETED') {
                return res.json({
                    success: true,
                    message: 'Pago ya fue procesado',
                    transactionId: existing.id,
                    paymentIntentId: existing.stripePaymentIntentId
                });
            } else if (existing.status === 'FAILED') {
                return res.status(400).json({
                    error: 'Este pago falló previamente',
                    transactionId: existing.id
                });
            }
        }

        // 3. Crear record de transacción PENDIENTE
        const transaction = await prisma.paymentTransaction.create({
            data: {
                userId,
                provider: 'stripe',
                idempotencyKey,
                amount,
                plan,
                status: 'PENDING',
                ipAddress: req.ip
            }
        });

        // 4. Procesar pago
        const paymentIntent = await stripe.paymentIntents.create({...});

        // 5. Actualizar transaction con resultado
        if (paymentIntent.status === 'succeeded') {
            await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    stripePaymentIntentId: paymentIntent.id
                }
            });
            // ...
        }
    } catch (error) {
        // Marcar como FAILED
        await prisma.paymentTransaction.update({
            where: { idempotencyKey },
            data: { status: 'FAILED', errorMessage: error.message }
        });
        // ...
    }
};

// schema.prisma
model PaymentTransaction {
  id                    Int      @id @default(autoincrement())
  userId                Int
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider              String   // 'stripe', 'paypal'
  idempotencyKey        String   @unique  // Previene duplicación
  amount                Float
  currency              String   @default("EUR")
  plan                  String
  status                String   @default("PENDING")  // PENDING, COMPLETED, FAILED
  stripePaymentIntentId String?
  paypalOrderId         String?
  errorMessage          String?
  ipAddress             String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

---

### 🟠 ALTO #9: Morgan Logging No Configurado

**Categoría**: OWASP A09:2021 - Security Logging and Monitoring Failures | CWE-778: Insufficient Logging

**Severidad**: Alto

**Ubicación**: `index.js` línea 98-105 (custom logging, pero sin Morgan)

**Descripción**
Se usa logging manual en lugar de Morgan. Morgan proporciona formateo estándar, rotación de archivos, etc.

```javascript
// Actual (línea 98-105): logging manual
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    });
    next();
});
// Problemas:
// - No hay rotación de logs
// - No hay acceso a tamaño de request/response
// - Todos los logs a consola (no a archivo)
// - Status code no loguea
```

**✅ Solución**
```javascript
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Formato personalizado
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

const morganFormat = ':date[iso] :method :url :status :res[content-length] - :response-time ms [:user-id]';

// Stream para archivo de logs (en producción)
if (process.env.NODE_ENV === 'production') {
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }  // Append mode
    );

    app.use(morgan(morganFormat, { stream: accessLogStream }));
} else {
    // En desarrollo, loguear a consola
    app.use(morgan(morganFormat));
}

// Logging adicional para errores de seguridad
const securityLog = (message, details = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'SECURITY',
        message,
        ...details
    };

    if (process.env.NODE_ENV === 'production') {
        fs.appendFileSync(
            path.join(logsDir, 'security.log'),
            JSON.stringify(logEntry) + '\n'
        );
    } else {
        console.warn('[SECURITY]', logEntry);
    }
};

module.exports = { securityLog };
```

---

### 🟠 ALTO #10: Falta de HTTPS Enforcement

**Categoría**: OWASP A02:2021 - Cryptographic Failures | CWE-295: Improper Certificate Validation

**Severidad**: Alto

**Ubicación**: `index.js` (no hay redirección HTTP -> HTTPS)

**Descripción**
La aplicación no força HTTPS. En producción (Render), debería redirigir HTTP a HTTPS.

**✅ Solución**
```javascript
// En index.js, antes de app.listen
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

---

### 🟡 MEDIO #11: JWT Algorithm Confusion (Mitigado pero verificar)

**Categoría**: OWASP A02:2021 - Cryptographic Failures | CWE-347: Improper Verification of Cryptographic Signature

**Severidad**: Medio

**Ubicación**: `authMiddleware.js` y `authController.js` (líneas 35, 42, 50, 555)

**Descripción**
El código usa `jwt.verify()` sin especificar algoritmo permitido. Por defecto acepta HS256, pero un atacante podría cambiar el header del JWT a "none" (aunque jsonwebtoken lo rechaza).

**Verificación**
```javascript
// Línea 35 (authMiddleware.js)
jwt.verify(token, JWT_SECRET, (err, user) => {
    // Bien: solo usa HS256 con JWT_SECRET
    // Pero mejor sería especificar explícitamente
});
```

**✅ Mejora**
```javascript
jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256']  // Especificar explícitamente
}, (err, user) => {
    if (err) { /* ... */ }
});
```

---

### 🟡 MEDIO #12: Falta de CSRF Protection

**Categoría**: OWASP A01:2021 - Broken Access Control | CWE-352: Cross-Site Request Forgery (CSRF)

**Severidad**: Medio

**Ubicación**: Rutas POST/PUT/DELETE que no están protegidas por SameSite cookies

**Descripción**
Aunque está en Helmet, no hay token CSRF. Si el frontend es un sitio web (no Solo mobile), necesita protección CSRF.

**Nota**: Para Expo/React Native, esto es mínimo riesgo porque no usa cookies del navegador.

---

### 🟡 MEDIO #13: Información de Error Expuesta

**Categoría**: OWASP A04:2021 - Insecure Design | CWE-209: Information Exposure Through an Error Message

**Severidad**: Medio

**Ubicación**: Múltiples endpoints (ej: `paymentController.js` línea 453)

**Descripción**
Algunos errores exponen detalles internos:

```javascript
// authController.js línea 450
res.status(500).json({
    error: "Error en login social: " + (error.response?.data?.error?.message || error.message)
    // ^ Expone detalles de OAuth providers
});

// paymentController.js línea 453
res.status(500).json({
    error: "Error en login social: " + error.message
    // ^ Expone mensaje exacto del error
});
```

**✅ Solución**
```javascript
const isDev = process.env.NODE_ENV !== 'production';

res.status(500).json({
    error: isDev
        ? error.message
        : 'Internal server error'
});
```

---

### 🟢 BAJO #14: Audit Logging Incompleto

**Categoría**: OWASP A09:2021 - Security Logging and Monitoring Failures | CWE-778: Insufficient Logging

**Severidad**: Bajo

**Ubicación**: Múltiples controllers (authController, adminController, paymentController)

**Descripción**
Hay logs puntuales pero no sistemáticos. Faltan logs para:
- Cambios de email
- Cambios de contraseña
- Logout
- Cambios de plan
- Intentos fallidos de pago

---

## TABLA RESUMEN DE HALLAZGOS

| # | Vulnerabilidad | Severidad | CWE | OWASP | Ubicación |
|---|---|---|---|---|---|
| 1 | Vulnerabilidades en dependencias NPM | CRÍTICO | CWE-1104 | A06 | package.json |
| 2 | Credenciales en .env (VCS) | CRÍTICO | CWE-798 | A02 | .env |
| 3 | JWT_REFRESH_SECRET no implementado | CRÍTICO | CWE-347 | A02 | authController.js:49-555 |
| 4 | PayPal no verifica orderId | CRÍTICO | CWE-358 | A01 | paymentController.js:14-53 |
| 5 | Rate limiting global ausente | ALTO | CWE-770 | A04 | index.js |
| 6 | Validación de entrada incompleta | ALTO | CWE-89 | A03 | múltiples controllers |
| 7 | Error handling global ausente | ALTO | CWE-754 | A05 | index.js |
| 8 | Idempotency incompleta (PayPal) | ALTO | CWE-362 | A01 | paymentController.js |
| 9 | Morgan logging no configurado | ALTO | CWE-778 | A09 | index.js |
| 10 | HTTPS enforcement ausente | ALTO | CWE-295 | A02 | index.js |
| 11 | JWT algoritmo no especificado | MEDIO | CWE-347 | A02 | authMiddleware.js:35 |
| 12 | CSRF protection (web frontend) | MEDIO | CWE-352 | A01 | - |
| 13 | Error details expuestos | MEDIO | CWE-209 | A04 | múltiples |
| 14 | Audit logging incompleto | BAJO | CWE-778 | A09 | múltiples |

---

## PRIORIDAD DE REMEDIACIÓN

**URGENTE (Implementar en 24-48h):**
1. npm audit fix (vulnerabilidades en dependencias)
2. Rotar credenciales comprometidas en .env
3. Remover .env del historial Git
4. Implementar JWT_REFRESH_SECRET
5. Verificar PayPal orderId

**ALTA (Esta semana):**
6. Rate limiting global
7. express-validator en todas las rutas
8. Error handling middleware global
9. Morgan logging
10. Idempotency database-backed

**MEDIA (Próximas 2-3 semanas):**
11. HTTPS enforcement
12. Especificar algoritmo JWT
13. Sanitizar mensajes de error
14. Audit logging completo

---

## NEXT STEPS

1. **Ejecutar npm audit fix** inmediatamente
2. **Regenerar todos los secrets** (JWT, API keys, etc.)
3. **Remover .env del Git** usando git filter-repo
4. **Implementar cambios críticos de JWT y PayPal**
5. **Agregar validación con express-validator**
6. **Deploy a staging para testing**
7. **Deploy a producción después de QA**

---

**Fin de la Auditoría de Seguridad**
