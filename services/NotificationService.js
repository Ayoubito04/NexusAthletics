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
