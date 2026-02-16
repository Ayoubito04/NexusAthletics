# 🚀 Guía de Migración a PRODUCCIÓN - Nexus Athletics

## ⚠️ IMPORTANTE: Pasos para Producción

Esta guía te ayudará a migrar de APIs de prueba a APIs de producción.

---

## 💳 **1. STRIPE - Migración a Producción**

### Estado Actual:
- ✅ Implementado con TestAPI: `sk_test_...`
- 📍 Archivo: `Backend/src/controllers/paymentController.js`

### Pasos para Producción:

#### 1.1. Obtener API Keys de Producción
1. Ve a https://dashboard.stripe.com/
2. Cambia de **Test mode** a **Live mode** (toggle arriba a la derecha)
3. Ve a **Developers > API keys**
4. Copia la **Secret key** (empieza con `sk_live_...`)
5. Copia la **Publishable key** (empieza con `pk_live_...`)

#### 1.2. Actualizar `.env` Backend
```bash
# Reemplaza esta línea:
STRIPE_SECRET_KEY=TU_STRIPE_SECRET_KEY_AQUI

# Por tu nueva clave LIVE:
STRIPE_SECRET_KEY=sk_live_TU_CLAVE_AQUI
```

#### 1.3. Actualizar Frontend (App.js)
```javascript
// Buscar en tu App.js donde está:
<StripeProvider publishableKey="pk_test_...">

// Cambiar a:
<StripeProvider publishableKey="pk_live_TU_CLAVE_AQUI">
```

#### 1.4. Verificar Webhooks (Opcional pero RECOMENDADO)
1. En Stripe Dashboard > **Developers > Webhooks**
2. Añade tu URL de producción: `https://tu-dominio.com/webhook/stripe`
3. Selecciona eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copia el **Webhook Secret** (empieza con `whsec_...`)
5. Añádelo al `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 💰 **2. PAYPAL - Migración a Producción**

### Estado Actual:
- ✅ Implementado con Sandbox API
- 📍 Variables en `.env`

### Pasos para Producción:

#### 2.1. Obtener Credenciales de Producción
1. Ve a https://developer.paypal.com/
2. Cambia de **Sandbox** a **Live** (arriba a la derecha)
3. Ve a **My Apps & Credentials**
4. Crea una nueva app o usa una existente
5. Copia:
   - **Client ID** (live)
   - **Secret** (live)

#### 2.2. Actualizar `.env` Backend
```bash
# Reemplaza estas líneas:
PAYPAL_CLIENT_ID=TU_PAYPAL_CLIENT_ID_AQUI
PAYPAL_SECRET=TU_PAYPAL_SECRET_AQUI

# Por tus nuevas claves LIVE:
PAYPAL_CLIENT_ID=TU_CLIENT_ID_LIVE
PAYPAL_SECRET=TU_SECRET_LIVE
```

#### 2.3. Cambiar URL del API en el código
Busca en tu código PayPal y cambia:
```javascript
// De:
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

// A:
const PAYPAL_API = 'https://api-m.paypal.com';
```

---

## 🔐 **3. GOOGLE OAUTH - Configuración Completa**

### Estado Actual:
- ⚠️ Configurado parcialmente
- 📍 Variables en `.env` para Android y Web

### Pasos para Completar OAuth:

#### 3.1. Configurar Google Cloud Console
1. Ve a https://console.cloud.google.com/
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services > Credentials**

#### 3.2. Crear OAuth 2.0 Client IDs
Necesitas crear 3 tipos de credenciales:

##### A) Para Android:
1. Click **Create Credentials > OAuth client ID**
2. Tipo: **Android**
3. Package name: `com.tuapp.nexusathletics` (debe coincidir con tu app.json)
4. SHA-1: Obtener ejecutando en terminal:
   ```bash
   cd android && ./gradlew signingReport
   ```
5. Copia el **Client ID** generado

##### B) Para iOS:
1. Tipo: **iOS**
2. Bundle ID: `com.tuapp.nexusathletics` (debe coincidir con tu app.json)
3. Copia el **Client ID** generado

##### C) Para Web (Backend Callback):
1. Tipo: **Web application**
2. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (desarrollo)
   - `https://tu-dominio.com/auth/google/callback` (producción)
3. Copia **Client ID** y **Client Secret**

#### 3.3. Actualizar `.env` Backend
```bash
# Actualiza:
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=TU_ANDROID_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=TU_WEB_CLIENT_ID
GOOGLE_IOS_CLIENT_ID=TU_IOS_CLIENT_ID
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
```

#### 3.4. Crear Endpoint de OAuth en Backend
**Archivo**: `Backend/src/routes/authRoutes.js`

