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
        tokens: result.tokens, // Include tokens if auto-verify is enabled
      },
    });
  });

  /**
   * Login user with phone (NO OTP - direct login)
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
   * Login user with email (OTP required - Step 1)
   * POST /api/v1/auth/login/email
   */
  loginEmail = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.loginWithEmail(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      data: {
        requiresOTP: result.requiresOTP,
      },
    });
  });

  /**
   * Verify OTP (for phone)
   * POST /api/v1/auth/verify-otp
   */
  verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.verifyOTP(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  });

  /**
   * Verify email OTP and complete login (Step 2)
   * POST /api/v1/auth/verify-email-otp
   */
  verifyEmailOTP = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.verifyEmailOTP(req.body);

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
   * Resend OTP (for phone)
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
   * Resend email OTP
   * POST /api/v1/auth/resend-email-otp
   */
  resendEmailOTP = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.resendEmailOTP(
      req.body.email,
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
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(req.body.phoneNumber);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.resetPassword(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Change password
   * POST /api/v1/auth/change-password
   * Requires authentication
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
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
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.refreshToken(req.body.refreshToken);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: 'Token rafraîchi avec succès',
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    });
  });

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
   * Get current user with full profile
   * GET /api/v1/auth/me
   * Requires authentication
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const user = await this.authService.getCurrentUser(req.user.id);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      data: {
        user,
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
      message: result.isNewUser
        ? 'Inscription via Google réussie'
        : 'Connexion via Google réussie',
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

    const result = await this.authService.linkGoogleAccount(
      req.user.id,
      req.body
    );

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

  /**
   * Login or Register with Apple (Sign in with Apple)
   * POST /api/v1/auth/apple
   */
  appleAuth = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.appleAuth(req.body);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: result.isNewUser
        ? 'Inscription via Apple réussie'
        : 'Connexion via Apple réussie',
      data: {
        user: result.user,
        tokens: result.tokens,
        isNewUser: result.isNewUser,
      },
    });
  });
}

export default new AuthController();
