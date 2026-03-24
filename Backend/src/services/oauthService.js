/**
 * OAuth Service - Backend
 * Maneja la logica de negocio para autenticacion OAuth
 * Incluye: validacion de tokens, refresh, revocacion, account linking
 */

const axios = require('axios');
const { prisma } = require('../config/prisma');

// URLs de validacion/revocacion por proveedor
const OAUTH_ENDPOINTS = {
    google: {
        validateIdToken: 'https://oauth2.googleapis.com/tokeninfo',
        validateAccessToken: 'https://www.googleapis.com/oauth2/v3/userinfo',
        revoke: 'https://oauth2.googleapis.com/revoke',
        refresh: 'https://oauth2.googleapis.com/token',
    },
    facebook: {
        validate: 'https://graph.facebook.com/debug_token',
        revoke: 'https://graph.facebook.com/me/permissions',
        refresh: 'https://graph.facebook.com/oauth/access_token',
    },
    instagram: {
        // Instagram usa el Graph API de Facebook
        validate: 'https://graph.instagram.com/me',
        refresh: 'https://graph.facebook.com/oauth/access_token',
    }
};

// Codigos de error especificos por proveedor
const OAUTH_ERRORS = {
    google: {
        INVALID_TOKEN: 'TOKEN_INVALIDO',
        EXPIRED_TOKEN: 'TOKEN_EXPIRADO',
        NETWORK_ERROR: 'ERROR_RED',
        RATE_LIMIT: 'LIMITE_EXCEDIDO',
    },
    facebook: {
        INVALID_TOKEN: 'TOKEN_INVALIDO',
        EXPIRED_TOKEN: 'TOKEN_EXPIRADO',
        APP_NOT_AUTHORIZED: 'APP_NO_AUTORIZADA',
        USER_NOT_AUTHORIZED: 'USUARIO_NO_AUTORIZADO',
    },
    instagram: {
        INVALID_TOKEN: 'TOKEN_INVALIDO',
        PERMISSION_DENIED: 'PERMISO_DENEGADO',
    },
    generic: {
        UNKNOWN_ERROR: 'ERROR_DESCONOCIDO',
        PROVIDER_NOT_SUPPORTED: 'PROVEEDOR_NO_SOPORTADO',
    }
};

// Mensajes de error en espanol para el usuario
const ERROR_MESSAGES = {
    TOKEN_INVALIDO: 'El token de autenticacion no es valido',
    TOKEN_EXPIRADO: 'Tu sesion ha expirado. Por favor, inicia sesion de nuevo',
    ERROR_RED: 'No se pudo conectar con el proveedor. Verifica tu conexion',
    LIMITE_EXCEDIDO: 'Has excedido el limite de intentos. Intenta mas tarde',
    APP_NO_AUTORIZADA: 'La aplicacion no esta autorizada para usar este metodo',
    USUARIO_NO_AUTORIZADO: 'No tienes permiso para acceder',
    PERMISO_DENEGADO: 'No otorgaste los permisos necesarios',
    ERROR_DESCONOCIDO: 'Ocurrio un error inesperado',
    PROVEEDOR_NO_SOPORTADO: 'Este metodo de inicio de sesion no esta disponible',
    CUENTA_YA_VINCULADA: 'Esta cuenta ya esta vinculada a otro usuario',
    USUARIO_NO_ENCONTRADO: 'Usuario no encontrado',
};

class OAuthService {

    /**
     * Valida un token OAuth con el proveedor
     * @param {string} provider - 'google', 'facebook', 'instagram'
     * @param {string} token - accessToken o idToken
     * @param {string} tokenType - 'idToken' o 'accessToken'
     * @returns {Promise<{valid: boolean, userData?: object, error?: string}>}
     */
    async validateToken(provider, token, tokenType = 'accessToken') {
        try {
            let userData = null;

            switch (provider) {
                case 'google':
                    userData = await this.validateGoogleToken(token, tokenType);
                    break;
                case 'facebook':
                    userData = await this.validateFacebookToken(token);
                    break;
                case 'instagram':
                    userData = await this.validateInstagramToken(token);
                    break;
                default:
                    return {
                        valid: false,
                        error: OAUTH_ERRORS.generic.PROVIDER_NOT_SUPPORTED
                    };
            }

            return { valid: true, userData };

        } catch (error) {
            console.error(`[OAuth] Error validando token de ${provider}:`, error.message);
            return {
                valid: false,
                error: this.mapError(provider, error)
            };
        }
    }

