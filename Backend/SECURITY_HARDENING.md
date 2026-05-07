# Security Hardening - Backend (NexusIAFitness)

## Fecha de Aplicación
April 18, 2026

## Resumen Ejecutivo

Se ha aplicado un hardening completo de seguridad al backend de NexusIAFitness, implementando medidas de defensa en profundidad contra los riesgos más comunes:

- ✅ **Validación de Entorno**: Fail-fast si faltan variables críticas
- ✅ **HTTP Headers Security**: Helmet con CSP, HSTS, X-Frame-Options
- ✅ **CORS Protection**: Whitelist de origins configurables
- ✅ **Rate Limiting**: Global, Auth, Payment (3 niveles)
- ✅ **Request Logging**: Morgan para auditoría
- ✅ **Error Handling**: Middleware centralizado sin stack traces en producción
- ✅ **JWT Security**: Algoritmo HS256 explícito, validación de payload
- ✅ **Information Disclosure**: Header x-powered-by deshabilitado

---

## 1. Validación de Entorno (src/config/validateEnv.js)

### Cambios:
- **Existía**: `validateEnv.js` ya implementado con validaciones robustas
- **Estado**: ✅ MANTENIDO COMO ESTÁ

### Variables Críticas Validadas:
```
- DATABASE_URL (PostgreSQL requerido)
- DIRECT_URL (conexión directa requerida)
- JWT_SECRET (mínimo 64 caracteres)
- JWT_REFRESH_SECRET (mínimo 64 caracteres)
- PORT
```

### Advertencias Configuradas:
- Stripe usando clave de test en producción
- Servicios opcionales deshabilitados (Gemini, OpenAI, etc.)
- DATABASE_URL usando localhost en producción

---

## 2. Seguridad HTTP (src/middlewares/security.js) - NUEVO

### Helmet Configuration:
```javascript
- Content-Security-Policy: Bloquea recursos inline/externo
- HSTS: 1 año con preload
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (clickjacking)
- Referrer-Policy: strict-origin-when-cross-origin
- X-Powered-By: Deshabilitado (información disclosure)
```

### CORS Configuration:
```javascript
- Origins Permitidos:
  - http://localhost:3000
  - http://localhost:19006 (Expo)
  - http://127.0.0.1:3000
  - http://127.0.0.1:19006

- Credenciales: Habilitadas (para cookies/auth)
- Métodos: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With
- Max-Age: 86400s (24 horas - preflight cache)
```

---

## 3. Rate Limiting (src/middlewares/security.js)

### Global Limiter (100 req/15 min):
```javascript
- Aplica a todas las rutas excepto /health y /
- Por IP (soporte automático de IPv6)
- Skip automático en modo test
- Retorna RateLimit-* headers estándar
```

### Auth Limiter (5 req/15 min):
```javascript
- Rutas: POST /auth/register, POST /auth/login
- Por IP (protección contra brute force)
- Skip en modo test
- Logging de intentos fallidos
```

### Payment Limiter (10 req/hora):
```javascript
- Rutas: POST /payments/stripe, /paypal, /create-intent
- Por User ID si está autenticado, sino por IP
- Skip en modo test
- Logging de intentos sospechosos
```

---

## 4. Error Handling (src/middlewares/errorHandler.js)

### Cambios:
- **Existía**: `errorHandler.js` ya implementado
- **Estado**: ✅ MEJORADO - Ahora registrado al final de index.js

### Características:
```javascript
- No expone stack traces en producción
- Logging estructurado con JSON
- Formato consistente de error en respuesta
- 404 handler centralizado
```

---

## 5. Request Logging (index.js + Morgan)

### Morgan Integration:
```javascript
- Desarrollo: Formato 'dev' (corto y legible)
- Producción: Formato 'combined' (completo con User-Agent, Referrer)
- Skip: /health y / (rutas de chequeo)
```

### Log Entry Format (Production):
```
[timestamp] method path statusCode (duration ms)
Ej: [2026-04-18T14:00:00Z] POST /auth/login - 200 (125ms)
```

---

## 6. Mejoras en JWT/Auth (src/middlewares/authMiddleware.js)

### Cambios Implementados:

1. **Algoritmo Explícito**:
```javascript
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, callback)
```

2. **Validación de Payload**:
```javascript
if (!user.id || !user.email) {
  // Rechaza tokens sin campos requeridos
}
```

3. **Fallback Eliminado**:
```javascript
// ANTES: JWT_SECRET fallback a 'secreto_por_defecto'
// DESPUÉS: Falla inmediatamente si JWT_SECRET no está configurado
```

4. **Logging de Seguridad**:
```javascript
- JWT verification failures (nombre del error)
- Unauthorized admin access attempts (con user ID)
```

---

## 7. Archivos Modificados

### A. `/index.js` - Entrypoint
```diff
+ require('./src/config/validateEnv')() // Línea 1
+ const morgan = require('morgan')
+ const { helmetConfig, corsOptions, globalLimiter, ... } = require('./src/middlewares/security')
+ const errorHandler = require('./src/middlewares/errorHandler')

+ app.disable('x-powered-by')
+ app.set('trust proxy', 1)
+ app.use(helmetConfig)
+ app.use(corsOptions)
+ app.use(morgan(...))
+ app.use(globalLimiter)

- Eliminado: Custom logging middleware (reemplazado por Morgan)

+ app.use(errorHandler) // Último middleware
```

