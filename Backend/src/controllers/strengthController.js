const { prisma } = require('../config/prisma');
const { sendPushNotification } = require('../services/notificationService');

// Fórmula Brzycki para 1RM estimado
const calc1RM = (weight, reps) => {
    if (!weight || weight <= 0) return 0;
    if (reps === 1) return weight;
    const r = Math.min(parseInt(reps) || 1, 36);
    return Math.round(weight * (36 / (37 - r)) * 10) / 10;
};

const MUSCLE_MAP = {
    'Pecho': 'Pecho', 'Chest': 'Pecho',
    'Espalda': 'Espalda', 'Back': 'Espalda',
    'Piernas': 'Piernas', 'Legs': 'Piernas', 'Glúteos': 'Piernas', 'Cuádriceps': 'Piernas', 'Isquiotibiales': 'Piernas',
    'Hombros': 'Hombros', 'Shoulders': 'Hombros', 'Deltoides': 'Hombros',
    'Brazos': 'Brazos', 'Bíceps': 'Brazos', 'Tríceps': 'Brazos', 'Arms': 'Brazos',
    'Core': 'Core', 'Abdominales': 'Core', 'Abs': 'Core',
    'General': 'General',
};

const normalizeMuscle = (m) => MUSCLE_MAP[m] || 'General';

// POST /strength/log — registra una sesión de entrenamiento
const logWorkoutSession = async (req, res) => {
    const { exercises = [], duration } = req.body;
    const userId = req.user.id;

    try {
        if (!exercises.length) return res.status(400).json({ error: 'Sin ejercicios' });

        // Calcular 1RM y volumen por ejercicio
        const processed = exercises.map(ex => {
            const w = parseFloat(ex.weight) || 0;
            const r = parseInt(ex.reps) || 1;
            const s = parseInt(ex.sets) || 1;
            return {
                name: ex.name,
                muscle: normalizeMuscle(ex.muscle || 'General'),
                sets: s,
                reps: r,
                weight: w,
                oneRepMax: calc1RM(w, r),
                volume: w * s * r,
            };
        });

        const totalVolume = processed.reduce((sum, e) => sum + e.volume, 0);

        // Agrupar por músculo: mejor 1RM por grupo
        const byMuscle = {};
        processed.forEach(ex => {
            if (!byMuscle[ex.muscle] || ex.oneRepMax > byMuscle[ex.muscle].oneRepMax) {
                byMuscle[ex.muscle] = ex;
            }
        });

        // Detectar PRs y actualizar tabla MuscleStrength
        const prs = [];
        for (const [muscle, ex] of Object.entries(byMuscle)) {
            const existing = await prisma.muscleStrength.findUnique({
                where: { userId_muscle: { userId, muscle } }
            });

            const isPR = ex.weight > 0 && (!existing || ex.oneRepMax > existing.bestOneRM);

            await prisma.muscleStrength.upsert({
                where: { userId_muscle: { userId, muscle } },
                update: {
                    bestOneRM: isPR ? ex.oneRepMax : existing.bestOneRM,
                    totalVolume: { increment: ex.volume },
                    sessions: { increment: 1 },
                },
                create: {
                    userId, muscle,
                    bestOneRM: ex.oneRepMax,
                    totalVolume: ex.volume,
                    sessions: 1,
                }
            });

            if (isPR) {
                prs.push({ muscle, exercise: ex.name, oneRepMax: ex.oneRepMax, weight: ex.weight, reps: ex.reps });
            }
        }

        // Guardar sesión
        const session = await prisma.workoutSession.create({
            data: { userId, exercises: processed, totalVolume, duration: duration || null }
        });

        // Notificar a usuarios superados en el ranking global de fuerza
        try {
            const newScore = (await prisma.muscleStrength.findMany({
                where: { userId },
                select: { bestOneRM: true },
            })).reduce((s, m) => s + m.bestOneRM, 0);

            // Usuarios cuyo totalScore estaba por encima del antiguo y ahora es inferior
            const allUsers = await prisma.user.findMany({
                where: {
                    id: { not: userId },
                    pushToken: { not: null },
                    muscleStrengths: { some: {} },
                },
                select: {
                    id: true,
                    nombre: true,
                    pushToken: true,
                    muscleStrengths: { select: { bestOneRM: true } },
                },
            });

            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { nombre: true, apellido: true },
            });

            const overtaken = allUsers.filter(u => {
                const theirScore = u.muscleStrengths.reduce((s, m) => s + m.bestOneRM, 0);
                return theirScore < newScore && theirScore > 0;
            });

            for (const u of overtaken) {
                if (u.pushToken) {
                    sendPushNotification(
                        u.pushToken,
                        '⚡ ¡Te han superado en el Ranking!',
                        `${currentUser.nombre} ${currentUser.apellido || ''} te ha superado en el ranking de fuerza. ¡Entrena para recuperar tu posición!`,
                        { screen: 'Ranking', tab: 'fuerza' }
                    ).catch(() => {});
                }
            }
        } catch (_) {}

        // Auto-publicar en el feed si hay PRs
        let post = null;
        if (prs.length > 0) {
            const desc = prs.map(p => `${p.exercise}: ${p.weight}kg × ${p.reps} reps (1RM ~${p.oneRepMax}kg)`).join('\n');
            post = await prisma.post.create({
                data: {
                    userId,
                    tipo: 'Entrenamiento',
                    distancia: 0,
                    tiempo: duration || 0,
                    descripcion: `¡Nuevo récord personal! 🏆\n${desc}`,
                    exerciseData: prs,
                    isPR: true,
                }
            });
        }

        res.json({ session, prs, post });
    } catch (error) {
        console.error('[Strength] Error logWorkoutSession:', error);
        res.status(500).json({ error: 'Error al registrar entrenamiento' });
    }
};