Añade endpoint para callback de Google:
```javascript
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        // Intercambiar código por token
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`,
            grant_type: 'authorization_code'
        });

        // Obtener info del usuario
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });

        // Buscar o crear usuario
        let user = await prisma.user.findUnique({
            where: { email: userInfo.data.email }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: userInfo.data.email,
                    nombre: userInfo.data.name,
                    password: 'oauth_google', // No se usa
                    plan: 'Gratis'
                }
            });
        }

        // Generar JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: 'Error en autenticación de Google' });
    }
});
```

#### 3.5. Implementar en Frontend
**Archivo**: `screen/Login.js` o donde tengas el login

```javascript
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

function Login() {
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            handleGoogleLogin(authentication.accessToken);
        }
    }, [response]);

    const handleGoogleLogin = async (accessToken) => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken })
            });
            
            const data = await response.json();
            if (data.token) {
                await AsyncStorage.setItem('token', data.token);
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                navigation.navigate('Home');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo iniciar sesión con Google');
        }
    };

    return (
        <TouchableOpacity 
            onPress={() => promptAsync()}
            disabled={!request}
        >
            <Text>Continuar con Google</Text>
        </TouchableOpacity>
    );
}
```

---

## 📋 **CHECKLIST DE PRODUCCIÓN**

### Antes de Lanzar:

#### Backend:
- [ ] Cambiar `STRIPE_SECRET_KEY` a clave `sk_live_...`
- [ ] Cambiar `PAYPAL_CLIENT_ID` y `PAYPAL_SECRET` a credenciales live
- [ ] Configurar Google OAuth completo (Client IDs para Android, iOS, Web)
- [ ] Cambiar `DATABASE_URL` a base de datos de producción
- [ ] Verificar `JWT_SECRET` sea seguro (mínimo 32 caracteres aleatorios)
- [ ] Configurar webhooks de Stripe
- [ ] Añadir CORS para tu dominio de producción

#### Frontend:
- [ ] Cambiar `publishableKey` de Stripe a `pk_live_...`
- [ ] Actualizar `BACKEND_URL` al dominio de producción
- [ ] Verificar que las credenciales de Google OAuth estén correctas
- [ ] Cambiar URL de PayPal de sandbox a producción
- [ ] Configurar `app.json` con el Bundle ID y Package Name correctos
- [ ] Generar certificados de firma (Android: keystore, iOS: provisioning profile)

#### Testing Obligatorio:
- [ ] Probar pago real con Stripe (usar tarjeta real del desarrollador)
- [ ] Probar PayPal con cuenta real
- [ ] Probar login con Google
- [ ] Verificar que los webhooks funcionen
- [ ] Comprobar que las suscripciones actualicen el plan del usuario

---

## 🔒 **SEGURIDAD - MUY IMPORTANTE**

### Variables de Entorno:
```bash
# NUNCA subas el archivo .env a GitHub
# Añade esto a .gitignore:
.env
.env.local
.env.production
```

### Generar JWT_SECRET Seguro:
```bash
# En terminal, ejecuta:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Usa el resultado en tu .env:
JWT_SECRET=el_resultado_super_largo_y_aleatorio
```

---

## 🌐 **DESPLIEGUE**

### Backend (Recomendado: Railway, Render, o Heroku):
1. Crear cuenta en https://railway.app/
2. Conectar repositorio de GitHub
3. Configurar variables de entorno (todas las del .env)
4. Deploy automático

### Base de Datos:
- Usar PostgreSQL de Railway o Neon (https://neon.tech/)
- Actualizar `DATABASE_URL` en .env de producción

### Frontend (Expo):
```bash
# Build para producción
eas build --platform android
eas build --platform ios

# Submit a las tiendas
eas submit --platform android
eas submit --platform ios
```

---

## 📞 **SOPORTE POST-PRODUCCIÓN**

### Monitoreo:
- Stripe Dashboard: Monitorea pagos en tiempo real
- PayPal Dashboard: Verifica transacciones
- Google Cloud Console: Revisa uso de OAuth
- Sentry (opcional): Para tracking de errores

### Logs:
- Implementar winston o morgan para logging en producción
- Guardar logs de errores de pago
- Monitorear intentos fallidos de login

---

## ✅ **RESUMEN**

Para pasar a producción necesitas:

1. **Stripe**: Reemplazar `sk_test_` por `sk_live_` y `pk_test_` por `pk_live_`
2. **PayPal**: Cambiar credenciales de sandbox a live + URL del API
3. **Google OAuth**: Configurar completamente con Client IDs para cada plataforma
4. **Database**: Migrar a PostgreSQL de producción
5. **Testing**: Probar TODOS los flujos de pago con dinero real (pequeñas cantidades)
6. **Deploy**: Subir backend a Railway/Render y frontend a Expo

---

**¿Necesitas ayuda con algún paso específico?** 🚀
