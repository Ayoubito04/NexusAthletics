import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

// Detección ultra-robusta de Expo Go para silenciar errores de SDK 53+
const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';

export async function registerForPushNotificationsAsync() {
    try {
        if (isExpoGo) {
            console.log('💡 [Nexus] Saltando registro de notificaciones (Modo Expo Go detectado).');
            return null;
        }

        // Importación dinámica: NO se evalúa hasta que entramos aquí (y no entramos si es Expo Go)
        const Notifications = require('expo-notifications');

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#63ff15',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId
            })).data;
        }

        return token;
    } catch (e) {
        // Silencio absoluto ante errores de librería nativa en entornos no compatibles
        console.log("💡 [Nexus] Notificaciones no disponibles en este entorno.");
        return null;
    }
}

export async function sendAchievementNotification(achievement) {
    if (isExpoGo || !achievement) return;
    try {
        const Notifications = require('expo-notifications');
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🏆 ¡Logro Desbloqueado!',
                body: `${achievement.title} — ${achievement.description}`,
                data: { type: 'achievement', id: achievement.id },
                color: '#63ff15',
                sound: true,
            },
            trigger: null,
        });
    } catch (_) {}
}

export async function saveTokenToBackend(token) {
    if (!token) return;
    try {
        const userToken = await AsyncStorage.getItem('token');
        if (!userToken) return;

        await fetch(`${BACKEND_URL}/user/push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ token })
        });
    } catch (error) {
        // Error de red silencioso
    }
}

const INACTIVITY_MESSAGES = [
    { title: '💪 ¡Tu cuerpo te necesita!', body: 'Llevas 3 días sin entrenar. Hoy es el momento de volver.' },
    { title: '🔥 El progreso no espera', body: '3 días de descanso están bien, pero ya es hora de sudar.' },
    { title: '⚡ Nexus te echa de menos', body: '¡Vuelve al gym! Tu siguiente PR está más cerca de lo que crees.' },
    { title: '🏋️ ¿Seguimos?', body: 'Llevas 3 días sin entrenar. Un entreno rápido es mejor que ninguno.' },
    { title: '🎯 Mantén el ritmo', body: 'La constancia es la clave. ¡Vuelve hoy y mantén tu racha!' },
];

const DAILY_MOTIVATION = [
    '¡Buenos días, atleta! Hoy es un gran día para superar tus límites. 💪',
    'Cada repetición te acerca a tu mejor versión. ¡A por ello! 🔥',
    'Los campeones entrenan cuando no tienen ganas. ¿Eres uno de ellos? ⚡',
    'Tu cuerpo puede aguantar casi cualquier cosa. Es tu mente la que debes convencer. 🧠',
    'El dolor de hoy es la fuerza de mañana. ¡Vamos! 🏋️',
    'No cuentes los días, haz que los días cuenten. 🎯',
    'El único mal entreno es el que no se hace. ¡Hoy entrenas! 🚀',
];

export async function scheduleInactivityReminder() {
    if (isExpoGo) return;
    try {
        const Notifications = require('expo-notifications');
        await Notifications.cancelScheduledNotificationAsync('inactivity-reminder').catch(() => {});
        const msg = INACTIVITY_MESSAGES[Math.floor(Math.random() * INACTIVITY_MESSAGES.length)];
        await Notifications.scheduleNotificationAsync({
            identifier: 'inactivity-reminder',
            content: {
                title: msg.title,
                body: msg.body,
                sound: true,
                color: '#63ff15',
            },
            trigger: { seconds: 3 * 24 * 60 * 60 },
        });
    } catch (_) {}
}

export async function cancelInactivityReminder() {
    if (isExpoGo) return;
    try {
        const Notifications = require('expo-notifications');
        await Notifications.cancelScheduledNotificationAsync('inactivity-reminder').catch(() => {});
    } catch (_) {}
}

export async function scheduleDailyMotivation() {
    if (isExpoGo) return;
    try {
        const Notifications = require('expo-notifications');
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const alreadySet = scheduled.some(n => n.identifier === 'daily-motivation');
        if (alreadySet) return;
        const day = new Date().getDay();
        await Notifications.scheduleNotificationAsync({
            identifier: 'daily-motivation',
            content: {
                title: '⚡ NEXUS ATHLETICS',
                body: DAILY_MOTIVATION[day],
                sound: true,
                color: '#63ff15',
            },
            trigger: { hour: 9, minute: 0, repeats: true },
        });
    } catch (_) {}
}