    /**
     * Valida token de Google
     */
    async validateGoogleToken(token, tokenType) {
        const url = tokenType === 'idToken'
            ? `${OAUTH_ENDPOINTS.google.validateIdToken}?id_token=${token}`
            : OAUTH_ENDPOINTS.google.validateAccessToken;

        const headers = tokenType === 'accessToken'
            ? { Authorization: `Bearer ${token}` }
            : {};

        const response = await axios.get(url, { headers });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        const data = response.data;
        return {
            id: data.sub,
            email: data.email,
            emailVerified: data.email_verified,
            nombre: data.given_name || data.name?.split(' ')[0],
            apellido: data.family_name || data.name?.split(' ').slice(1).join(' '),
            avatar: data.picture,
            locale: data.locale,
        };
    }

    /**
     * Valida token de Facebook
     */
    async validateFacebookToken(token) {
        // Obtener info del usuario directamente
        const response = await axios.get(
            `https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=${token}`
        );

        if (response.data.error) {
            throw new Error(response.data.error.message);
        }

        const data = response.data;
        return {
            id: data.id,
            email: data.email,
            nombre: data.first_name,
            apellido: data.last_name,
            avatar: data.picture?.data?.url,
        };
    }

    /**
     * Valida token de Instagram
     */
    async validateInstagramToken(token) {
        const response = await axios.get(
            `${OAUTH_ENDPOINTS.instagram.validate}?fields=id,username&access_token=${token}`
        );

        if (response.data.error) {
            throw new Error(response.data.error.message);
        }

        const data = response.data;
        return {
            id: data.id,
            username: data.username,
            email: `${data.username}@instagram.com`, // Instagram no proporciona email directamente
        };
    }

    /**
     * Guarda o actualiza el token OAuth del usuario
     */
    async saveOAuthToken(userId, provider, accessToken, refreshToken = null, expiresIn = null, providerId = null) {
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

        return await prisma.oAuthToken.upsert({
            where: {
                userId_provider: { userId, provider }
            },
            update: {
                accessToken,
                refreshToken,
                expiresAt,
                providerId,
                updatedAt: new Date(),
            },
            create: {
                userId,
                provider,
                accessToken,
                refreshToken,
                expiresAt,
                providerId,
            }
        });
    }

