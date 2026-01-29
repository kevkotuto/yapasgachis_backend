import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import config from '@/config';

const isDevelopment = config.app.env === 'development';

// General API rate limiter - Modéré pour opérations générales
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 1000 : config.rateLimit.maxRequests, // 1000 en dev, 100 en prod
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Read-only endpoints rate limiter - Très permissif pour les lectures (GET)
export const readLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 2000 : 500, // 2000 en dev, 500 en prod (GET requests)
  message: {
    success: false,
    message: 'Trop de requêtes de lecture, veuillez réessayer plus tard',
    code: 'TOO_MANY_READ_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Write endpoints rate limiter - Plus strict pour les écritures (POST, PUT, DELETE)
export const writeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 500 : 100, // 500 en dev, 100 en prod (POST/PUT/DELETE)
  message: {
    success: false,
    message: "Trop de requêtes d'écriture, veuillez réessayer plus tard",
    code: 'TOO_MANY_WRITE_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDevelopment ? 50 : config.rateLimit.authMaxRequests, // 50 en dev, 5 en prod
  message: {
    success: false,
    message:
      'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
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
  max: isDevelopment ? 100 : 10, // 100 en dev, 10 en prod
  message: {
    success: false,
    message: "Limite d'upload atteinte, veuillez réessayer plus tard",
    code: 'TOO_MANY_UPLOADS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Payment rate limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 200 : 20, // 200 en dev, 20 en prod
  message: {
    success: false,
    message: 'Limite de paiements atteinte, veuillez réessayer plus tard',
    code: 'TOO_MANY_PAYMENT_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.app.env === 'test',
});

// Smart rate limiter - Applique automatiquement le bon limiter selon la méthode HTTP
export const smartLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // GET, HEAD, OPTIONS = read operations
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return readLimiter(req, res, next);
  }

  // POST, PUT, PATCH, DELETE = write operations
  return writeLimiter(req, res, next);
};
