const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../firebase-service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Inicializar Expo SDK
const expo = new Expo();

/**
 * Envía una notificación push a un usuario específico
 * @param {string} pushToken - El token de Expo del usuario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo del mensaje
 * @param {object} data - Datos adicionales (opcional)
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
    // Verificar si el token es válido para Expo
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} no es un token de Expo válido`);
        return;
    }

    const messages = [{
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
        channelId: 'default',
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error("Error enviando chunk de notificaciones:", error);
            }
        }

        console.log("Ticket de notificación enviado:", tickets);
        return tickets;
    } catch (error) {
        console.error("Error general en el servicio de notificaciones:", error);
    }
};

module.exports = {
    sendPushNotification
};
