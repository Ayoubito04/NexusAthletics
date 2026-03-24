import { Platform } from 'react-native';

const BACKEND_URL = 'https://nexusathletics.onrender.com'; // Backend en Render


export default {
    BACKEND_URL,
    API_ENDPOINTS: {
        CHAT: `${BACKEND_URL}/chat`,
        SESSIONS: `${BACKEND_URL}/chat/sessions`,
        AUTH_LOGIN: `${BACKEND_URL}/auth/login`,
        AUTH_REGISTER: `${BACKEND_URL}/auth/register`,
        AUTH_SOCIAL: `${BACKEND_URL}/auth/social`,
        AUTH_REFRESH: `${BACKEND_URL}/auth/refresh`,
        AUTH_LOGOUT: `${BACKEND_URL}/auth/logout`,
        AUTH_ME: `${BACKEND_URL}/auth/me`,
        AUTH_LINK_ACCOUNT: `${BACKEND_URL}/auth/link-account`,
        AUTH_UNLINK_ACCOUNT: `${BACKEND_URL}/auth/unlink-account`,
        AUTH_LINKED_ACCOUNTS: `${BACKEND_URL}/auth/linked-accounts`,
        AUTH_VERIFY_2FA: `${BACKEND_URL}/auth/verify`,
        AUTH_RESEND_CODE: `${BACKEND_URL}/auth/resend-code`,
        GENERATE_PLAN: `${BACKEND_URL}/generate-plan-interactive`,
        GENERATE_PDF: `${BACKEND_URL}/generate-pdf`,
        NOTIFICATIONS: `${BACKEND_URL}/notifications/count`,
    },
    // OAuth Configuration
    OAUTH: {
        GOOGLE: {
            WEB_CLIENT_ID: '251298359451-u2dt1r3890q6o0v1g7mv9i2a7o5n2hdq.apps.googleusercontent.com',
            IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        },
        FACEBOOK: {
            APP_ID: '1692723601693693',
        },
        INSTAGRAM: {
            CLIENT_ID: process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || 'tu_instagram_client_id',
        },
        X: {
            CLIENT_ID: process.env.EXPO_PUBLIC_X_CLIENT_ID || 'tu_x_client_id',
        },
    },
    // OAuth Provider Names for display
    PROVIDER_NAMES: {
        google: 'Google',
        facebook: 'Facebook',
        instagram: 'Instagram',
        twitter: 'X (Twitter)',
    },
    // Legacy config - mantener compatibilidad
    FACEBOOK_APP_ID: '1692723601693693',
    GOOGLE_WEB_CLIENT_ID: '251298359451-u2dt1r3890q6o0v1g7mv9i2a7o5n2hdq.apps.googleusercontent.com',
    INSTAGRAM_CLIENT_ID: 'tu_instagram_client_id',
    X_CLIENT_ID: 'tu_x_client_id'
};
