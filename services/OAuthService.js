/**
 * OAuthService - Servicio mejorado de autenticacion OAuth
 * Maneja autenticacion con Google, Facebook, Instagram con:
 * - Manejo de errores especifico por proveedor
 * - Refresh token flow
 * - Logout con revocacion de tokens
 * - Account linking entre proveedores
 * - Estados de loading detallados
 */

import Config from '../constants/Config';

// Codigos de error especificos por proveedor
export const OAuthErrorCodes = {
    GOOGLE: {
        SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
        IN_PROGRESS: 'IN_PROGRESS',
        PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
        SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
        INVALID_ACCOUNT: 'INVALID_ACCOUNT',
        INTERNAL_ERROR: 'INTERNAL_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        TOKEN_EXPIRED: 'TOKEN_EXPIRED',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
    },
    FACEBOOK: {
        CANCELLED: 'CANCELLED',
        NETWORK_ERROR: 'NETWORK_ERROR',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
        ACCOUNT_NOT_LINKED: 'ACCOUNT_NOT_LINKED',
        SESSION_EXPIRED: 'SESSION_EXPIRED',
    },
    INSTAGRAM: {
        CANCELLED: 'CANCELLED',
        NETWORK_ERROR: 'NETWORK_ERROR',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
        INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
    },
    GENERIC: {
        NETWORK_ERROR: 'NETWORK_ERROR',
        SERVER_ERROR: 'SERVER_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    }
};

// Mensajes de error user-friendly por proveedor y codigo
export const OAuthErrorMessages = {
    GOOGLE: {
        [OAuthErrorCodes.GOOGLE.SIGN_IN_CANCELLED]: {
            title: 'Inicio de sesion cancelado',
            message: 'Has cancelado el inicio de sesion con Google. Puedes intentarlo de nuevo cuando quieras.',
            action: 'retry',
            icon: 'information-circle-outline'
        },
        [OAuthErrorCodes.GOOGLE.IN_PROGRESS]: {
            title: 'Sesion en curso',
            message: 'Ya hay un proceso de autenticacion en curso. Espera un momento.',
            action: 'wait',
            icon: 'time-outline'
        },
        [OAuthErrorCodes.GOOGLE.PLAY_SERVICES_NOT_AVAILABLE]: {
            title: 'Servicios de Google Play',
            message: 'Tu dispositivo no tiene Google Play Services. Descargalo desde la Play Store para usar este metodo de inicio de sesion.',
            action: 'store',
            icon: 'download-outline'
        },
        [OAuthErrorCodes.GOOGLE.SIGN_IN_REQUIRED]: {
            title: 'Inicio de sesion requerido',
            message: 'Necesitas iniciar sesion en tu cuenta de Google primero.',
            action: 'settings',
            icon: 'log-in-outline'
        },
        [OAuthErrorCodes.GOOGLE.INVALID_ACCOUNT]: {
            title: 'Cuenta invalida',
            message: 'La cuenta seleccionada no es valida. Intenta con otra cuenta de Google.',
            action: 'retry',
            icon: 'warning-outline'
        },
        [OAuthErrorCodes.GOOGLE.INTERNAL_ERROR]: {
            title: 'Error interno',
            message: 'Ocurrio un error interno en Google. Intenta de nuevo mas tarde.',
            action: 'retry',
            icon: 'alert-circle-outline'
        },
        [OAuthErrorCodes.GOOGLE.NETWORK_ERROR]: {
            title: 'Error de conexion',
            message: 'No se pudo conectar con Google. Verifica tu conexion a internet.',
            action: 'retry',
            icon: 'cloud-offline-outline'
        },
        [OAuthErrorCodes.GOOGLE.TOKEN_EXPIRED]: {
            title: 'Sesion expirada',
            message: 'Tu sesion de Google ha expirado. Por favor, inicia sesion de nuevo.',
            action: 'retry',
            icon: 'time-outline'
        },
        [OAuthErrorCodes.GOOGLE.PERMISSION_DENIED]: {
            title: 'Permisos denegados',
            message: 'Necesitas otorgar permisos para usar tu cuenta de Google con NexusFitness.',
            action: 'settings',
            icon: 'lock-closed-outline'
        },
    },
    FACEBOOK: {
        [OAuthErrorCodes.FACEBOOK.CANCELLED]: {
            title: 'Inicio de sesion cancelado',
            message: 'Has cancelado el inicio de sesion con Facebook.',
            action: 'retry',
            icon: 'information-circle-outline'
        },
        [OAuthErrorCodes.FACEBOOK.NETWORK_ERROR]: {
            title: 'Error de conexion',
            message: 'No se pudo conectar con Facebook. Verifica tu conexion a internet.',
            action: 'retry',
            icon: 'cloud-offline-outline'
        },
        [OAuthErrorCodes.FACEBOOK.PERMISSION_DENIED]: {
            title: 'Permisos denegados',
            message: 'Necesitas otorgar permisos basicos para continuar con Facebook.',
            action: 'settings',
            icon: 'lock-closed-outline'
        },
        [OAuthErrorCodes.FACEBOOK.ACCOUNT_NOT_LINKED]: {
            title: 'Cuenta no vinculada',
            message: 'Esta cuenta de Facebook no esta vinculada a ningun perfil. Primero registrate con email.',
            action: 'register',
            icon: 'person-add-outline'
        },
        [OAuthErrorCodes.FACEBOOK.SESSION_EXPIRED]: {
            title: 'Sesion expirada',
            message: 'Tu sesion de Facebook ha expirado. Inicia sesion de nuevo.',
            action: 'retry',
            icon: 'time-outline'
        },
    },
    INSTAGRAM: {
        [OAuthErrorCodes.INSTAGRAM.CANCELLED]: {
            title: 'Inicio de sesion cancelado',
            message: 'Has cancelado el inicio de sesion con Instagram.',
            action: 'retry',
            icon: 'information-circle-outline'
        },
        [OAuthErrorCodes.INSTAGRAM.NETWORK_ERROR]: {
            title: 'Error de conexion',
            message: 'No se pudo conectar con Instagram. Verifica tu conexion.',
            action: 'retry',
            icon: 'cloud-offline-outline'
        },
        [OAuthErrorCodes.INSTAGRAM.PERMISSION_DENIED]: {
            title: 'Permisos denegados',
            message: 'Necesitas autorizar a NexusFitness para acceder a tu perfil de Instagram.',
            action: 'settings',
            icon: 'lock-closed-outline'
        },
        [OAuthErrorCodes.INSTAGRAM.INVALID_CLIENT_ID]: {
            title: 'Configuracion incorrecta',
            message: 'Instagram no esta configurado correctamente. Contacta al soporte.',
            action: 'support',
            icon: 'settings-outline'
        },
    },
    GENERIC: {
        [OAuthErrorCodes.GENERIC.NETWORK_ERROR]: {
            title: 'Error de conexion',
            message: 'No se pudo conectar al servidor. Verifica tu conexion a internet.',
            action: 'retry',
            icon: 'cloud-offline-outline'
        },
        [OAuthErrorCodes.GENERIC.SERVER_ERROR]: {
            title: 'Error del servidor',
            message: 'El servidor no esta disponible temporalmente. Intenta mas tarde.',
            action: 'retry',
            icon: 'server-outline'
        },
        [OAuthErrorCodes.GENERIC.UNKNOWN_ERROR]: {
            title: 'Error desconocido',
            message: 'Ocurrio un error inesperado. Por favor intenta de nuevo.',
            action: 'retry',
            icon: 'help-circle-outline'
        },
    },
};

// Mapeo de codigos de error nativos a nuestros codigos
export const mapNativeError = (provider, error) => {
    const errorCode = error?.code || error?.message || 'UNKNOWN_ERROR';

    if (provider === 'google') {
        // Mapeo de errores nativos de Google Sign-In
        switch (errorCode) {
            case 'SIGN_IN_CANCELLED':
            case -5:
                return OAuthErrorCodes.GOOGLE.SIGN_IN_CANCELLED;
            case 'IN_PROGRESS':
            case -4:
                return OAuthErrorCodes.GOOGLE.IN_PROGRESS;
            case 'PLAY_SERVICES_NOT_AVAILABLE':
            case -3:
                return OAuthErrorCodes.GOOGLE.PLAY_SERVICES_NOT_AVAILABLE;
            case 'SIGN_IN_REQUIRED':
            case -1:
                return OAuthErrorCodes.GOOGLE.SIGN_IN_REQUIRED;
            case 'INVALID_ACCOUNT':
            case -2:
                return OAuthErrorCodes.GOOGLE.INVALID_ACCOUNT;
            case 'NETWORK_ERROR':
                return OAuthErrorCodes.GOOGLE.NETWORK_ERROR;
            case 'TOKEN_EXPIRED':
                return OAuthErrorCodes.GOOGLE.TOKEN_EXPIRED;
            default:
                return OAuthErrorCodes.GOOGLE.INTERNAL_ERROR;
        }
    }

    if (provider === 'facebook') {
        // Mapeo de errores de Facebook SDK
        if (errorCode.includes('cancelled') || errorCode === 'CANCELLED') {
            return OAuthErrorCodes.FACEBOOK.CANCELLED;
        }
        if (errorCode.includes('network') || errorCode.includes('network_error')) {
            return OAuthErrorCodes.FACEBOOK.NETWORK_ERROR;
        }
        if (errorCode.includes('permission')) {
            return OAuthErrorCodes.FACEBOOK.PERMISSION_DENIED;
        }
        return OAuthErrorCodes.FACEBOOK.SESSION_EXPIRED;
    }

    return OAuthErrorCodes.GENERIC.UNKNOWN_ERROR;
};

// Obtener mensaje de error user-friendly
export const getErrorMessage = (provider, errorCode) => {
    const providerMessages = OAuthErrorMessages[provider.toUpperCase()] || OAuthErrorMessages.GENERIC;
    return providerMessages[errorCode] || OAuthErrorMessages.GENERIC[OAuthErrorCodes.GENERIC.UNKNOWN_ERROR];
};

// Estados de loading para UI
export const OAuthLoadingStates = {
    IDLE: 'idle',
    INITIALIZING: 'initializing',
    REQUESTING_PERMISSIONS: 'requesting_permissions',
    AUTHENTICATING: 'authenticating',
    SYNCING_WITH_BACKEND: 'syncing_with_backend',
    COMPLETING: 'completing',
    ERROR: 'error',
    SUCCESS: 'success',
};

// Mensajes de loading por estado
export const OAuthLoadingMessages = {
    [OAuthLoadingStates.IDLE]: '',
    [OAuthLoadingStates.INITIALIZING]: 'Preparando autenticacion...',
    [OAuthLoadingStates.REQUESTING_PERMISSIONS]: 'Solicitando permisos...',
    [OAuthLoadingStates.AUTHENTICATING]: 'Verificando identidad...',
    [OAuthLoadingStates.SYNCING_WITH_BACKEND]: 'Sincronizando cuenta...',
    [OAuthLoadingStates.COMPLETING]: 'Completando inicio de sesion...',
    [OAuthLoadingStates.ERROR]: 'Error en la autenticacion',
    [OAuthLoadingStates.SUCCESS]: 'Autenticacion exitosa',
};

/**
 * Clase principal del servicio OAuth
 */
class OAuthService {
    constructor() {
        this.BACKEND_URL = Config.BACKEND_URL;
        this.refreshTokens = {};
    }

    /**
     * Realiza login social y sincroniza con el backend
     * @param {string} provider - 'google', 'facebook', 'instagram'
     * @param {string} token - accessToken o idToken
     * @param {string} tokenType - 'accessToken' o 'idToken'
     * @param {function} onLoadingChange - callback para estados de loading
     * @returns {Promise<{success: boolean, user?: object, token?: string, isNewUser?: boolean, error?: object}>}
     */
    async socialLogin(provider, token, tokenType = 'accessToken', onLoadingChange = null) {
        try {
            this.setLoadingState(onLoadingChange, OAuthLoadingStates.AUTHENTICATING);

            const body = { provider };
            if (tokenType === 'idToken') {
                body.idToken = token;
            } else {
                body.accessToken = token;
            }

            console.log(`[OAuth] Enviando token de ${provider} al backend...`);

            this.setLoadingState(onLoadingChange, OAuthLoadingStates.SYNCING_WITH_BACKEND);

            const response = await fetch(`${this.BACKEND_URL}/auth/social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            // Manejar errores del backend
            if (!response.ok) {
                const errorCode = this.mapBackendError(provider, data.error);
                return {
                    success: false,
                    error: {
                        code: errorCode,
                        ...getErrorMessage(provider, errorCode)
                    }
                };
            }

            // Verificar si requiere 2FA
            if (data.requiresVerification) {
                return {
                    success: false,
                    requiresVerification: true,
                    email: data.user?.email
                };
            }

            // Guardar refresh token si viene
            if (data.refreshToken) {
                this.refreshTokens[provider] = data.refreshToken;
            }

            this.setLoadingState(onLoadingChange, OAuthLoadingStates.SUCCESS);

            return {
                success: true,
                user: data.user,
                token: data.token,
                isNewUser: data.isNewUser,
                refreshToken: data.refreshToken
            };

        } catch (error) {
            console.error(`[OAuth] Error en socialLogin:`, error);

            const errorCode = error.name === 'TypeError'
                ? OAuthErrorCodes.GENERIC.NETWORK_ERROR
                : OAuthErrorCodes.GENERIC.UNKNOWN_ERROR;

            this.setLoadingState(onLoadingChange, OAuthLoadingStates.ERROR);

            return {
                success: false,
                error: {
                    code: errorCode,
                    ...getErrorMessage('generic', errorCode)
                }
            };
        }
    }

    /**
     * Refresca el token de autenticacion
     * @param {string} provider - proveedor OAuth
     * @param {string} currentRefreshToken - refresh token almacenado
     * @returns {Promise<{success: boolean, token?: string, refreshToken?: string}>}
     */
    async refreshToken(provider, currentRefreshToken) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    refreshToken: currentRefreshToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error
                };
            }

            // Actualizar refresh token si viene uno nuevo
            if (data.refreshToken) {
                this.refreshTokens[provider] = data.refreshToken;
            }

            return {
                success: true,
                token: data.token,
                refreshToken: data.refreshToken
            };

        } catch (error) {
            console.error('[OAuth] Error refrescando token:', error);
            return {
                success: false,
                error: 'NETWORK_ERROR'
            };
        }
    }

    /**
     * Logout con revocacion de tokens OAuth
     * @param {string} provider - 'google', 'facebook', 'instagram', o 'all'
     * @param {string} oauthToken - token del proveedor (opcional)
     * @returns {Promise<{success: boolean}>}
     */
    async logout(provider = 'all', oauthToken = null) {
        try {
            // Revocar tokens OAuth con el proveedor
            if (oauthToken) {
                await this.revokeOAuthToken(provider, oauthToken);
            }

            // Notificar al backend del logout
            const response = await fetch(`${this.BACKEND_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            });

            // Limpiar tokens locales
            if (provider === 'all') {
                this.refreshTokens = {};
            } else {
                delete this.refreshTokens[provider];
            }

            return { success: response.ok };

        } catch (error) {
            console.error('[OAuth] Error en logout:', error);
            return { success: false };
        }
    }

    /**
     * Revoca el token OAuth con el proveedor
     * @param {string} provider
     * @param {string} token
     */
    async revokeOAuthToken(provider, token) {
        try {
            let revokeUrl;

            switch (provider.toLowerCase()) {
                case 'google':
                    revokeUrl = `https://oauth2.googleapis.com/revoke?token=${token}`;
                    break;
                case 'facebook':
                    revokeUrl = `https://graph.facebook.com/me/permissions?access_token=${token}`;
                    break;
                default:
                    console.log(`[OAuth] Revocacion no implementada para ${provider}`);
                    return;
            }

            const response = await fetch(revokeUrl, { method: 'POST' });
            console.log(`[OAuth] Token revocado para ${provider}:`, response.ok);

        } catch (error) {
            console.error(`[OAuth] Error revocando token de ${provider}:`, error);
        }
    }

    /**
     * Vincula una cuenta OAuth a un usuario existente
     * @param {string} userId - ID del usuario
     * @param {string} provider - proveedor OAuth
     * @param {string} token - token del proveedor
     * @param {string} tokenType - tipo de token
     * @returns {Promise<{success: boolean, error?: object}>}
     */
    async linkAccount(userId, provider, token, tokenType = 'accessToken') {
        try {
            const body = { userId, provider };
            if (tokenType === 'idToken') {
                body.idToken = token;
            } else {
                body.accessToken = token;
            }

            const response = await fetch(`${this.BACKEND_URL}/auth/link-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        code: data.code || 'LINK_ERROR',
                        message: data.error || 'No se pudo vincular la cuenta'
                    }
                };
            }

            return { success: true };

        } catch (error) {
            console.error('[OAuth] Error vinculando cuenta:', error);
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Error de conexion al vincular cuenta'
                }
            };
        }
    }

    /**
     * Desvincula una cuenta OAuth del usuario
     * @param {string} userId
     * @param {string} provider
     * @returns {Promise<{success: boolean}>}
     */
    async unlinkAccount(userId, provider) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/auth/unlink-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, provider })
            });

            return { success: response.ok };

        } catch (error) {
            console.error('[OAuth] Error desvinculando cuenta:', error);
            return { success: false };
        }
    }

    /**
     * Mapea errores del backend a codigos locales
     */
    mapBackendError(provider, errorMessage) {
        if (!errorMessage) return OAuthErrorCodes.GENERIC.UNKNOWN_ERROR;

        const lowerMessage = errorMessage.toLowerCase();

        if (lowerMessage.includes('token') && lowerMessage.includes('expir')) {
            return OAuthErrorCodes[provider.toUpperCase()]?.TOKEN_EXPIRED ||
                   OAuthErrorCodes[provider.toUpperCase()]?.SESSION_EXPIRED ||
                   OAuthErrorCodes.GENERIC.SERVER_ERROR;
        }

        if (lowerMessage.includes('invalid') || lowerMessage.includes('no valido')) {
            return OAuthErrorCodes[provider.toUpperCase()]?.INVALID_ACCOUNT ||
                   OAuthErrorCodes.GENERIC.SERVER_ERROR;
        }

        if (lowerMessage.includes('network') || lowerMessage.includes('conexion')) {
            return OAuthErrorCodes.GENERIC.NETWORK_ERROR;
        }

        if (lowerMessage.includes('permission') || lowerMessage.includes('permiso')) {
            return OAuthErrorCodes[provider.toUpperCase()]?.PERMISSION_DENIED ||
                   OAuthErrorCodes.GENERIC.UNKNOWN_ERROR;
        }

        return OAuthErrorCodes.GENERIC.SERVER_ERROR;
    }

    /**
     * Helper para setear estados de loading
     */
    setLoadingState(callback, state) {
        if (callback && typeof callback === 'function') {
            callback(state, OAuthLoadingMessages[state]);
        }
    }

    /**
     * Valida que el token OAuth sea valido
     * @param {string} provider
     * @param {string} token
     * @param {string} tokenType
     * @returns {Promise<{valid: boolean, userInfo?: object}>}
     */
    async validateOAuthToken(provider, token, tokenType = 'accessToken') {
        try {
            let validationUrl;
            let headers = {};

            switch (provider.toLowerCase()) {
                case 'google':
                    if (tokenType === 'idToken') {
                        // Validar ID token de Google
                        validationUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
                    } else {
                        validationUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`;
                    }
                    break;

                case 'facebook':
                    validationUrl = `https://graph.facebook.com/debug_token?input_token=${token}`;
                    break;

                default:
                    console.log('[OAuth] Validacion no implementada para', provider);
                    return { valid: true };
            }

            const response = await fetch(validationUrl, { headers });
            const data = await response.json();

            return {
                valid: response.ok && !data.error,
                userInfo: data
            };

        } catch (error) {
            console.error('[OAuth] Error validando token:', error);
            return { valid: false };
        }
    }
}

// Exportar instancia singleton
export const oAuthService = new OAuthService();

export default oAuthService;