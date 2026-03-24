/**
 * Authentication Error Handler
 * Proporciona utilidades centralizadas para manejar errores de autenticacion
 * Devuelve mensajes en español consistentes y accesibles
 */

// Codigos de error de autenticacion
export const AUTH_ERROR_CODES = {
    // Errores de red
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_UNREACHABLE: 'SERVER_UNREACHABLE',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
    TIMEOUT: 'TIMEOUT',

    // Errores de validacion
    MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
    WEAK_PASSWORD: 'WEAK_PASSWORD',
    MISSING_FIELDS: 'MISSING_FIELDS',

    // Errores de autenticacion
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // Errores OAuth
    OAUTH_FAILED: 'OAUTH_FAILED',
    OAUTH_CANCELLED: 'OAUTH_CANCELLED',
    OAUTH_PERMISSION_DENIED: 'OAUTH_PERMISSION_DENIED',
    OAUTH_IN_PROGRESS: 'OAUTH_IN_PROGRESS',

    // Errores de 2FA
    VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
    INVALID_CODE: 'INVALID_CODE',
    CODE_EXPIRED: 'CODE_EXPIRED',
    CODE_RESEND_ERROR: 'CODE_RESEND_ERROR',

    // Errores del servidor
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NOT_FOUND: 'NOT_FOUND',
};

// Mensajes de error en español (user-friendly)
const ERROR_MESSAGES = {
    [AUTH_ERROR_CODES.NETWORK_ERROR]: {
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.SERVER_UNREACHABLE]: {
        title: 'Servidor No Disponible',
        message: 'El servidor no está disponible en este momento. Por favor, intenta más tarde.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.INVALID_RESPONSE]: {
        title: 'Error de Respuesta',
        message: 'El servidor devolvió datos inválidos. Por favor, intenta de nuevo.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.JSON_PARSE_ERROR]: {
        title: 'Error de Formato',
        message: 'La respuesta del servidor no es válida. Por favor, intenta de nuevo.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.TIMEOUT]: {
        title: 'Tiempo de Espera Agotado',
        message: 'La solicitud tardó demasiado. Por favor, verifica tu conexión e intenta de nuevo.',
        action: 'Reintentar',
    },

    [AUTH_ERROR_CODES.MISSING_CREDENTIALS]: {
        title: 'Campos Requeridos',
        message: 'Por favor, completa todos los campos obligatorios.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.INVALID_EMAIL]: {
        title: 'Email Inválido',
        message: 'Por favor, introduce un email válido (ej: usuario@ejemplo.com).',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.INVALID_PASSWORD]: {
        title: 'Contraseña Inválida',
        message: 'La contraseña no cumple con los requisitos de seguridad.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.PASSWORD_MISMATCH]: {
        title: 'Contraseñas No Coinciden',
        message: 'Las contraseñas ingresadas no coinciden. Por favor, verifica e intenta de nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.WEAK_PASSWORD]: {
        title: 'Contraseña Débil',
        message: 'La contraseña debe tener al menos 6 caracteres. Se recomienda usar mayúsculas, minúsculas y números.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.MISSING_FIELDS]: {
        title: 'Campos Faltantes',
        message: 'Por favor, completa todos los campos obligatorios para continuar.',
        action: 'Aceptar',
    },

    [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
        title: 'Credenciales Inválidas',
        message: 'El email o la contraseña no son correctos. Por favor, verifica e intenta de nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.USER_NOT_FOUND]: {
        title: 'Usuario No Encontrado',
        message: 'No existe una cuenta con este email. Por favor, verifica o crea una nueva cuenta.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED]: {
        title: 'Email Ya Registrado',
        message: 'Ya existe una cuenta con este email. Por favor, intenta con uno diferente o inicia sesión.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.INVALID_TOKEN]: {
        title: 'Token Inválido',
        message: 'Tu sesión no es válida. Por favor, inicia sesión de nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.TOKEN_EXPIRED]: {
        title: 'Sesión Expirada',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        action: 'Aceptar',
    },

    [AUTH_ERROR_CODES.OAUTH_FAILED]: {
        title: 'Error de Autenticación Social',
        message: 'No se pudo completar el inicio de sesión. Por favor, intenta de nuevo.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.OAUTH_CANCELLED]: {
        title: 'Autenticación Cancelada',
        message: 'Cancelaste el proceso de autenticación. Por favor, intenta de nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.OAUTH_PERMISSION_DENIED]: {
        title: 'Permisos No Concedidos',
        message: 'No se concedieron los permisos necesarios. Por favor, intenta de nuevo y acepta los permisos.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.OAUTH_IN_PROGRESS]: {
        title: 'Autenticación en Progreso',
        message: 'Ya hay una autenticación en progreso. Por favor, espera a que se complete.',
        action: 'Aceptar',
    },

    [AUTH_ERROR_CODES.VERIFICATION_REQUIRED]: {
        title: 'Verificación Requerida',
        message: 'Tu cuenta requiere verificación. Por favor, completa el proceso de autenticación de dos factores.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.INVALID_CODE]: {
        title: 'Código Inválido',
        message: 'El código de verificación no es válido. Por favor, verifica e intenta de nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.CODE_EXPIRED]: {
        title: 'Código Expirado',
        message: 'El código de verificación ha expirado. Por favor, solicita uno nuevo.',
        action: 'Aceptar',
    },
    [AUTH_ERROR_CODES.CODE_RESEND_ERROR]: {
        title: 'Error al Reenviar',
        message: 'No se pudo reenviar el código de verificación. Por favor, intenta de nuevo más tarde.',
        action: 'Reintentar',
    },

    [AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR]: {
        title: 'Error del Servidor',
        message: 'Ocurrió un error en el servidor. Por favor, intenta de nuevo más tarde.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.SERVICE_UNAVAILABLE]: {
        title: 'Servicio No Disponible',
        message: 'El servicio no está disponible en este momento. Por favor, intenta más tarde.',
        action: 'Reintentar',
    },
    [AUTH_ERROR_CODES.NOT_FOUND]: {
        title: 'Recurso No Encontrado',
        message: 'El servidor no encontró lo que solicitaste. Por favor, intenta de nuevo.',
        action: 'Aceptar',
    },
};

