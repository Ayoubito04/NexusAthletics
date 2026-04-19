'use strict';

const jwt = require('jsonwebtoken');

// SECURITY: Use JWT_SECRET from env, fail if not set (validated by validateEnv.js)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured - check validateEnv.js');
}

/**
 * Middleware to verify JWT token from Authorization header
 * Expected format: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: "No autorizado. Token falta.",
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
        if (err) {
            // SECURITY: Log details internally, don't expose in response
            console.warn(`[SECURITY] JWT verification failed: ${err.name} - ${err.message}`);
            return res.status(403).json({
                error: "Token inválido o expirado",
                code: 'INVALID_TOKEN'
            });
        }

        // SECURITY: Ensure required fields exist in token payload
        if (!user.id || !user.email) {
            console.warn('[SECURITY] JWT payload missing required fields (id, email)');
            return res.status(403).json({
                error: "Token inválido",
                code: 'INVALID_TOKEN'
            });
        }

        req.user = user;
        next();
    });
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: "No autorizado",
            code: 'NO_AUTH'
        });
    }

    if (req.user.role === 'ADMIN') {
        next();
    } else {
        console.warn(`[SECURITY] Unauthorized admin access attempt by user: ${req.user.id}`);
        res.status(403).json({
            error: "Acceso denegado. Se requiere ser administrador.",
            code: 'INSUFFICIENT_PRIVILEGES'
        });
    }
};

module.exports = { authenticateToken, isAdmin };
