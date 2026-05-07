const { prisma } = require('../config/prisma');

// CREATE - Crear nueva actividad
const createActivity = async (req, res) => {
    const { tipo, distancia, tiempo, calorias, ruta } = req.body;
    try {
        const activity = await prisma.activity.create({
            data: {
                tipo,
                distancia: distancia !== undefined ? parseFloat(distancia) : undefined,
                tiempo: tiempo !== undefined ? parseFloat(tiempo) : undefined,
                calorias: calorias !== undefined ? parseFloat(calorias) : undefined,
                ruta,
                userId: req.user.id
            }
        });
        res.json(activity);
    } catch (error) {
        res.status(400).json({ error: "Error al crear actividad" });
    }
};

// READ - Obtener todas las actividades del usuario
const getActivities = async (req, res) => {
    try {
        const { page = 1, limit = 20, tipo } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { userId: req.user.id };
        if (tipo) where.tipo = tipo;

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where,
                orderBy: { fecha: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.activity.count({ where })
        ]);

        res.json({
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener actividades" });
    }
};

// READ - Obtener una actividad por ID
const getActivityById = async (req, res) => {
    try {
        const activity = await prisma.activity.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!activity) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener actividad" });
    }
};

// UPDATE - Actualizar actividad
const updateActivity = async (req, res) => {
    const { tipo, distancia, tiempo, calorias, ruta } = req.body;
    try {
        const existing = await prisma.activity.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        const activity = await prisma.activity.update({
            where: { id: req.params.id },
            data: {
                tipo: tipo || existing.tipo,
                distancia: distancia !== undefined ? parseFloat(distancia) : existing.distancia,
                tiempo: tiempo !== undefined ? parseFloat(tiempo) : existing.tiempo,
                calorias: calorias !== undefined ? parseFloat(calorias) : existing.calorias,
                ruta: ruta || existing.ruta
            }
        });
        res.json(activity);
    } catch (error) {
        res.status(400).json({ error: "Error al actualizar actividad" });
    }
};

// DELETE - Eliminar actividad
const deleteActivity = async (req, res) => {
    try {
        const existing = await prisma.activity.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        await prisma.activity.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: "Actividad eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar actividad" });
    }
};

const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                healthSynced: true,
                healthService: true,
                healthCalories: true,
                healthSteps: true
            }
        });

        const [activities, workoutSessions] = await Promise.all([
            prisma.activity.findMany({ where: { userId } }),
            prisma.workoutSession.findMany({
                where: { userId },
                select: { duration: true, date: true }
            }),
        ]);

        // Calcular datos semanales (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const weeklyActivities = await prisma.activity.findMany({
            where: { userId, fecha: { gte: sevenDaysAgo } },
            orderBy: { fecha: 'asc' }
        });

        // Crear buckets para cada uno de los últimos 7 días
        const dailyStats = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return {
                date: d.toISOString().split('T')[0],
                calories: 0,
                distance: 0,
                dayName: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()]
            };
        });

        weeklyActivities.forEach(act => {
            const actDate = new Date(act.fecha).toISOString().split('T')[0];
            const bucket = dailyStats.find(b => b.date === actDate);
            if (bucket) {
                bucket.calories += (act.calorias || 0);
                bucket.distance += (act.distancia || 0);
            }
        });

        // Sumar tiempo de sesiones de gym (workoutSession.duration está en segundos)
        const gymSegundos = workoutSessions.reduce((s, w) => s + (w.duration || 0), 0);

        const stats = activities.reduce((acc, curr) => {
            acc.totalKm += (curr.distancia / 1000);
            acc.totalKcal += (curr.calorias || 0);
            acc.totalSegundos += (curr.tiempo || 0);
            return acc;
        }, {
            totalKm: 0,
            totalKcal: 0,
            totalSegundos: gymSegundos, // empieza con el tiempo de gym
            count: workoutSessions.length, // sesiones de gym, no GPS
            healthSynced: user.healthSynced,
            healthService: user.healthService,
            healthCalories: user.healthCalories || 0,
            healthSteps: user.healthSteps || 0,
            weeklyProgress: dailyStats
        });

        res.json(stats);
    } catch (error) {
        console.error("Error en getStats:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
};

const { tryGeminiWithFallback } = require('../services/geminiService');

const getAIAnalysis = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { activities: { orderBy: { fecha: 'desc' }, take: 20 } }
        });

        const context = `Biometría: ${user.peso || '?'}kg, ${user.altura || '?'}cm, Objetivo: ${user.objetivo || 'Mejorar'}. 
        Salud Hoy: ${user.healthCalories || 0} kcal, ${user.healthSteps || 0} pasos (${user.healthSynced ? 'Sincronizado' : 'Manual'}).`;
        const activitySummary = user.activities.map(a => `${a.tipo} (${(a.distancia / 1000).toFixed(2)}km en ${Math.floor(a.tiempo / 60)} min)`).join('; ');

        const systemPrompt = `Eres un experto analista deportivo de Nexus Athletics. Analiza el rendimiento de este atleta:
        ${context}
        Últimas actividades: ${activitySummary || 'Ninguna registrada aún'}.
        
        Proporciona un análisis breve (máximo 150 palabras) con: 
        1. Tendencia de progreso.
        2. Un punto fuerte detectado.
        3. Una recomendación técnica o táctica.
        Sé profesional y ultra-preciso.`;

        const contents = [{ parts: [{ text: systemPrompt }] }];
        const response = await tryGeminiWithFallback(contents);
        res.json({ analysis: response.data.candidates[0].content.parts[0].text });
    } catch (error) {
        res.status(500).json({ error: "Error en el análisis de la IA" });
    }
};

