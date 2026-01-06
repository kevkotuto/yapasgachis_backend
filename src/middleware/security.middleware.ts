import * as crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import logger from '@/infrastructure/monitoring/logger';

/**
 * CSRF Token validation middleware
 * Generates and validates CSRF tokens for state-changing requests
 */

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const CSRF_SECRET =
  process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths excluded from CSRF protection (webhooks, etc.)
const EXCLUDED_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh-token',
  '/api/v1/auth/google',
  '/api/v1/webhooks/',
  '/health',
];

/**
 * Generate a CSRF token
 */
export const generateCsrfToken = (sessionId: string): string => {
  const timestamp = Date.now().toString();
  const data = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
  return Buffer.from(`${data}:${signature}`).toString('base64');
};

/**
 * Validate a CSRF token
 */
export const validateCsrfToken = (
  token: string,
  sessionId: string
): boolean => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [storedSessionId, timestamp, signature] = decoded.split(':');

    // Verify session ID matches
    if (storedSessionId !== sessionId) {
      return false;
    }

    // Verify token is not expired (1 hour)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 3600000) {
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(`${storedSessionId}:${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
};

/**
 * CSRF Protection Middleware
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip for excluded paths
  if (EXCLUDED_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Skip for non-protected methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  // Get session ID (use user ID or a session cookie)
  const sessionId = req.user?.id || req.cookies?.session_id || req.ip;

  // Get CSRF token from header
  const token = req.headers[CSRF_HEADER] as string;

  if (!token || !validateCsrfToken(token, sessionId)) {
    logger.warn('CSRF validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};

/**
 * Generate CSRF token endpoint middleware
 */
export const csrfTokenGenerator = (req: Request, res: Response): void => {
  const sessionId = req.user?.id || req.cookies?.session_id || req.ip;
  const token = generateCsrfToken(sessionId);

  res.json({
    success: true,
    data: { csrfToken: token },
  });
};

/**
 * Security headers middleware (extends Helmet)
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(self)'
  );

  // Remove X-Powered-By
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Request sanitization middleware
 * Sanitizes request body, query, and params to prevent injection attacks
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential script tags and dangerous patterns
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .trim();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string'
            ? item
                .replace(
                  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                  ''
                )
                .trim()
            : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(
      req.query as Record<string, unknown>
    ) as typeof req.query;
  }

  next();
};

/**
 * Request size limiter for specific routes
 */
export const requestSizeLimiter = (maxSizeKB: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = maxSizeKB * 1024;

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        message: `Request size exceeds limit of ${maxSizeKB}KB`,
      });
      return;
    }

    next();
  };
};

/**
 * SQL Injection pattern detector (for logging/monitoring)
 */
export const sqlInjectionDetector = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /(;\s*--)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(UNION\s+SELECT)/i,
  ];

  const checkValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some((pattern) => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const suspicious =
    checkValue(req.body) || checkValue(req.query) || checkValue(req.params);

  if (suspicious) {
    logger.warn('Potential SQL injection attempt detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
    // Don't block, just log - let Prisma handle parameterized queries
  }

  next();
};

export default {
  csrfProtection,
  csrfTokenGenerator,
  securityHeaders,
  sanitizeRequest,
  requestSizeLimiter,
  sqlInjectionDetector,
  generateCsrfToken,
  validateCsrfToken,
};
