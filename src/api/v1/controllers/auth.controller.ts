import { Request, Response } from 'express';

import AuthService from '@/core/services/auth.service';
import { asyncHandler } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';
// Types used for JSDoc comments and type hints (validated by Zod middleware)

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Body is validated by Zod middleware, safe to cast
    const result = await this.authService.register(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.CREATED).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
      },
    });
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  });

  /**
   * Verify OTP
   * POST /api/v1/auth/verify-otp
   */
  verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.verifyOTP(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      data: {
        tokens: result.tokens,
      },
    });
  });

  /**
   * Resend OTP
   * POST /api/v1/auth/resend-otp
   */
  resendOTP = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.resendOTP(
      req.body.phoneNumber,
      req.body.purpose
    );

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await this.authService.forgotPassword(req.body.phoneNumber);

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    }
  );

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await this.authService.resetPassword(req.body);

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    }
  );

  /**
   * Change password
   * POST /api/v1/auth/change-password
   * Requires authentication
   */
  changePassword = asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await this.authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    }
  );

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  refreshToken = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await this.authService.refreshToken(req.body.refreshToken);

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        message: 'Token rafraîchi avec succès',
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
      });
    }
  );

  /**
   * Logout user
   * POST /api/v1/auth/logout
   * Requires authentication
   */
  logout = asyncHandler(
    async (req: Request<{}, {}, { refreshToken: string }>, res: Response) => {
      const refreshToken = req.body.refreshToken;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        message: 'Déconnexion réussie',
      });
    }
  );

  /**
   * Get current user (test endpoint)
   * GET /api/v1/auth/me
   * Requires authentication
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  });

  /**
   * Login or Register with Google
   * POST /api/v1/auth/google
   */
  googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.googleAuth(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.isNewUser ? 'Inscription via Google réussie' : 'Connexion via Google réussie',
      data: {
        user: result.user,
        tokens: result.tokens,
        isNewUser: result.isNewUser,
      },
    });
  });

  /**
   * Link Google account to existing user
   * POST /api/v1/auth/google/link
   * Requires authentication
   */
  linkGoogle = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await this.authService.linkGoogleAccount(req.user.id, req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Unlink Google account from user
   * POST /api/v1/auth/google/unlink
   * Requires authentication
   */
  unlinkGoogle = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await this.authService.unlinkGoogleAccount(req.user.id);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  });
}

export default new AuthController();
