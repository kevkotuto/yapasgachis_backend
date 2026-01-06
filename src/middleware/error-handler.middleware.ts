import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { APP_CONSTANTS } from '@/utils/constants';
import { logError } from '@/infrastructure/monitoring/logger';
import { captureException } from '@/infrastructure/monitoring/sentry';
import { formatValidationErrors } from '@/utils/validators';

export class AppError extends Error {
  public override readonly message: string;

  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(APP_CONSTANTS.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Erreur de validation',
      code: APP_CONSTANTS.ERROR_CODES.VALIDATION_ERROR,
      errors: formatValidationErrors(err),
    });
    return;
  }

  // Application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;

    if (prismaErr.code === 'P2002') {
      res.status(APP_CONSTANTS.HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Cette ressource existe déjà',
        code: APP_CONSTANTS.ERROR_CODES.CONFLICT,
      });
      return;
    }

    if (prismaErr.code === 'P2025') {
      res.status(APP_CONSTANTS.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Ressource non trouvée',
        code: APP_CONSTANTS.ERROR_CODES.NOT_FOUND,
      });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token invalide',
      code: APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN,
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token expiré',
      code: APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED,
    });
    return;
  }

  // Capture unexpected errors in Sentry
  captureException(err, {
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
  });

  // Default error response
  res.status(APP_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Une erreur interne est survenue'
        : err.message,
    code: APP_CONSTANTS.ERROR_CODES.INTERNAL_ERROR,
  });
};

// Not found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(APP_CONSTANTS.HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.url} non trouvée`,
    code: APP_CONSTANTS.ERROR_CODES.NOT_FOUND,
  });
};

// Async handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
