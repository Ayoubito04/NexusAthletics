const { tryGeminiWithFallback } = require('../services/geminiService');
const { sendPushNotification } = require('../services/notificationService');
const { uploadImage } = require('../services/cloudinaryService');
const { prisma } = require('../config/prisma');

const userCooldowns = new Map();

async function checkAndResetMessages(user) {
    const today = new Date();
    const lastUpdate = new Date(user.ultimaActualizacionMensajes);

    if (today.toDateString() !== lastUpdate.toDateString()) {
        return await prisma.user.update({
            where: { id: user.id },
            data: {
                mensajesHoy: 0,
                ultimaActualizacionMensajes: today
            }
        });
    }
    return user;
}

function getPlanLimit(plan) {
    switch (plan) {
        case 'Pro': return 500;
        case 'Ultimate': return 999999;
        default: return 999999; // Consultas ilimitadas para todos
    }
}

function getSystemPrompt(plan, userData = null, sessionConfig = null) {
    let basePrompt = "Eres un Entrenador de Élite Profesional de Nexus Athletics AI. ";
    basePrompt += "Tu objetivo es proporcionar asesoramiento altamente personalizado, motivador y basado en datos reales del usuario. ";

    if (sessionConfig && Object.keys(sessionConfig).length > 0) {
        basePrompt += "\n\n--- CONFIGURACIÓN ESPECÍFICA DE ESTE CHAT ---";
        if (sessionConfig.metodologia) basePrompt += `\nMetodología Solicitada: ${sessionConfig.metodologia}`;
        if (sessionConfig.intensidad) basePrompt += `\nIntensidad: ${sessionConfig.intensidad}`;
        if (sessionConfig.prioridad) basePrompt += `\nPrioridad Muscular: ${sessionConfig.prioridad}`;
        if (sessionConfig.duracion) basePrompt += `\nDuración Objetivo: ${sessionConfig.duracion}`;
        basePrompt += `\nINDICACIÓN: Debes responder adaptando todos tus consejos estrictamente a esta metodología (${sessionConfig.metodologia}).`;
    }

    if (userData) {
        basePrompt += "\n\n--- PERFIL DEL ATLETA ---";
        if (userData.nombre) basePrompt += `\nNombre: ${userData.nombre}`;
        if (userData.peso) basePrompt += `\nPeso: ${userData.peso}kg`;
        if (userData.altura) basePrompt += `\nAltura: ${userData.altura}cm`;
        if (userData.edad) basePrompt += `\nEdad: ${userData.edad} años`;
        if (userData.genero) basePrompt += `\nGénero: ${userData.genero}`;
        if (userData.objetivo) basePrompt += `\nObjetivo: ${userData.objetivo}`;
        if (userData.nivelActividad) basePrompt += `\nNivel de Actividad: ${userData.nivelActividad}`;

        if (userData.healthSynced) {
            basePrompt += `\nESTADO DE SINCRONIZACIÓN: Conectado a ${userData.healthService || 'Servicio de Salud'}.`;
            basePrompt += `\nDATOS DE SALUD HOY (Sincronizados): ${userData.healthCalories || 0} kcal quemadas, ${userData.healthSteps || 0} pasos.`;
            basePrompt += `\nNOTA IA: El usuario ha sincronizado sus biométricos en tiempo real. Actúa como si tuvieras acceso a sus niveles de actividad diarios y felicítalo por mantener la Bio-Sincronización activa.`;
        } else {
            basePrompt += `\nESTADO DE SINCRONIZACIÓN: No conectado. (Sugerir al usuario que sincronice Google Fit/Apple Health en la sección Bio-Sincronización si lo desea).`;
        }

        // Estadísticas acumuladas
        if (userData.activities && userData.activities.length > 0) {
            const totalKm = userData.activities.reduce((sum, a) => sum + (a.distancia / 1000), 0);
            const totalKcal = userData.activities.reduce((sum, a) => sum + (a.calorias || 0), 0);
            basePrompt += `\n\n--- MÉTRICAS ACUMULADAS EN NEXUS ---`;
            basePrompt += `\nDistancia Total: ${totalKm.toFixed(2)} km`;
            basePrompt += `\nCalorías en Actividades: ${totalKcal.toFixed(0)} kcal`;
            basePrompt += `\nTotal Actividades: ${userData.activities.length}`;

            basePrompt += "\n\n--- ÚLTIMAS 5 ACTIVIDADES ---";
            userData.activities.slice(0, 5).forEach((act) => {
                basePrompt += `\n- ${act.tipo}: ${act.distancia}km, ${Math.floor(act.tiempo / 60)} min (${new Date(act.fecha).toLocaleDateString()})`;
            });
        }

        if (userData.peso && userData.altura) {
            const heightInMeters = userData.altura / 100;
            const bmi = (userData.peso / (heightInMeters * heightInMeters)).toFixed(1);
            basePrompt += `\n\nIMC ACTUAL: ${bmi}`;

            let status = "Normal";
            if (bmi < 18.5) status = "Bajo peso";
            else if (bmi >= 25 && bmi < 30) status = "Sobrepeso";
            else if (bmi >= 30) status = "Obesidad";
            basePrompt += ` (Estado: ${status})`;
        }
    }

    basePrompt += "\n\nANÁLISIS DE EVOLUCIÓN:";
    basePrompt += "\n- Tu prioridad es analizar si el usuario está progresando hacia su objetivo.";
    basePrompt += "\n- Si el usuario pregunta 'cómo voy', 'analiza mis métricas' o similar, usa los datos de arriba para darle un feedback técnico.";
    basePrompt += "\n- Compara su actividad reciente con su perfil (peso, IMC, objetivo).";

    basePrompt += "\n\nREGLAS DE RESPUESTA:";
    basePrompt += "\n1. Responde en español.";
    basePrompt += "\n2. Sé profesional pero motivador (estilo Entrenador de Élite).";
    basePrompt += "\n3. Haz referencia a sus datos específicos para dar consejos precisos.";
    basePrompt += "\n4. Sé directo y evita rodeos innecesarios.";

    return basePrompt;
}

