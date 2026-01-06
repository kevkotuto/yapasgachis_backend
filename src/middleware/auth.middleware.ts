import { Request, Response, NextFunction } from 'express';

import JWTService from '@/core/services/jwt.service';
import { AppError } from './error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Token d\'authentification manquant',
        APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Format de token invalide. Utilisez: Bearer <token>',
        APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN
      );
    }

    const token = parts[1] ?? '';

    // Verify token
    const payload = JWTService.verifyAccessToken(token);

    // Attach user to request
    req.user = {
      id: payload.userId,
      role: payload.role,
      phoneNumber: '', // Will be fetched from DB if needed
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      const message = (error as Error).message;

      if (message === APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED) {
        next(
          new AppError(
            APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
            'Token expiré. Veuillez vous reconnecter.',
            APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED
          )
        );
      } else if (message === APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN) {
        next(
          new AppError(
            APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
            'Token invalide',
            APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN
          )
        );
      } else {
        next(
          new AppError(
            APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
            'Authentification échouée',
            APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
          )
        );
      }
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if not present
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1] ?? '';
    const payload = JWTService.verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role,
      phoneNumber: '',
    };

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Named exports
export const authenticate = authMiddleware;
export const optionalAuth = optionalAuthMiddleware;
export const optionalAuthenticate = optionalAuthMiddleware; // Alias

export default authMiddleware;
