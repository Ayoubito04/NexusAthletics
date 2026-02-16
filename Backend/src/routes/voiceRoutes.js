const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Importar el controlador
let voiceController;
try {
    voiceController = require('../controllers/voiceController');
    console.log('✅ Voice Controller cargado correctamente');
} catch (error) {
    console.error('❌ Error cargando Voice Controller:', error.message);
}

// Configurar multer para guardar archivos de audio temporalmente
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/voice/'); // Carpeta temporal para audio
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Máximo 10MB
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo archivos de audio
        const allowedMimes = [
            'audio/mpeg',
            'audio/mp4',
            'audio/m4a',
            'audio/wav',
            'audio/x-m4a',
            'audio/mp3'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se aceptan archivos de audio.'));
        }
    }
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio y genera respuesta de IA
 * Requiere autenticación
 */
if (voiceController && voiceController.transcribeAndRespond) {
    router.post(
        '/transcribe',
        authenticateToken,
        upload.single('audio'),
        voiceController.transcribeAndRespond
    );
    console.log('✅ Ruta /voice/transcribe registrada correctamente');
} else {
    console.warn('⚠️  Ruta /voice/transcribe NO registrada - controlador no disponible');

    // Crear una ruta placeholder que devuelve error
    router.post('/transcribe', authenticateToken, (req, res) => {
        res.status(503).json({
            error: 'Servicio de voz no disponible',
            message: 'El controlador de voz no se cargó correctamente. Revisa los logs del servidor.'
        });
    });
}

module.exports = router;
