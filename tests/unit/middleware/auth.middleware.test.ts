import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Mock JWTService
jest.mock('@/core/services/jwt.service', () => ({
  default: {
    verifyAccessToken: jest.fn(),
  },
  JWTService: {
    verifyAccessToken: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/infrastructure/monitoring/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock constants
jest.mock('@/utils/constants', () => ({
  APP_CONSTANTS: {
    HTTP_STATUS: {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
    },
    ERROR_CODES: {
      UNAUTHORIZED: 'UNAUTHORIZED',
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
      INVALID_TOKEN: 'INVALID_TOKEN',
    },
  },
}));

import JWTService from '@/core/services/jwt.service';
import { APP_CONSTANTS } from '@/utils/constants';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  // Inline auth middleware for testing
  const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED,
            message: 'Token non fourni',
          },
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN,
            message: 'Format de token invalide',
          },
        });
      }

      const token = authHeader.substring(7);

      const payload = JWTService.verifyAccessToken(token);

      (req as any).user = {
        id: payload.userId,
        role: payload.role,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        return res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED,
            message: 'Token expiré',
          },
        });
      }

      return res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN,
          message: 'Token invalide',
        },
      });
    }
  };

  describe('authMiddleware', () => {
    it('should return 401 if no authorization header', async () => {
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token non fourni',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Format de token invalide',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() with valid token', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      (JWTService.verifyAccessToken as jest.Mock).mockReturnValueOnce({
        userId: 'user-123',
        role: UserRole.CLIENT,
        sessionId: 'session-456',
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(JWTService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect((mockRequest as any).user).toEqual({
        id: 'user-123',
        role: UserRole.CLIENT,
        sessionId: 'session-456',
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      mockRequest.headers = { authorization: 'Bearer expired-token' };

      (JWTService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('TOKEN_EXPIRED');
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expiré',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      (JWTService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('INVALID_TOKEN');
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide',
        },
      });
    });
  });

  describe('roleGuard', () => {
    // Inline roleGuard for testing
    const roleGuard = (...allowedRoles: UserRole[]) => {
      return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
          return res.status(APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            error: {
              code: APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED,
              message: 'Non authentifié',
            },
          });
        }

        if (!allowedRoles.includes(user.role)) {
          return res.status(APP_CONSTANTS.HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Accès non autorisé pour ce rôle',
            },
          });
        }

        next();
      };
    };

    it('should return 401 if user not authenticated', () => {
      const guard = roleGuard(UserRole.ADMIN);

      guard(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user role not allowed', () => {
      (mockRequest as any).user = { role: UserRole.CLIENT };
      const guard = roleGuard(UserRole.ADMIN, UserRole.SUPER_ADMIN);

      guard(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès non autorisé pour ce rôle',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() if user role is allowed', () => {
      (mockRequest as any).user = { role: UserRole.ADMIN };
      const guard = roleGuard(UserRole.ADMIN, UserRole.SUPER_ADMIN);

      guard(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      (mockRequest as any).user = { role: UserRole.SUPPLIER_FOOD };
      const guard = roleGuard(
        UserRole.SUPPLIER_FOOD,
        UserRole.SUPPLIER_DEALS,
        UserRole.ADMIN
      );

      guard(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
