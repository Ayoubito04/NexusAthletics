const OpenAI = require('openai');
const fs = require('fs');

let openai = null;

if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'tu_openai_api_key_aqui') {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

/**
 * Transcribe un archivo de audio usando OpenAI Whisper
 * @param {string} filePath - Ruta al archivo de audio
 * @returns {Promise<string>} - Texto transcrito
 */
const transcribeAudio = async (filePath) => {
    if (!openai) {
        throw new Error('OpenAI no está configurado. Revisa la OPENAI_API_KEY.');
    }

    try {
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
            language: 'es',
            response_format: 'text'
        });
        return response;
    } catch (error) {
        console.error('Error en OpenAIService (Whisper):', error.message);
        throw error;
    }
};

module.exports = {
    transcribeAudio,
};
