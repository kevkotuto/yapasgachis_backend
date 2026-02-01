import { Request, Response, NextFunction, RequestHandler } from 'express';

import { AppError } from './error-handler.middleware';

import UserRepository from '@/core/repositories/user.repository';
import JWTService from '@/core/services/jwt.service';
import { APP_CONSTANTS } from '@/utils/constants';

const userRepository = new UserRepository();

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request with profile IDs
 */
export const authMiddleware: RequestHandler = async (
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
        "Token d'authentification manquant",
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

    // Verify token (synchronous operation)
    const payload = JWTService.verifyAccessToken(token);

    // Fetch user with profile relations from database
    const userWithProfile = await userRepository.findByIdWithProfile(
      payload.userId
    );

    if (!userWithProfile) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
      );
    }

    // Attach user to request with profile IDs
    req.user = {
      id: userWithProfile.id,
      role: userWithProfile.role,
      phoneNumber: userWithProfile.phoneNumber,
      email: userWithProfile.email || undefined,
      supplierProfileId: userWithProfile.supplierProfile?.id,
      associationProfileId: userWithProfile.associationProfile?.id,
      advertiserProfileId: userWithProfile.advertiserProfile?.id,
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
export const optionalAuthMiddleware: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1] ?? '';
    const payload = JWTService.verifyAccessToken(token);

    // Fetch user with profile relations from database
    const userWithProfile = await userRepository.findByIdWithProfile(
      payload.userId
    );

    if (userWithProfile) {
      req.user = {
        id: userWithProfile.id,
        role: userWithProfile.role,
        phoneNumber: userWithProfile.phoneNumber,
        email: userWithProfile.email || undefined,
        supplierProfileId: userWithProfile.supplierProfile?.id,
        associationProfileId: userWithProfile.associationProfile?.id,
        advertiserProfileId: userWithProfile.advertiserProfile?.id,
      };
    }

    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
};

// Named exports
export const authenticate = authMiddleware;
export const optionalAuth = optionalAuthMiddleware;
export const optionalAuthenticate = optionalAuthMiddleware; // Alias

export default authMiddleware;
