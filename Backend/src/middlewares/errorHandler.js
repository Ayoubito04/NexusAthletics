/**
 * Global Error Handling Middleware
 * MUST be the last middleware registered in Express
 */

const errorHandler = (err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // SECURITY FIX: Never expose internal errors in production
    const statusCode = err.status || err.statusCode || 500;
    const message = isDev ? err.message : 'Internal server error';

    // SECURITY FIX: Log full details internally
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id || null,
        statusCode,
        message: err.message,
        ...(isDev && { stack: err.stack })
    };

    console.error('[ERROR]', JSON.stringify(logEntry));

    // SECURITY FIX: Prevent double-sending response
    if (res.headersSent) {
        return next(err);
    }

    // Return consistent error format
    res.status(statusCode).json({
        error: message,
        code: err.code || 'INTERNAL_ERROR',
        ...(isDev && { stack: err.stack.split('\n') })  // Stack as array for easier parsing
    });
};

module.exports = errorHandler;
