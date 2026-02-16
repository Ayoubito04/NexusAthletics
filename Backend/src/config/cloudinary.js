const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
        api_key: process.env.CLOUDINARY_API_KEY.trim(),
        api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    });

    // Verificar conexión al arrancar
    cloudinary.api.ping()
        .then(() => console.log('✅ Cloudinary: Conexión establecida con éxito'))
        .catch(err => {
            console.error('❌ Cloudinary: Error de conexión inicial:', err.message || err);
            if (err.http_code === 401) {
                console.error('   -> Revisa las credenciales en el archivo .env');
            }
        });
} else {
    console.warn('⚠️ Cloudinary: Configuración incompleta. El servicio de imágenes no estará disponible.');
}

module.exports = cloudinary;

module.exports = cloudinary;