### B. `/src/middlewares/security.js` - NUEVO
- Centraliza Helmet, CORS, Rate Limiting
- Configuración separada por contexto (global, auth, payment)

### C. `/src/middlewares/authMiddleware.js` - MEJORADO
- Validación de algoritmo JWT
- Validación de payload (id, email)
- Logging de intentos de acceso denegado
- Eliminado fallback a secreto débil

### D. `/src/routes/authRoutes.js` - MEJORADO
- Agregado `authLimiter` a `/register` y `/login`

### E. `/src/routes/paymentRoutes.js` - MEJORADO
- Agregado `paymentLimiter` a todas las rutas de pago

### F. `/.env.example` - ACTUALIZADO
- Agregado `ALLOWED_ORIGINS` (CORS whitelist)
- Documentación mejorada de variables críticas

---

## 8. Instalación de Dependencias

```bash
npm install --save helmet morgan express-validator express-rate-limit
```

**Paquetes Nuevos**:
- `helmet@8.1.0` - HTTP headers security
- `morgan@1.10.1` - Request logging
- `express-rate-limit@7.x` - Rate limiting
- `express-validator@7.3.2` - Input validation (ya existía)

---

## 9. Configuración en Producción

### Variables de Entorno Requeridas:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<64+ caracteres aleatorios>
JWT_REFRESH_SECRET=<64+ caracteres aleatorios>
ALLOWED_ORIGINS=https://app.nexusathletics.com,https://web.nexusathletics.com
```

### Generar Secretos Seguros:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verificar Configuración:
```bash
node index.js 2>&1 | grep "✅\|❌\|⚠️"
```

---

## 10. Testing de Seguridad

### Cargar Módulos:
```bash
node -e "
process.env.JWT_SECRET = 'test-secret-64-chars-long...';
const security = require('./src/middlewares/security');
const auth = require('./src/middlewares/authMiddleware');
console.log('Modules loaded successfully');
"
```

### Verificar Helmet Headers:
```bash
curl -i http://localhost:3000/
# Verificar headers:
# - Strict-Transport-Security
# - Content-Security-Policy
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
```

### Verificar Rate Limiting:
```bash
# 6 requests rápidos a /auth/login deben fallar el 6to
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}'
  echo ""
done
# Expected: último retorna 429 Too Many Requests
```

---

## 11. Checklist de Implementación

- [x] Helmet configurado con CSP, HSTS, etc.
- [x] CORS whitelist configurable
- [x] Rate limiting global (100/15min)
- [x] Rate limiting auth (5/15min)
- [x] Rate limiting payment (10/hora)
- [x] Morgan logging integrado
- [x] Error handler centralizado
- [x] JWT algoritmo explícito (HS256)
- [x] JWT payload validado
- [x] x-powered-by deshabilitado
- [x] 404 handler centralizado
- [x] authMiddleware mejorado
- [x] authRoutes con rate limiter
- [x] paymentRoutes con rate limiter
- [x] .env.example actualizado
- [x] Módulos verifican carga correctamente

---

## 12. Logs Esperados al Arrancar

```
✅ Modo PRODUCCIÓN/DESARROLLO activado
✅ Variables de entorno validadas correctamente
✅ Tablas OAuthToken y AuthLog verificadas
✅ authRoutes cargado
...
[morgan] GET /health 200
🚀 Servidor MODULAR corriendo en http://localhost:3000
```

---

## 13. Vulnerabilidades Residuales Conocidas

Estas medidas NO cubren:

1. **SQL Injection**: Validación de input en controllers necesaria
2. **Broken Authentication**: Implementar 2FA, token refresh rotation
3. **Sensitive Data Exposure**: Cifrado de campos en DB (bcrypt para passwords)
4. **XXE/Deserialization**: Usar parsers seguros (JSON, no eval)
5. **Broken Access Control**: Middleware `isAdmin` debe usarse en admin routes

---

## 14. Próximos Pasos Recomendados

1. **Input Validation**: Aplicar `express-validator` en todos los controllers
2. **Password Hashing**: Verificar que bcrypt se usa con cost >= 10
3. **Admin Routes**: Proteger `/admin/*` con `isAdmin` middleware
4. **Secrets Rotation**: Implementar JWT_SECRET rotation cada 6 meses
5. **HTTPS**: Forzar HTTPS en producción con Helmet HSTS
6. **Database Credentials**: No hardcodear, usar env vars
7. **API Versioning**: Implementar `/api/v1/` para evolución segura
8. **Audit Logging**: Registrar cambios administrativos en BD

---

## 15. Referencias

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Helmet.js Docs](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CORS Spec](https://fetch.spec.whatwg.org/#http-cors-protocol)

---

**Documento Generado**: 2026-04-18
**Versión**: 1.0
**Status**: ✅ IMPLEMENTADO
