const { prisma } = require('../config/prisma');
const axios = require('axios');

const analyzeForm = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user.plan !== 'Ultimate') {
            return res.status(403).json({ error: 'Exclusivo Plan Ultimate.' });
        }

        const { mediaBase64, mimeType, exerciseName } = req.body;
        if (!mediaBase64 || !mimeType) {
            return res.status(400).json({ error: 'Se requiere mediaBase64 y mimeType.' });
        }

        const isVideo = mimeType.startsWith('video/');
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        const prompt = `Eres un entrenador personal experto con 20 años de experiencia en biomecánica y prevención de lesiones.
Analiza la técnica de este ${isVideo ? 'vídeo' : 'foto'} de ejercicio.
Ejercicio: ${exerciseName || 'No especificado'}

Evalúa con precisión clínica. RESPONDE SOLO CON JSON VÁLIDO:
{
  "score": <1-10 puntuación técnica>,
  "nivelRiesgo": "Bajo|Medio|Alto",
  "ejercicioDetectado": "<nombre del ejercicio que ves>",
  "errores": ["error biomecánico específico 1", "error 2"],
  "correcciones": ["corrección concreta 1 con instrucción exacta", "corrección 2"],
  "positivos": ["punto positivo específico 1"],
  "resumen": "Evaluación directa en 2 frases. Menciona el error más importante y cómo corregirlo."
}`;

        let parts;

        if (isVideo) {
            // Upload video to Gemini File API first
            const fileApiUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
            const videoBuffer = Buffer.from(mediaBase64, 'base64');

            const uploadRes = await axios.post(fileApiUrl, videoBuffer, {
                headers: {
                    'X-Goog-Upload-Protocol': 'raw',
                    'X-Goog-Upload-Command': 'upload, finalize',
                    'X-Goog-Upload-Header-Content-Length': videoBuffer.length,
                    'X-Goog-Upload-Header-Content-Type': mimeType,
                    'Content-Type': mimeType,
                },
                timeout: 60000,
            });

            const fileUri = uploadRes.data?.file?.uri;
            if (!fileUri) throw new Error('No se pudo subir el vídeo a Gemini.');

            // Wait for file to be ACTIVE
            const fileName = uploadRes.data.file.name;
            let attempts = 0;
            while (attempts < 10) {
                const stateRes = await axios.get(
                    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
                );
                if (stateRes.data?.state === 'ACTIVE') break;
                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }

            parts = [
                { fileData: { mimeType, fileUri } },
                { text: prompt },
            ];
        } else {
            parts = [
                { inlineData: { mimeType, data: mediaBase64 } },
                { text: prompt },
            ];
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts }],
            generationConfig: { maxOutputTokens: 1024 },
        }, { timeout: 60000 });

        let raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
        if (s !== -1 && e !== -1) raw = raw.slice(s, e + 1);
        const analysis = JSON.parse(raw);

        res.json(analysis);
    } catch (error) {
        console.error('[FormAnalysis]', error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { analyzeForm };
