# NEXUS IA FITNESS - SECURITY IMPLEMENTATION

## Resumen de Medidas Implementadas

Este documento detalla todas las medidas de seguridad que han sido implementadas en el backend de Nexus Athletics.

---

## 1. GESTIÓN DE SECRETOS

### Variables de Entorno Requeridas

Todas las siguientes variables DEBEN estar configuradas antes de arrancar el servidor:

```env
# CRÍTICAS (sin estas, la app no arranca)
JWT_SECRET=<64-chars-random>
JWT_REFRESH_SECRET=<64-chars-random>
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
PORT=3000

# OPCIONALES (features se desactivan sin estas)
GEMINI_API_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
PAYPAL_CLIENT_ID
PAYPAL_SECRET
RESEND_API_KEY
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
GOOGLE_CLIENT_ID
```

### Generación de Secretos Seguros

```bash
# Generar JWT_SECRET (64 caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar JWT_REFRESH_SECRET (64 caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configuración en Diferentes Entornos

**Desarrollo Local:**
1. Copiar `Backend/.env.example` a `Backend/.env`
2. Reemplazar valores con configuraciones de desarrollo
3. **NUNCA** commitear `Backend/.env` al Git

**Staging/Producción (Render.com):**
1. Navegar a Environment Variables en el dashboard
2. Agregar cada variable
3. El proceso nunca accede a archivos `.env`

---

## 2. AUTENTICACIÓN JWT

### Implementación

- **Access Tokens**: 15 minutos de duración (corta vida)
- **Refresh Tokens**: 7 días de duración (válido más tiempo)
- **Algoritmo**: HS256 con secreto de 64 caracteres
- **Validación**: Especificada explícitamente (previene algorithm confusion)

### Estructura del Token

**Access Token:**
```json
{
  "id": <user-id>,
  "email": "<user-email>",
  "role": "<USER|ADMIN>",
  "type": "access",
  "iat": <timestamp>,
  "exp": <timestamp + 15min>
}
```

**Refresh Token:**
```json
{
  "id": <user-id>,
  "type": "refresh",
  "iat": <timestamp>,
  "exp": <timestamp + 7days>
}
```

### Secretos Separados

```javascript
// authMiddleware.js y authController.js
JWT_SECRET = process.env.JWT_SECRET  // Para access tokens
JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  // Para refresh tokens
```

**Razón**: Si JWT_SECRET es comprometido, refresh tokens aún están protegidos.

### Protección contra Token Confusion

```javascript
// authMiddleware.js
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (user.type === 'refresh') {
        return res.status(403).json({ error: "Invalid token type" });
    }
    req.user = user;
});

// authController.js - refreshToken()
decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
if (decoded.type !== 'refresh') {
    return res.status(403).json({ error: "Invalid token type" });
}
```

---

## 3. HASHING DE CONTRASEÑAS

### Configuración

- **Algoritmo**: bcrypt
- **Cost Factor**: 12 (recomendado para 2026)
- **Ubicación**: `authController.js` línea 112

```javascript
const hashedPassword = await bcrypt.hash(password, 12);
```

### Verificación

```javascript
const validPassword = await bcrypt.compare(password, user.password);
```

---

## 4. PROTECCIÓN CSRF & CORS

### CORS

**Whitelist Explícito** (sin wildcard):
```javascript
const ALLOWED_ORIGINS = [
    'https://nexusathletics.com',
    'https://www.nexusathletics.com',
    'https://app.nexusathletics.com',
    process.env.FRONTEND_URL,
    'http://localhost:3000',    // Dev only
    'http://localhost:8081',    // Expo dev only
];
```

**Credenciales**: `credentials: true` (permite cookies)

### Security Headers (Helmet + Custom)

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// Custom headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
```

---

## 5. RATE LIMITING

### Global Rate Limiter

- **Límite**: 100 requests por 15 minutos
- **Por IP**: Mediante `req.ip`
- **Excepciones**: `/health`, `/`

```javascript
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: (req) => req.path === '/health'
});

app.use(globalLimiter);
```

