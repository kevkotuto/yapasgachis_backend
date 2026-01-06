import rateLimit from 'express-rate-limit';
import config from '@/config';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: () => config.app.env === 'test',
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
    code: 'TOO_MANY_AUTH_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.app.env === 'test',
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    success: false,
    message: 'Limite d\'upload atteinte, veuillez réessayer plus tard',
    code: 'TOO_MANY_UPLOADS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Payment rate limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment attempts per hour
  message: {
    success: false,
    message: 'Limite de paiements atteinte, veuillez réessayer plus tard',
    code: 'TOO_MANY_PAYMENT_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});