    /**
     * Obtiene un token OAuth valido para el usuario
     */
    async getValidOAuthToken(userId, provider) {
        const token = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider } }
        });

        if (!token) {
            return null;
        }

        // Verificar si el token expiro
        if (token.expiresAt && token.expiresAt < new Date()) {
            // Intentar refrescar el token
            if (token.refreshToken) {
                const refreshed = await this.refreshOAuthToken(provider, token.refreshToken);
                if (refreshed) {
                    await this.saveOAuthToken(
                        userId,
                        provider,
                        refreshed.accessToken,
                        refreshed.refreshToken,
                        refreshed.expiresIn,
                        token.providerId
                    );
                    return {
                        ...token,
                        accessToken: refreshed.accessToken,
                    };
                }
            }
            return null;
        }

        return token;
    }

    /**
     * Refresca un token OAuth con el proveedor
     */
    async refreshOAuthToken(provider, refreshToken) {
        try {
            switch (provider) {
                case 'google':
                    return await this.refreshGoogleToken(refreshToken);
                case 'facebook':
                    return await this.refreshFacebookToken(refreshToken);
                default:
                    return null;
            }
        } catch (error) {
            console.error(`[OAuth] Error refrescando token de ${provider}:`, error.message);
            return null;
        }
    }

    /**
     * Refresca token de Google (requiere client_id y client_secret)
     */
    async refreshGoogleToken(refreshToken) {
        // Nota: Requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.warn('[OAuth] Google client credentials not configured');
            return null;
        }

        const response = await axios.post(OAUTH_ENDPOINTS.google.refresh, {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken,
            expiresIn: response.data.expires_in,
        };
    }

    /**
     * Refresca token de Facebook
     */
    async refreshFacebookToken(refreshToken) {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
            console.warn('[OAuth] Facebook app credentials not configured');
            return null;
        }

        const response = await axios.get(`${OAUTH_ENDPOINTS.facebook.refresh}`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: refreshToken,
            }
        });

        return {
            accessToken: response.data.access_token,
            expiresIn: response.data.expires_in,
        };
    }

    /**
     * Revoca un token OAuth con el proveedor
     */
    async revokeOAuthToken(provider, token) {
        try {
            switch (provider) {
                case 'google':
                    await axios.post(`${OAUTH_ENDPOINTS.google.revoke}?token=${token}`);
                    break;
                case 'facebook':
                    await axios.delete(`${OAUTH_ENDPOINTS.facebook.revoke}?access_token=${token}`);
                    break;
                default:
                    console.log(`[OAuth] Revocation not implemented for ${provider}`);
                    return false;
            }

            // Eliminar token de la base de datos
            await prisma.oAuthToken.deleteMany({
                where: { provider, accessToken: token }
            });

            return true;
        } catch (error) {
            console.error(`[OAuth] Error revoking ${provider} token:`, error.message);
            return false;
        }
    }

    /**
     * Vincula una cuenta OAuth a un usuario existente
     */
    async linkAccount(userId, provider, providerId, accessToken = null, refreshToken = null) {
        try {
            // Verificar que el providerId no este vinculado a otro usuario
            const existingUser = await prisma.user.findFirst({
                where: {
                    [`${provider}Id`]: providerId,
                    NOT: { id: userId }
                }
            });

            if (existingUser) {
                return {
                    success: false,
                    error: 'CUENTA_YA_VINCULADA',
                    message: ERROR_MESSAGES.CUENTA_YA_VINCULADA
                };
            }

            // Actualizar el usuario con el ID del proveedor
            const updateData = { [`${provider}Id`]: providerId };

            await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            // Guardar token OAuth
            if (accessToken) {
                await this.saveOAuthToken(userId, provider, accessToken, refreshToken, null, providerId);
            }

            // Registrar en el log
            await this.logAuthAction(userId, 'account_link', provider, true);

            return { success: true };

        } catch (error) {
            console.error(`[OAuth] Error linking ${provider} account:`, error.message);
            return {
                success: false,
                error: 'ERROR_DESCONOCIDO',
                message: ERROR_MESSAGES.ERROR_DESCONOCIDO
            };
        }
    }

    /**
     * Desvincula una cuenta OAuth de un usuario
     */
    async unlinkAccount(userId, provider) {
        try {
            // Verificar que el usuario tenga password o al menos otro metodo de login
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return {
                    success: false,
                    error: 'USUARIO_NO_ENCONTRADO'
                };
            }

            // No permitir desvincular si no hay password y es el unico metodo
            const linkedProviders = ['googleId', 'facebookId', 'instagramId', 'twitterId']
                .filter(key => user[key] !== null);

            if (!user.password && linkedProviders.length <= 1 && user[`${provider}Id`]) {
                return {
                    success: false,
                    error: 'ULTIMO_METODO',
                    message: 'No puedes desvincular el ultimo metodo de inicio de sesion'
                };
            }

            // Eliminar ID del proveedor
            await prisma.user.update({
                where: { id: userId },
                data: { [`${provider}Id`]: null }
            });

            // Eliminar tokens
            await prisma.oAuthToken.deleteMany({
                where: { userId, provider }
            });

            await this.logAuthAction(userId, 'account_unlink', provider, true);

            return { success: true };

        } catch (error) {
            console.error(`[OAuth] Error unlinking ${provider} account:`, error.message);
            return {
                success: false,
                error: 'ERROR_DESCONOCIDO'
            };
        }
    }

    /**
     * Registra una accion de autenticacion en el log
     */
    async logAuthAction(userId, action, provider, success, errorMessage = null, req = null) {
        try {
            await prisma.authLog.create({
                data: {
                    userId,
                    action,
                    provider,
                    success,
                    errorMessage,
                    ipAddress: req?.ip,
                    userAgent: req?.headers?.['user-agent'],
                }
            });
        } catch (error) {
            console.error('[OAuth] Error logging auth action:', error.message);
        }
    }

    /**
     * Mapea errores del proveedor a codigos internos
     */
    mapError(provider, error) {
        const message = error.response?.data?.error?.message || error.message;

        // Errores comunes
        if (message.includes('invalid') || message.includes('Invalid')) {
            return OAUTH_ERRORS[provider]?.INVALID_TOKEN || OAUTH_ERRORS.generic.UNKNOWN_ERROR;
        }
        if (message.includes('expired') || message.includes('Expired')) {
            return OAUTH_ERRORS[provider]?.EXPIRED_TOKEN || OAUTH_ERRORS.generic.UNKNOWN_ERROR;
        }
        if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
            return OAUTH_ERRORS[provider]?.NETWORK_ERROR || OAUTH_ERRORS.generic.UNKNOWN_ERROR;
        }
        if (message.includes('rate limit') || message.includes('quota')) {
            return OAUTH_ERRORS[provider]?.RATE_LIMIT || OAUTH_ERRORS.generic.UNKNOWN_ERROR;
        }

        return OAUTH_ERRORS.generic.UNKNOWN_ERROR;
    }

    /**
     * Obtiene el mensaje de error en espanol
     */
    getErrorMessage(errorCode) {
        return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.ERROR_DESCONOCIDO;
    }
}

module.exports = new OAuthService();