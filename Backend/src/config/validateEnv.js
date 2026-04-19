/**
 * Environment Variable Validation
 * Fail-fast if critical config is missing or weak
 * Must be called at application startup BEFORE any other initialization
 */

function validateEnv() {
    const errors = [];
    const warnings = [];

    // ============================================================
    // CRÍTICOS - Sin estos, la app NO puede arrancar
    // ============================================================
    const required = [
        'DATABASE_URL',
        'DIRECT_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'PORT'
    ];

    required.forEach(key => {
        if (!process.env[key]) {
            errors.push(`CRÍTICO: Variable de entorno ${key} falta`);
        }
    });

    // JWT_SECRET debe tener mínimo 64 caracteres
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
        errors.push('CRÍTICO: JWT_SECRET debe tener al menos 64 caracteres');
    }

    // JWT_REFRESH_SECRET debe tener mínimo 64 caracteres
    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 64) {
        errors.push('CRÍTICO: JWT_REFRESH_SECRET debe tener al menos 64 caracteres');
    }

    // DATABASE_URL debe ser válida
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
        errors.push('CRÍTICO: DATABASE_URL debe ser una conexión PostgreSQL válida');
    }

    // ============================================================
    // ADVERTENCIAS - La app puede arrancar pero sin ciertas features
    // ============================================================
    const conditional = {
        'GEMINI_API_KEY': 'AI features deshabilitados',
        'OPENAI_API_KEY': 'Voice features deshabilitados',
        'STRIPE_SECRET_KEY': 'Pagos Stripe deshabilitados',
        'PAYPAL_CLIENT_ID': 'Pagos PayPal deshabilitados',
        'RESEND_API_KEY': 'Email verification deshabilitado',
        'CLOUDINARY_API_KEY': 'Image upload deshabilitado',
        'GOOGLE_CLIENT_ID': 'Google OAuth deshabilitado'
    };

    Object.entries(conditional).forEach(([key, msg]) => {
        if (!process.env[key]) {
            warnings.push(`⚠️ ${key} no está configurado - ${msg}`);
        }
    });

    // ============================================================
    // ALERTAS DE SEGURIDAD
    // ============================================================
    if (process.env.NODE_ENV !== 'production') {
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 100) {
            warnings.push('⚠️ JWT_SECRET podría ser más largo para desarrollo');
        }
    }

    // En producción, verificar que no haya valores por defecto/de desarrollo
    if (process.env.NODE_ENV === 'production') {
        const devPatterns = ['localhost', 'test', '127.0.0.1', 'dev.', ':3000'];

        if (process.env.DATABASE_URL && devPatterns.some(p => process.env.DATABASE_URL.includes(p))) {
            errors.push('CRÍTICO: DATABASE_URL parece ser de desarrollo. No deberías usar localhost en producción.');
        }

        if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
            warnings.push('⚠️ Stripe está usando clave de TEST en producción. Cambia a sk_live_');
        }
    }

    // ============================================================
    // MOSTRAR ERRORES Y ADVERTENCIAS
    // ============================================================
    if (errors.length > 0) {
        console.error(
            '\n' +
            '████████████████████████████████████████████████████████\n' +
            '❌ ERROR DE CONFIGURACIÓN - ARRANCANDO CON ERRORES\n' +
            '████████████████████████████████████████████████████████\n'
        );

        errors.forEach((error, i) => {
            console.error(`${i + 1}. ${error}`);
        });

        console.error(
            '\n' +
            'CÓMO ARREGLARLO:\n' +
            '1. Copia Backend/.env.example a Backend/.env\n' +
            '2. Reemplaza los valores con tus configuraciones reales\n' +
            '3. NUNCA comitas Backend/.env al repositorio\n' +
            '4. En producción, inyecta las variables desde el sistema operativo\n' +
            '\n' +
            'Para generar secretos seguros:\n' +
            '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
            '\n' +
            '████████████████████████████████████████████████████████\n'
        );

        process.exit(1);
    }

    if (warnings.length > 0) {
        console.warn(
            '\n' +
            '⚠️ ADVERTENCIAS DE CONFIGURACIÓN:\n'
        );
        warnings.forEach(warning => {
            console.warn(`  ${warning}`);
        });
        console.warn('');
    }

    // ============================================================
    // CONFIGURACIONES ESPECIALES POR ENTORNO
    // ============================================================
    if (process.env.NODE_ENV === 'production') {
        console.log('✅ Modo PRODUCCIÓN activado');

        if (!process.env.FRONTEND_URL) {
            console.warn('⚠️ FRONTEND_URL no está configurado. CORS solo permitirá origins en la whitelist de código.');
        }
    } else if (process.env.NODE_ENV === 'development') {
        console.log('✅ Modo DESARROLLO activado');
        console.log('ℹ️ Rate limiting está deshabilitado para development');
    }

    console.log('✅ Variables de entorno validadas correctamente\n');
}

module.exports = validateEnv;
