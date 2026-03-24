const { prisma } = require('../config/prisma');
const { sendPushNotification } = require('./notificationService');

/**
 * Servicio para enviar notificaciones push inteligentes basadas en el comportamiento del usuario
 */

// Notificaciones motivacionales de pasos
async function sendStepGoalNotifications() {
    try {
        const users = await prisma.user.findMany({
            where: {
                pushToken: { not: null },
                healthSynced: true
            }
        });

        for (const user of users) {
            const steps = user.healthSteps || 0;
            const goal = 10000;

            // Si está cerca de la meta (80-95%)
            if (steps >= goal * 0.8 && steps < goal * 0.95) {
                await sendPushNotification(
                    user.pushToken,
                    '🔥 ¡Casi lo logras!',
                    `Solo te faltan ${goal - steps} pasos para alcanzar tu meta diaria. ¡Vamos!`
                );
            }

            // Si superó la meta
            if (steps >= goal && steps < goal * 1.1) {
                await sendPushNotification(
                    user.pushToken,
                    '🏆 ¡Meta Alcanzada!',
                    `¡Increíble! Has completado ${steps.toLocaleString()} pasos hoy. Eres imparable.`
                );
            }
        }
    } catch (error) {
        console.error('Error enviando notificaciones de pasos:', error);
    }
}

// Recordatorio de entrenamiento
async function sendWorkoutReminders() {
    try {
        const users = await prisma.user.findMany({
            where: {
                pushToken: { not: null }
            },
            include: {
                activities: {
                    orderBy: { fecha: 'desc' },
                    take: 1
                }
            }
        });

        const now = new Date();
        const hour = now.getHours();

        // Solo enviar en horario apropiado (9AM - 8PM)
        if (hour < 9 || hour > 20) return;

        for (const user of users) {
            const lastActivity = user.activities[0];

            if (!lastActivity) continue;

            const daysSinceLastActivity = Math.floor(
                (now - new Date(lastActivity.fecha)) / (1000 * 60 * 60 * 24)
            );

            // Si lleva más de 2 días sin actividad
            if (daysSinceLastActivity >= 2 && daysSinceLastActivity <= 3) {
                const messages = [
                    `💪 ${user.nombre || 'Atleta'}, tu cuerpo te extraña. ¿Listo para la acción?`,
                    `⚡ Han pasado ${daysSinceLastActivity} días. Tu mejor versión te está esperando.`,
                    `🎯 ${user.nombre || 'Campeón'}, es momento de volver al juego. ¡Hoy es el día!`
                ];

                const randomMessage = messages[Math.floor(Math.random() * messages.length)];

                await sendPushNotification(
                    user.pushToken,
                    'Nexus Athletics te espera',
                    randomMessage
                );
            }
        }
    } catch (error) {
        console.error('Error enviando recordatorios de entrenamiento:', error);
    }
}

// Celebración de logros
async function sendAchievementNotifications() {
    try {
        const users = await prisma.user.findMany({
            where: {
                pushToken: { not: null }
            }
        });

        for (const user of users) {
            // Verificar logros basados en pasos
            if (user.healthSteps >= 5000 && user.healthSteps < 5100) {
                await sendPushNotification(
                    user.pushToken,
                    '🏅 ¡Nuevo Logro Desbloqueado!',
                    '¡Has alcanzado los 5,000 pasos! Logro "Caminante Pro" desbloqueado.'
                );
            }

            if (user.healthSteps >= 10000 && user.healthSteps < 10100) {
                await sendPushNotification(
                    user.pushToken,
                    '🏆 ¡Logro Épico!',
                    '¡10,000 pasos completados! Eres un verdadero atleta Nexus.'
                );
            }

            // Verificar logros basados en mensajes con IA
            if (user.mensajesHoy === 1) {
                await sendPushNotification(
                    user.pushToken,
                    '🤖 ¡Logro Desbloqueado!',
                    'Has desbloqueado "IA Friend" por consultar con Nexus AI.'
                );
            }
        }
    } catch (error) {
        console.error('Error enviando notificaciones de logros:', error);
    }
}

// Notificación de bienvenida para nuevos usuarios
async function sendWelcomeNotification(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.pushToken) return;

        await sendPushNotification(
            user.pushToken,
            `🚀 ¡Bienvenido a Nexus Athletics, ${user.nombre || 'Atleta'}!`,
            'Estamos emocionados de acompañarte en tu viaje fitness. ¡Vamos a superar límites juntos!'
        );
    } catch (error) {
        console.error('Error enviando notificación de bienvenida:', error);
    }
}

// Notificación de upgrade de plan
async function sendPlanUpgradeNotification(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.pushToken) return;

        const messages = {
            'Pro': '⚡ ¡Bienvenido al Plan Pro! Desbloquea tu potencial con IA Canvas ilimitada.',
            'Ultimate': '💎 ¡Eres Ultimate ahora! Acceso total a todas las funciones élite de Nexus.'
        };

        if (messages[user.plan]) {
            await sendPushNotification(
                user.pushToken,
                '🎉 ¡Plan Mejorado!',
                messages[user.plan]
            );
        }
    } catch (error) {
        console.error('Error enviando notificación de upgrade:', error);
    }
}

module.exports = {
    sendStepGoalNotifications,
    sendWorkoutReminders,
    sendAchievementNotifications,
    sendWelcomeNotification,
    sendPlanUpgradeNotification
};