// GET /strength/ranking?muscle=Pecho  — ranking global o por músculo
const getStrengthRanking = async (req, res) => {
    const { muscle } = req.query;
    try {
        if (muscle) {
            const rows = await prisma.muscleStrength.findMany({
                where: { muscle },
                orderBy: { bestOneRM: 'desc' },
                take: 100,
                include: {
                    user: { select: { id: true, nombre: true, apellido: true, avatar: true, plan: true } }
                }
            });
            return res.json(rows.map((r, i) => ({
                rank: i + 1,
                userId: r.userId,
                nombre: r.user.nombre,
                apellido: r.user.apellido,
                avatar: r.user.avatar,
                plan: r.user.plan,
                muscle: r.muscle,
                bestOneRM: r.bestOneRM,
                totalVolume: r.totalVolume,
                sessions: r.sessions,
            })));
        }

        // Ranking global: suma de todos los bestOneRM por usuario
        const users = await prisma.user.findMany({
            where: { muscleStrengths: { some: {} } },
            select: {
                id: true, nombre: true, apellido: true, avatar: true, plan: true,
                muscleStrengths: { select: { muscle: true, bestOneRM: true, totalVolume: true, sessions: true } },
                workoutSessions: { select: { id: true } }
            }
        });

        const ranked = users
            .map(u => ({
                userId: u.id,
                nombre: u.nombre,
                apellido: u.apellido,
                avatar: u.avatar,
                plan: u.plan,
                totalScore: Math.round(u.muscleStrengths.reduce((s, m) => s + m.bestOneRM, 0)),
                totalSessions: u.workoutSessions.length,
                muscles: u.muscleStrengths,
            }))
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 100)
            .map((u, i) => ({ ...u, rank: i + 1 }));

        res.json(ranked);
    } catch (error) {
        console.error('[Strength] Error getStrengthRanking:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
};

// GET /strength/me — mis datos de fuerza por músculo
const getMyStrength = async (req, res) => {
    try {
        const strengths = await prisma.muscleStrength.findMany({
            where: { userId: req.user.id },
            orderBy: { bestOneRM: 'desc' },
        });
        res.json(strengths);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener datos de fuerza' });
    }
};

module.exports = { logWorkoutSession, getStrengthRanking, getMyStrength };
