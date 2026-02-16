# Configuración de OAuth

## Google OAuth
Para configurar Google OAuth, necesitas:
1. Ir a https://console.cloud.google.com/
2. Crear un nuevo proyecto o seleccionar uno existente
3. Habilitar Google+ API
4. Crear credenciales OAuth 2.0
5. Obtener los Client IDs para Android, iOS y Web
6. Agregar las variables al archivo .env:
   - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
   - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
   - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

## Facebook OAuth
Para configurar Facebook OAuth, necesitas:
1. Ir a https://developers.facebook.com/
2. Crear una nueva aplicación
3. Agregar el producto "Facebook Login"
4. Obtener el App ID
5. Agregar la variable al archivo .env:
   - EXPO_PUBLIC_FACEBOOK_APP_ID

## Instagram OAuth
Instagram utiliza el sistema de autenticación de Facebook.
Usa las mismas credenciales de Facebook Graph API.

## Notas importantes:
- Las credenciales OAuth NO deben compartirse públicamente
- Asegúrate de configurar los URLs de redirección correctamente
- Para desarrollo local, usa las URLs de callback apropiadas
- En producción, actualiza las URLs con tu dominio real