const sendChat = async (req, res) => {
    const { message, image, sessionId } = req.body;
    const userId = req.user.id;

    const now = Date.now();
    const lastRequest = userCooldowns.get(userId) || 0;
    if (now - lastRequest < 5000) {
        return res.status(429).json({ error: "Espera unos segundos entre mensajes." });
    }
    userCooldowns.set(userId, now);

    try {
        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                activities: {
                    orderBy: { fecha: 'desc' },
                    take: 20
                }
            }
        });
        user = await checkAndResetMessages(user);
        const limit = getPlanLimit(user.plan);

        if (user.mensajesHoy >= limit) {
            return res.status(429).json({ error: "Límite diario alcanzado." });
        }

        // Validar tamaño de imagen si existe
        if (image) {
            // Extraer solo la parte base64 (después de la coma si tiene prefijo data:)
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            const sizeInBytes = (base64Data.length * 3) / 4;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            console.log(`[Image Size] ${sizeInMB.toFixed(2)} MB`);

            if (sizeInMB > 4) {
                return res.status(413).json({
                    error: "La imagen es demasiado grande. Por favor, usa una imagen más pequeña (máximo 4MB)."
                });
            }
        }

        // Obtener configuración de la sesión si existe
        let sessionData = null;
        if (sessionId) {
            sessionData = await prisma.chatSession.findUnique({
                where: { id: parseInt(sessionId) }
            });
        }

        const systemPrompt = getSystemPrompt(user.plan, user, sessionData ? sessionData.config : null);
        let contents = [{ parts: [{ text: systemPrompt + "\nUsuario: " + (message || "Hola") }] }];
        let cloudinaryUrl = null;

        if (image) {
            try {
                // Extraer solo la parte base64 sin el prefijo data:image/...
                const base64Data = image.includes(',') ? image.split(',')[1] : image;

                // Subir a Cloudinary
                cloudinaryUrl = await uploadImage(image, 'chat_uploads');

                // Agregar imagen a la petición de Gemini
                contents[0].parts.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                });
            } catch (uploadError) {
                console.error('[Cloudinary Error]', uploadError.message);
                // Continuar sin subir a Cloudinary pero mantener análisis
                const base64Data = image.includes(',') ? image.split(',')[1] : image;
                contents[0].parts.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                });
            }
        }

        // Guardar el mensaje del usuario PRIMERO
        await prisma.message.create({
            data: {
                text: message || (image ? "Imagen enviada" : ""),
                sender: 'usuario',
                userId: userId,
                sessionId: sessionId ? parseInt(sessionId) : null,
                image: cloudinaryUrl
            }
        });

        const response = await tryGeminiWithFallback(contents);

        // Validar respuesta de Gemini
        if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
            throw new Error('Respuesta inválida de Gemini API');
        }

        const iaResponse = response.data.candidates[0].content.parts[0].text;

        await prisma.message.create({
            data: {
                text: iaResponse,
                sender: 'ia',
                userId: userId,
                sessionId: sessionId ? parseInt(sessionId) : null
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { mensajesHoy: { increment: 1 } }
        });

        res.json({ text: iaResponse });
    } catch (error) {
        console.error('[Chat Error]', error.message);
        console.error('[Chat Error Stack]', error.stack);
        res.status(500).json({
            error: error.message || "Error al procesar el mensaje"
        });
    }
};