### Limiters Específicos por Endpoint

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/auth/login` | 5 intentos | 15 minutos |
| `/auth/register` | 3 registros | 1 hora |
| `/auth/verify` | 10 intentos | 15 minutos |
| `/chat/send` | 30 mensajes | 1 minuto |
| `/activities/*` | 20 actividades | 1 minuto |
| `/payments/*` | 10 intentos | 1 hora |
| `/community/*` | 5 posts | 1 minuto |

---

## 6. VALIDACIÓN DE ENTRADA

### express-validator Centralizado

```javascript
// src/validators/authValidators.js
const registerValidator = [
    body('email').isEmail().normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .matches(/[A-Z]/)
        .matches(/[0-9]/),
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .escape()  // XSS prevention
];

// En rutas:
router.post('/register', registerValidator, validateRequest, authController.register);
```

### Reglas de Validación

- **Email**: Formato válido + normalizacion
- **Contraseña**: 8+ chars, 1+ mayúscula, 1+ número
- **Nombres**: 2-100 chars, escapado contra XSS
- **Números**: Range validation (ej: peso 20-300kg)
- **Enums**: Solo valores permitidos (ej: tipos de actividad)

---

## 7. LOGGING Y MONITOREO

### Morgan Logger

En **Producción**:
```javascript
app.use(morgan(':date[iso] :method :url :status :response-time ms'));
```

En **Desarrollo**:
```javascript
app.use(morgan('dev'));
```

**Formato**:
```
2026-04-18T12:34:56.789Z POST /auth/login 200 45ms
```

### Security Logging

```javascript
// Intentos fallidos de token
console.warn(`[SECURITY] Invalid token attempt from IP: ${req.ip}`);

// Rate limit exceeded
console.warn(`[SECURITY] Login rate limit exceeded from IP: ${req.ip}`);

// Admin actions
console.log(`[ADMIN ACTION] User ${req.user.id} changed user ${userId} plan`);

// Errores de pago
console.log(`[PAYMENT SUCCESS] User ${userId}, Plan ${plan}, Amount €${amount}`);
```

### Audit Logging (AuthLog)

Registra automáticamente:
- Login, logout
- Token refresh
- 2FA verification
- Account linking
- Health sync enabled

---

## 8. MANEJO DE ERRORES GLOBAL

### Middleware de Error

```javascript
// src/middlewares/errorHandler.js
app.use((err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // Nunca expone stack traces en producción
    const message = isDev ? err.message : 'Internal server error';

    res.status(err.status || 500).json({
        error: message,
        code: err.code
    });
});
```

**Ubicado**: Al FINAL de index.js (después de todas las rutas)

---

## 9. PROTECCIÓN DE PAGOS

### Stripe

**Idempotency Key**:
```javascript
const idempotencyKey = `${userId}-${plan}-${Math.floor(Date.now() / 60000)}`;
// Previene double-charging en mismo minuto
```

**Validaciones**:
- Plan válido (Gratis, Pro, Ultimate)
- Monto en rango permitido (0.01 - 10000)
- `isFinite()` check (previene NaN, Infinity)

### PayPal

**CRÍTICO**: Verificar orderId con PayPal ANTES de actualizar plan

```javascript
// TODO: Implementar
const verification = await verifyPayPalOrder(orderId);
if (!verification.valid) {
    return res.status(400).json({ error: "Order not verified" });
}

// Validar monto
if (parseFloat(verification.amount) !== expectedAmount) {
    return res.status(400).json({ error: "Amount mismatch" });
}

// Recién entonces actualizar plan
const user = await prisma.user.update(...);
```

---

## 10. PROTECCIÓN OAUTH

### Google OAuth

**ID Token Verification**:
```javascript
const ticket = await googleClient.verifyIdToken({
    idToken: idToken,
    audience: GOOGLE_CLIENT_ID
});

// Validar claims
if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error("Audience mismatch");
if (payload.iss !== 'https://accounts.google.com') throw new Error("Invalid issuer");
if (!payload.email_verified) throw new Error("Email not verified");
```

**Token Revocation** (en logout):
```javascript
await oauthService.revokeOAuthToken(provider, oauthToken);
```

### Account Linking

- Previene múltiples usuarios vinculados al mismo OAuth ID
- Logging de todas las operaciones
- Verificación de propriedad de cuenta antes de linkear

---

## 11. DEPENDENCIAS SEGURAS

### Auditoría

```bash
# Check for vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix

# Force fix (breaking changes)
npm audit fix --force
```

### Última Auditoría: 18 de Abril de 2026

**Vulnerabilidades Críticas Resueltas**:
- fast-xml-parser (entity expansion DoS)
- axios (SSRF, DoS)
- multer (upload DoS)
- lodash (prototype pollution)
- node-forge (signature forgery)

**Vulnerabilidades Pendientes** (8 low):
- Principalmente en transitive dependencies de firebase-admin
- Aceptables para este nivel de riesgo

---

## 12. VALIDACIÓN DE VARIABLES DE ENTORNO

**Función**: `src/config/validateEnv.js`

**Se ejecuta**:
```javascript
// Al inicio de index.js
const validateEnv = require('./src/config/validateEnv');
validateEnv();  // Falla si faltan variables críticas
```

**Validaciones**:
- ✅ Variables requeridas existen
- ✅ JWT_SECRET >= 64 caracteres
- ✅ DATABASE_URL es PostgreSQL
- ✅ En prodcción: no hay URLs de localhost
- ✅ En producción: Stripe usa sk_live_

---

## CHECKLIST DE SEGURIDAD PRE-DEPLOY

Antes de cada deploy a producción:

- [ ] `npm audit` no tiene vulnerabilidades críticas
- [ ] `.env` NO está en Git (verificar .gitignore)
- [ ] JWT_SECRET y JWT_REFRESH_SECRET son únicos y >= 64 chars
- [ ] STRIPE_SECRET_KEY usa `sk_live_` (no `sk_test_`)
- [ ] FRONTEND_URL es el dominio correcto
- [ ] NODE_ENV=production está configurado
- [ ] Todos los secrets están en Render Environment Variables
- [ ] HTTPS está forzado (x-forwarded-proto check)
- [ ] Rate limiting está activo
- [ ] Logging está configurado

---

## DEBUGGING EN DESARROLLO

### Enable Detailed Logs

```bash
NODE_ENV=development npm run dev
```

### Generar JWTs para Testing

```bash
node -e "
const jwt = require('jsonwebtoken');
const secret = 'test-secret-min-64-chars-long-for-testing-purposes';
const token = jwt.sign({ id: 1, email: 'test@example.com', type: 'access' }, secret, { expiresIn: '15m' });
console.log(token);
"
```

### Inspeccionar JWT

```bash
# Copiar token y usar https://jwt.io
# O en Node:
const jwt = require('jsonwebtoken');
jwt.decode(token, { complete: true });
```

---

## CONTACTO & ESCALATION

Para reportar vulnerabilidades de seguridad:

1. **NO** abrir issues públicos
2. Enviar email privado a: [security-email]
3. Incluir: descripción, reproducción, impacto estimado
4. Esperar respuesta en 48 horas

---

**Documento actualizado**: 18 de Abril de 2026
**Próxima revisión**: 18 de Octubre de 2026 (cada 6 meses)