/**
 * Procesa errores de fetch y devuelve objeto estandarizado
 * @param {Error} error - Error de JavaScript
 * @param {Response} response - Response de fetch (opcional)
 * @param {object} responseData - Datos parseados de la respuesta (opcional)
 * @returns {object} { code, title, message, action, details }
 */
export function parseAuthError(error, response = null, responseData = null) {
    let code = AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR;
    let details = null;

    // Errores de red
    if (!error || error.message === 'Network request failed') {
        code = AUTH_ERROR_CODES.NETWORK_ERROR;
    } else if (error.message === 'Timeout') {
        code = AUTH_ERROR_CODES.TIMEOUT;
    } else if (response) {
        // Errores basados en status HTTP
        switch (response.status) {
            case 400:
                // Bad request - verificar el error del servidor
                if (responseData?.error?.includes('email')) {
                    code = AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED;
                } else if (responseData?.error?.includes('contraseña')) {
                    code = AUTH_ERROR_CODES.INVALID_PASSWORD;
                } else if (responseData?.error?.includes('Código')) {
                    code = AUTH_ERROR_CODES.INVALID_CODE;
                } else {
                    code = AUTH_ERROR_CODES.MISSING_FIELDS;
                }
                details = responseData?.error;
                break;
            case 401:
                // Unauthorized
                code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
                details = responseData?.error;
                break;
            case 404:
                code = AUTH_ERROR_CODES.NOT_FOUND;
                details = responseData?.error;
                break;
            case 500:
                code = AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR;
                details = responseData?.error;
                break;
            case 503:
                code = AUTH_ERROR_CODES.SERVICE_UNAVAILABLE;
                break;
            default:
                code = AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR;
                details = responseData?.error;
        }
    } else if (error.message?.includes('JSON')) {
        code = AUTH_ERROR_CODES.JSON_PARSE_ERROR;
    } else if (error.message?.includes('Network')) {
        code = AUTH_ERROR_CODES.NETWORK_ERROR;
    }

    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR];

    return {
        code,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
        details,
        serverError: responseData?.error, // Guardar el error original del servidor si existe
    };
}

/**
 * Valida un email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida una contraseña (minimo 6 caracteres)
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
    return password && password.length >= 6;
}

/**
 * Obtiene un mensaje de error estandarizado
 * @param {string} code - Error code
 * @returns {object} { title, message, action }
 */
export function getErrorMessage(code) {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR];
}

/**
 * Mapea errores especificos de OAuth
 * @param {string} provider
 * @param {string} error
 * @returns {string} - Error code
 */
export function mapOAuthError(provider, error) {
    const errorStr = error?.toString?.() || error || '';

    if (errorStr.includes('cancelled') || errorStr.includes('user cancelled')) {
        return AUTH_ERROR_CODES.OAUTH_CANCELLED;
    }
    if (errorStr.includes('permission') || errorStr.includes('denied')) {
        return AUTH_ERROR_CODES.OAUTH_PERMISSION_DENIED;
    }
    if (errorStr.includes('in progress')) {
        return AUTH_ERROR_CODES.OAUTH_IN_PROGRESS;
    }
    if (errorStr.includes('network') || errorStr.includes('Network')) {
        return AUTH_ERROR_CODES.NETWORK_ERROR;
    }

    return AUTH_ERROR_CODES.OAUTH_FAILED;
}

export default {
    AUTH_ERROR_CODES,
    parseAuthError,
    isValidEmail,
    isValidPassword,
    getErrorMessage,
    mapOAuthError,
};
