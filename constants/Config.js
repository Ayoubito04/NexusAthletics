import { Platform } from 'react-native';

const BACKEND_URL = 'http://192.168.0.22:3000'; // IP de tu PC para que funcione en dispositivos físicos y emuladores


export default {
    BACKEND_URL,
    API_ENDPOINTS: {
        CHAT: `${BACKEND_URL}/chat`,
        SESSIONS: `${BACKEND_URL}/chat/sessions`,
        AUTH_LOGIN: `${BACKEND_URL}/auth/login`,
        AUTH_REGISTER: `${BACKEND_URL}/auth/register`,
        GENERATE_PLAN: `${BACKEND_URL}/generate-plan-interactive`,
        GENERATE_PDF: `${BACKEND_URL}/generate-pdf`,
        NOTIFICATIONS: `${BACKEND_URL}/notifications/count`,
    },
    FACEBOOK_APP_ID: '1692723601693693',
    GOOGLE_WEB_CLIENT_ID: '251298359451-u2dt1r3890q6o0v1g7mv9i2a7o5n2hdq.apps.googleusercontent.com',
    INSTAGRAM_CLIENT_ID: 'tu_instagram_client_id',
    X_CLIENT_ID: 'tu_x_client_id'
};
