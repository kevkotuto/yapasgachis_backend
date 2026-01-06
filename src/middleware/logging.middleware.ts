import { Request, Response, NextFunction } from 'express';
import { logHttpRequest } from '@/infrastructure/monitoring/logger';

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id;

    logHttpRequest({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress || '',
      userId,
    });

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
};
