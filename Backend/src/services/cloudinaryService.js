const cloudinary = require('../config/cloudinary');

/**
 * Sube una imagen a Cloudinary (soporta base64 o buffer)
 * @param {string} fileContent - La imagen en base64 o una URL temporal
 * @param {string} folder - Carpeta donde se guardará (ej: 'posts', 'profiles')
 * @returns {Promise<string>} - La URL de la imagen subida
 */
const uploadImage = async (fileContent, folder = 'general') => {
    try {
        if (!fileContent) return null;

        // Verificar configuración antes de subir
        const config = cloudinary.config();
        if (!config.api_key || !config.api_secret) {
            console.error('❌ Cloudinary no está configurado correctamente:', {
                hasKey: !!config.api_key,
                hasSecret: !!config.api_secret,
                cloudName: config.cloud_name
            });
            throw new Error('Error de configuración en el servicio de imágenes');
        }

        const result = await cloudinary.uploader.upload(fileContent, {
            folder: `nexus_athletics/${folder}`,
            resource_type: 'image',
        });

        return result.secure_url;
    } catch (error) {
        if (error.error) {
            console.error('Error detallado de Cloudinary:', error.error);
        } else {
            console.error('Error al subir imagen a Cloudinary:', error);
        }
        throw new Error('Error al procesar la imagen');
    }
};

module.exports = {
    uploadImage,
};