const getSessions = async (req, res) => {
    try {
        const sessions = await prisma.chatSession.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener sesiones" });
    }
};

const getSessionMessages = async (req, res) => {
    const { sessionId } = req.params;
    try {
        const messages = await prisma.message.findMany({
            where: {
                sessionId: parseInt(sessionId),
                userId: req.user.id
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar mensajes" });
    }
};

const createSession = async (req, res) => {
    const { title, theme, config } = req.body;
    try {
        const session = await prisma.chatSession.create({
            data: {
                title: title || "Nuevo Chat",
                theme: theme || "General",
                config: config || {},
                userId: req.user.id
            }
        });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: "Error al crear sesión" });
    }
};

const deleteSession = async (req, res) => {
    const { sessionId } = req.params;
    try {
        // Verificar que la sesión pertenece al usuario antes de borrar
        const session = await prisma.chatSession.findFirst({
            where: { id: parseInt(sessionId), userId: req.user.id }
        });
        if (!session) return res.status(404).json({ error: "Sesión no encontrada" });

        await prisma.chatSession.delete({
            where: { id: parseInt(sessionId) }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar sesión" });
    }
};

const sendDM = async (req, res) => {
    const { receiverId, text, image } = req.body;
    try {
        let cloudinaryUrl = null;
        if (image) {
            cloudinaryUrl = await uploadImage(image, 'dm_uploads');
        }

        const message = await prisma.message.create({
            data: {
                text: text || (image ? "Imagen" : ""),
                sender: 'usuario',
                userId: req.user.id,
                receiverId: parseInt(receiverId),
                isDM: true,
                image: cloudinaryUrl
            },
            include: {
                user: {
                    select: { nombre: true }
                }
            }
        });

        // Intentar enviar notificación push al receptor
        try {
            const receiver = await prisma.user.findUnique({
                where: { id: parseInt(receiverId) },
                select: { pushToken: true }
            });

            if (receiver && receiver.pushToken) {
                const senderName = message.user.nombre || "Un usuario";
                await sendPushNotification(
                    receiver.pushToken,
                    `Mensaje de ${senderName}`,
                    text,
                    { type: 'dm', senderId: req.user.id }
                );
            }
        } catch (pushError) {
            console.error("Error al enviar notificación de DM:", pushError);
        }

        res.json(message);
    } catch (error) {
        console.error("Error en sendDM:", error);
        res.status(500).json({ error: "Error al enviar mensaje" });
    }
};

const getDMs = async (req, res) => {
    const { friendId } = req.params;
    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { userId: req.user.id, receiverId: parseInt(friendId) },
                    { userId: parseInt(friendId), receiverId: req.user.id }
                ],
                isDM: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener mensajes" });
    }
};

module.exports = { sendChat, getSessions, getSessionMessages, createSession, deleteSession, sendDM, getDMs };
