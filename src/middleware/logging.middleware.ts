import { Request, Response, NextFunction } from 'express';

import { logHttpRequest } from '@/infrastructure/monitoring/logger';

/**
 * Sanitize request body to remove sensitive fields
 */
const sanitizeBody = (body: any): Record<string, unknown> => {
  if (!body || typeof body !== 'object') return {};

  const sensitiveFields = [
    'password',
    'newPassword',
    'oldPassword',
    'currentPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cvv',
    'pin',
    'otp',
  ];

  const sanitized = { ...body };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture original send to intercept response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id;
    const statusCode = res.statusCode;

    // Parse response body if it's JSON
    let error: string | undefined;
    let validationErrors: unknown;

    if (responseBody) {
      try {
        const parsedBody =
          typeof responseBody === 'string'
            ? JSON.parse(responseBody)
            : responseBody;

        if (!parsedBody.success) {
          error = parsedBody.message;
          validationErrors = parsedBody.errors;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Log HTTP request with full details
    logHttpRequest({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress || '',
      userId,
      statusCode,
      duration,
      body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
      query:
        req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
      error,
      validationErrors,
    });

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(
        `⚠️  Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`
      );
    }
  });

  next();
};
