# 🌐 GUÍA DE DESPLIEGUE - NEXUS ATHLETICS

Para llevar tu aplicación a producción y que sea accesible desde cualquier parte del mundo (no solo en tu red local), seguiremos el estándar de la industria: **Supabase** para la base de datos y **Render** para el servidor Node.js.

---

## 🏗️ Paso 1: Base de Datos (Supabase)

Supabase nos proporcionará una base de datos PostgreSQL en la nube de forma gratuita y muy potente.

1.  Ve a [supabase.com](https://supabase.com/) y crea una cuenta.
2.  Crea un **Nuevo Proyecto** chamado `NexusAthleticsDB`.
3.  Establece una contraseña segura para la base de datos (¡GUÁRDALA!).
4.  Una vez creado, ve a **Project Settings -> Database**.
5.  Busca la sección **Connection String** y selecciona la pestaña **URI**.
6.  Copia esa URL. Tendrá un formato parecido a este:
    `postgresql://postgres:[TU_CONTRASEÑA]@db.xxxxxx.supabase.co:5432/postgres`

---

## 💻 Paso 2: Servidor de Aplicaciones (Render)

Render alojará tu código Node.js y lo ejecutará 24/7.

1.  Sube tu código a un repositorio de **GitHub** (asegúrate de que el backend esté en la raíz o en una carpeta clara).
2.  Crea una cuenta en [render.com](https://render.com/).
3.  Haz clic en **New +** y selecciona **Web Service**.
4.  Conecta tu repositorio de GitHub.
5.  **Configuración del Servicio:**
    *   **Name:** `nexus-athletics-api`
    *   **Runtime:** `Node`
    *   **Build Command:** `cd Backend && npm install && npx prisma generate` (Ajusta la ruta si es necesario)
    *   **Start Command:** `cd Backend && npm start`
6.  **Variables de Entorno (Environment Variables):**
    Pulsa en "Add Environment Variable" y añade TODAS las de tu archivo `.env`:
    *   `DATABASE_URL`: (La que copiaste de Supabase en el Paso 1)
    *   `JWT_SECRET`: (Uno largo y aleatorio)
    *   `GEMINI_API_KEY`: (Tu clave de Google AI)
    *   `CLOUDINARY_CLOUD_NAME`: ...
    *   `PORT`: `10000` (Render usa este por defecto)

7.  Pulsa en **Deploy Web Service**. Render te dará una URL como: `https://nexus-athletics-api.onrender.com`.

---

## 📱 Paso 3: Vincular la App (Frontend)

Ahora debemos decirle a la aplicación móvil que ya no mire a tu ordenador local (192.168.x.x), sino a la nueva URL de Render.

1.  Abre el archivo `constants/Config.js` en tu proyecto de React Native.
2.  Actualiza la constante `BACKEND_URL`:

```javascript
// constants/Config.js
export default {
    BACKEND_URL: 'https://nexus-athletics-api.onrender.com', // 🚀 Tu nueva URL de Render
    // ... resto de configs
}
```

---

## 🛠️ Paso 4: Preparar la Base de Datos (Prisma)

Como la base de datos en Supabase está vacía, debemos crear las tablas.

Desde tu terminal local (conectado a internet y con el `.env` apuntando a Supabase temporalmente):
```bash
cd Backend
npx prisma db push
```
Esto creará todas las tablas (Usuarios, Actividades, Rutinas, etc.) en la nube automáticamente.

---

## 🏁 ¡Listo!

Tu app ahora es global. 
*   Cualquier persona que se descargue el APK podrá registrarse y sus datos se guardarán en Supabase.
*   La IA responderá desde los servidores de Render.
*   Los pagos y las analíticas funcionarán de forma real.

---
**Nota sobre Firebase:** Firebase es excelente para notificaciones push (que ya tenemos configurado), pero para un servidor complejo de Node.js con Prisma, la combinación Render+Supabase es mucho más flexible y profesional.
