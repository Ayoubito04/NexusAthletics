const fs = require('fs');
const path = require('path');
const { tryGeminiWithFallback } = require('../services/geminiService');
const { prisma } = require('../config/prisma');

const { transcribeAudio } = require('../services/openAIService');


// Función para obtener el prompt del sistema para el entrenador de voz
function getVoiceCoachSystemPrompt(userData = null) {
    let prompt = `Eres un Entrenador Personal en Vivo especializado en guiar ejercicios en tiempo real. 
Tu rol es responder de forma concisa, motivadora y técnica, como si estuvieras al lado del usuario durante su sesión de entrenamiento.

CARACTERÍSTICAS DE TUS RESPUESTAS:
- Concisas y directas (máximo 2-3 frases)
- Enfocadas en técnica, forma, respiración y motivación
- Usa lenguaje motivador pero profesional
- Si te preguntan sobre un ejercicio, da instrucciones paso a paso
- Si el usuario dice que está cansado, motívalo pero recuérdale la importancia del descanso
- Responde siempre en español

EJEMPLOS:
Usuario: "Cómo hago una sentadilla correcta?"
Tú: "¡Perfecto! Separa los pies al ancho de hombros, baja como si te sentaras en una silla, mantén la espalda recta y las rodillas detrás de las puntas de los pies. ¡Tú puedes!"

Usuario: "Estoy muy cansado"
Tú: "Escucha a tu cuerpo. Toma 30 segundos de descanso, respira profundo y continuamos. El descanso es parte del entrenamiento. ¡Vamos!"
`;

    if (userData) {
        prompt += `\n\n--- INFORMACIÓN DEL ATLETA ---`;
        if (userData.nombre) prompt += `\nNombre: ${userData.nombre}`;
        if (userData.objetivo) prompt += `\nObjetivo: ${userData.objetivo}`;
        if (userData.nivelActividad) prompt += `\nNivel: ${userData.nivelActividad}`;
        if (userData.peso) prompt += `\nPeso: ${userData.peso}kg`;
        if (userData.edad) prompt += `\nEdad: ${userData.edad} años`;
    }

    return prompt;
}

/**
 * Transcribe audio usando Whisper API de OpenAI y genera respuesta con IA
 */
const transcribeAndRespond = async (req, res) => {
    try {
        console.log('[VoiceController] Iniciando transcripción de audio...');

        // Verificar que se haya enviado un archivo
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo de audio' });
        }

        const userId = req.user.id;

        // Obtener datos del usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                activities: {
                    orderBy: { fecha: 'desc' },
                    take: 5
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        console.log('[VoiceController] Archivo recibido:', req.file.path);

        // Verificar si OpenAI está configurado
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_openai_api_key_aqui') {
            return res.status(503).json({
                error: 'Servicio de voz no disponible',
                message: 'Por favor configura OPENAI_API_KEY en el archivo .env del backend para usar esta funcionalidad.',
                transcription: '[Servicio no disponible - Configura OpenAI API Key]'
            });
        }

        // Transcribir audio con Whisper
        const audioFilePath = req.file.path;
        let transcription = '';

        try {
            transcription = await transcribeAudio(audioFilePath);
            console.log('[VoiceController] Transcripción exitosa:', transcription);
        } catch (whisperError) {
            console.error('[VoiceController] Error en Whisper API:', whisperError);

            // Si falla Whisper, intentar con un mensaje genérico
            if (whisperError.message.includes('API key')) {
                return res.status(500).json({
                    error: 'API Key de OpenAI no configurada. Por favor configura OPENAI_API_KEY en el .env',
                    transcription: '[Audio no transcrito - API Key faltante]'
                });
            }

            return res.status(500).json({
                error: 'Error al transcribir el audio',
                details: whisperError.message
            });
        } finally {
            // Limpiar archivo temporal
            try {
                if (fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                    console.log('[VoiceController] Archivo temporal eliminado');
                }
            } catch (cleanupError) {
                console.error('[VoiceController] Error al eliminar archivo temporal:', cleanupError);
            }
        }

        // Si la transcripción está vacía, retornar error
        if (!transcription || transcription.trim() === '') {
            return res.status(400).json({
                error: 'No se detectó voz en el audio',
                transcription: ''
            });
        }

        // Generar respuesta de IA usando Gemini
        const systemPrompt = getVoiceCoachSystemPrompt(user);
        const contents = [{
            parts: [{
                text: `${systemPrompt}\n\nUsuario: ${transcription}\n\nRecuerda: Responde de forma muy concisa (máximo 2-3 frases) porque será leída en voz alta.`
            }]
        }];

        let aiResponse = '';
        try {
            const geminiResponse = await tryGeminiWithFallback(contents);
            aiResponse = geminiResponse.data.candidates[0].content.parts[0].text;
            console.log('[VoiceController] Respuesta IA generada:', aiResponse);
        } catch (aiError) {
            console.error('[VoiceController] Error en IA:', aiError);
            aiResponse = 'Entendido. ¿En qué más puedo ayudarte con tu entrenamiento?';
        }

        // Guardar la conversación en la base de datos (opcional)
        try {
            await prisma.message.create({
                data: {
                    text: transcription,
                    sender: 'usuario',
                    userId: userId,
                    isVoice: true
                }
            });

            await prisma.message.create({
                data: {
                    text: aiResponse,
                    sender: 'ia',
                    userId: userId,
                    isVoice: true
                }
            });
        } catch (dbError) {
            console.error('[VoiceController] Error guardando en BD:', dbError);
            // No detener la respuesta si falla guardar en BD
        }

        // Retornar transcripción y respuesta de IA
        res.json({
            transcription: transcription,
            aiResponse: aiResponse,
            success: true
        });

    } catch (error) {
        console.error('[VoiceController] Error general:', error);
        res.status(500).json({
            error: 'Error al procesar el audio',
            details: error.message
        });
    }
};

module.exports = {
    transcribeAndRespond
};