/**
 * Analiza un entrenamiento detallado (series, reps, peso) y devuelve una reseña de la IA.
 */
const reviewWorkout = async (req, res) => {
    const { sessionData, duration, totalExercises } = req.body;
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Formatear los datos para Gemini
        const workoutSummary = sessionData.map(log =>
            `- ${log.exerciseName} (${log.muscle}): Serie ${log.set}, ${log.reps} reps con ${log.weight}kg`
        ).join('\n');

        const systemPrompt = `Eres un Master Coach de Nexus Athletics. Analiza este entrenamiento detallado y haz una revisión técnica.
        
        DATOS DEL ENTRENAMIENTO:
        Duración: ${Math.floor(duration / 60)} minutos
        Ejercicios: ${totalExercises}
        Detalles por serie:
        ${workoutSummary}
        
        PERFIL ATLETA:
        Peso: ${user.peso || 70}kg | Objetivo: ${user.objetivo || 'Fuerza'}
        
        TU TAREA:
        1. Escribe una reseña motivadora y técnica (máx 80 palabras).
        2. Identifica puntos fuertes y débiles basados en el peso/reps vs el perfil del usuario.
        3. Evalúa el rendimiento de los músculos trabajados asignando una puntuación del 0 al 100 y una categoría: Bronce (0-20), Plata (21-40), Oro (41-60), Platino (61-80), Diamante (81-95), Maestro (96-100).
        
        FORMATO DE RESPUESTA (JSON estricto, sin markdown):
        {
          "review": "texto de la reseña...",
          "strongPoints": ["punto 1", "punto 2"],
          "weakPoints": ["punto 1"],
          "muscleRankings": [
            {"muscle": "Pecho", "rank": "Oro", "score": 55},
            {"muscle": "Bíceps", "rank": "Bronce", "score": 15}
          ]
        }`;

        const contents = [{ parts: [{ text: systemPrompt }] }];
        const response = await tryGeminiWithFallback(contents);

        // Limpiar la respuesta de posibles bloques de código markdown
        const cleanResponse = response.data.candidates[0].content.parts[0].text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const aiJson = JSON.parse(cleanResponse);

        res.json(aiJson);
    } catch (error) {
        console.error("Error en reviewWorkout:", error);
        res.status(500).json({ error: "No se pudo generar la reseña", details: error.message });
    }
};

module.exports = { createActivity, getActivities, getActivityById, updateActivity, deleteActivity, getStats, getAIAnalysis, reviewWorkout };
