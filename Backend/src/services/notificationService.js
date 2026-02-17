const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase Admin
let serviceAccount;

// Intentar cargar desde variable de entorno (para Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("Error al parsear FIREBASE_SERVICE_ACCOUNT:", e);
    }
} else {
    // Si no está la variable, intentar cargar el archivo local (para desarrollo)
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
    }
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin inicializado correctamente.");
} else if (!serviceAccount) {
    console.warn("⚠️ Advertencia: No se encontraron credenciales de Firebase. Notificaciones push desactivadas.");
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
