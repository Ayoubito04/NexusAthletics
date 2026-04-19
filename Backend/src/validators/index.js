/**
 * Input Validation Middleware Factory
 * Uses express-validator for consistent input validation across all routes
 */

const { validationResult } = require('express-validator');

// SECURITY FIX: Centralized request validation error handler
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Log suspicious validation failures
        if (errors.array().some(e => e.msg.includes('XSS') || e.msg.includes('injection'))) {
            console.warn(`[SECURITY] Potential injection attack from IP: ${req.ip}, Path: ${req.path}`);
        }

        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({
                field: e.param,
                message: e.msg,
                value: process.env.NODE_ENV === 'production' ? '[redacted]' : e.value
            }))
        });
    }

    next();
};

module.exports = { validateRequest };
