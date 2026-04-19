/**
 * Rate Limiting Middleware
 * Protects against DoS and abuse
 */

const rateLimit = require('express-rate-limit');

// SECURITY FIX: Global rate limiter - 100 requests per 15 minutes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests per window
    message: {
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,      // Return RateLimit-* headers
    legacyHeaders: false,       // Disable X-RateLimit-* headers
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/';
    },
    keyGenerator: (req, res) => {
        // Use real IP (behind proxy)
        return req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        console.warn(`[SECURITY] Global rate limit exceeded from IP: ${req.ip}`);
        res.status(429).json({
            error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.floor(Date.now() / 1000)
        });
    }
});

// Chat API limiter - prevent abuse of AI calls
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 30,                     // 30 messages/min
    message: { error: 'Límite de chat alcanzado. Espera un momento.' },
    skip: (req) => process.env.NODE_ENV === 'test',
    keyGenerator: (req) => req.user?.id || req.ip
});

// Activity API limiter
const activityLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 20,                     // 20 activities/min
    message: { error: 'Límite de actividades alcanzado' },
    keyGenerator: (req) => req.user?.id || req.ip
});

// Payment limiter - strict
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,    // 1 hour
    max: 10,                     // 10 payment attempts/hour
    message: { error: 'Límite de pagos alcanzado. Intenta después.' },
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
        console.warn(`[SECURITY] Payment rate limit exceeded for user: ${req.user?.id || req.ip}`);
        res.status(429).json({
            error: 'Límite de intentos de pago alcanzado'
        });
    }
});

// Community (posts/comments) limiter
const communityLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 5,                      // 5 posts/comments per minute
    message: { error: 'Espera un momento antes de publicar de nuevo' },
    keyGenerator: (req) => req.user?.id || req.ip
});

module.exports = {
    globalLimiter,
    chatLimiter,
    activityLimiter,
    paymentLimiter,
    communityLimiter
};
