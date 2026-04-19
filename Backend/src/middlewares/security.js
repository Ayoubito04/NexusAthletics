'use strict';

/**
 * Centralized Security Middleware
 * Combines Helmet (headers), CORS, and Rate Limiting
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ============================================================
// CORS CONFIGURATION
// ============================================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:19006',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:19006'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// ============================================================
// HELMET CONFIGURATION
// ============================================================
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
});

// ============================================================
// RATE LIMITERS
// ============================================================

// Global rate limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  },
  handler: (req, res) => {
    console.warn(`[SECURITY] Global rate limit exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.floor(Date.now() / 1000)
    });
  }
});

// Auth rate limiter: 5 login/register attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  skip: (req) => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    console.warn(`[SECURITY] Auth rate limit exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.floor(Date.now() / 1000)
    });
  }
});

// Payment rate limiter: 10 payment attempts per hour per user
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment attempts, please try again later.' },
  skip: (req) => process.env.NODE_ENV === 'test',
  // Rate limit by user ID if authenticated, otherwise by IP (handled automatically)
  keyGenerator: (req) => req.user?.id ? `user_${req.user.id}` : undefined,
  handler: (req, res) => {
    const identifier = req.user?.id ? `user ${req.user.id}` : req.ip;
    console.warn(`[SECURITY] Payment rate limit exceeded for: ${identifier}`);
    res.status(429).json({
      error: 'Too many payment attempts, please try again later.'
    });
  }
});

module.exports = {
  helmetConfig,
  corsOptions: cors(corsOptions),
  globalLimiter,
  authLimiter,
  paymentLimiter
};
