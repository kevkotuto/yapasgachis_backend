import { User, UserRole, UserStatus } from '@prisma/client';

import UserRepository from '@/core/repositories/user.repository';
import JWTService from './jwt.service';
import OTPService, { OTPPurpose } from './otp.service';
import GoogleAuthService from './google-auth.service';
import SMSService from '@/infrastructure/messaging/sms/sms.service';
import { hashPassword, comparePassword } from '@/utils/crypto.utils';
import { formatPhoneNumber } from '@/utils/helpers';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';

interface RegisterDTO {
  phoneNumber: string;
  email?: string;
  firstName: string;
  lastName?: string;
  password: string;
  role?: UserRole;
  city?: string;
  commune?: string;
  neighborhood?: string;
  language?: string;
}

interface LoginDTO {
  phoneNumber: string;
  password: string;
}

interface VerifyOTPDTO {
  phoneNumber: string;
  code: string;
  purpose: OTPPurpose;
}

interface ResetPasswordDTO {
  phoneNumber: string;
  code: string;
  newPassword: string;
}

interface GoogleAuthDTO {
  idToken?: string;
  accessToken?: string;
  role?: UserRole;
  language?: string;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register new user
   */
  async register(data: RegisterDTO): Promise<{ user: Partial<User>; message: string }> {
    // Format phone number
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Check if user already exists
    const existingUser = await this.userRepository.findByPhoneNumber(phoneNumber);
    if (existingUser) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.CONFLICT,
        'Un compte existe déjà avec ce numéro de téléphone',
        APP_CONSTANTS.ERROR_CODES.CONFLICT
      );
    }

    // Check email if provided
    if (data.email) {
      const existingEmail = await this.userRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new AppError(
          APP_CONSTANTS.HTTP_STATUS.CONFLICT,
          'Un compte existe déjà avec cette adresse email',
          APP_CONSTANTS.ERROR_CODES.CONFLICT
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      phoneNumber,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      role: data.role || UserRole.CLIENT,
      city: data.city,
      commune: data.commune,
      neighborhood: data.neighborhood,
      language: data.language || 'fr',
    });

    // Generate and send OTP
    const otpCode = await OTPService.generateOTP(phoneNumber, OTPPurpose.REGISTRATION);
    await SMSService.sendOTP(phoneNumber, otpCode);

    logger.info('User registered', { userId: user.id, phoneNumber, role: user.role });

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: 'Inscription réussie. Veuillez vérifier votre téléphone pour le code OTP.',
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<{
    user: Partial<User>;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }> {
    // Format phone number
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Find user
    const user = await this.userRepository.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiants invalides',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiants invalides',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if phone is verified
    if (!user.phoneVerified) {
      // Resend OTP
      const otpCode = await OTPService.generateOTP(phoneNumber, OTPPurpose.PHONE_VERIFICATION);
      await SMSService.sendOTP(phoneNumber, otpCode);

      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        'Veuillez vérifier votre numéro de téléphone. Un nouveau code vous a été envoyé.',
        'PHONE_NOT_VERIFIED'
      );
    }

    // Check user status
    if (user.status === 'SUSPENDED') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        'Votre compte a été suspendu. Veuillez contacter le support.',
        'ACCOUNT_SUSPENDED'
      );
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        'Votre compte a été désactivé.',
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    logger.info('User logged in', { userId: user.id, phoneNumber });

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(data: VerifyOTPDTO): Promise<{
    success: boolean;
    message: string;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }> {
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Verify OTP
    await OTPService.verifyOTP(phoneNumber, data.code, data.purpose);

    // Find user
    const user = await this.userRepository.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Verify phone number
    await this.userRepository.verifyPhoneNumber(user.id);

    // Send welcome SMS
    await SMSService.sendWelcomeSMS(phoneNumber, user.firstName);

    logger.info('Phone verified', { userId: user.id, phoneNumber });

    // Generate tokens for automatic login
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    return {
      success: true,
      message: 'Numéro de téléphone vérifié avec succès',
      tokens,
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string, purpose: OTPPurpose): Promise<{ message: string }> {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Check if user exists
    const user = await this.userRepository.findByPhoneNumber(formattedPhone);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Generate and send new OTP
    const otpCode = await OTPService.generateOTP(formattedPhone, purpose);
    await SMSService.sendOTP(formattedPhone, otpCode);

    logger.info('OTP resent', { phoneNumber: formattedPhone, purpose });

    return {
      message: 'Un nouveau code OTP vous a été envoyé',
    };
  }

  /**
   * Forgot password - Send OTP
   */
  async forgotPassword(phoneNumber: string): Promise<{ message: string }> {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Check if user exists
    const user = await this.userRepository.findByPhoneNumber(formattedPhone);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Aucun compte associé à ce numéro',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Generate and send OTP
    const otpCode = await OTPService.generateOTP(formattedPhone, OTPPurpose.PASSWORD_RESET);
    await SMSService.sendPasswordResetSMS(formattedPhone, otpCode);

    logger.info('Password reset OTP sent', { userId: user.id, phoneNumber: formattedPhone });

    return {
      message: 'Un code de réinitialisation vous a été envoyé par SMS',
    };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(data: ResetPasswordDTO): Promise<{ message: string }> {
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Verify OTP
    await OTPService.verifyOTP(phoneNumber, data.code, OTPPurpose.PASSWORD_RESET);

    // Find user
    const user = await this.userRepository.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(data.newPassword);

    // Update password
    await this.userRepository.updatePassword(user.id, passwordHash);

    // Revoke all existing sessions
    await JWTService.revokeAllUserSessions(user.id);

    logger.info('Password reset', { userId: user.id, phoneNumber });

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    return JWTService.refreshAccessToken(refreshToken);
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await JWTService.revokeRefreshToken(refreshToken);

    logger.info('User logged out');

    return {
      message: 'Déconnexion réussie',
    };
  }

  /**
   * Login or Register with Google
   */
  async googleAuth(data: GoogleAuthDTO): Promise<{
    user: Partial<User>;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    isNewUser: boolean;
  }> {
    // Verify Google token
    let googleUser;
    if (data.idToken) {
      googleUser = await GoogleAuthService.verifyIdToken(data.idToken);
    } else if (data.accessToken) {
      googleUser = await GoogleAuthService.verifyAccessToken(data.accessToken);
    } else {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Token Google requis (idToken ou accessToken)',
        'MISSING_GOOGLE_TOKEN'
      );
    }

    // Check if user exists with Google ID
    let user = await this.userRepository.findByGoogleId(googleUser.googleId);
    let isNewUser = false;

    if (!user) {
      // Check if user exists with same email
      if (googleUser.email) {
        const existingUserByEmail = await this.userRepository.findByEmail(googleUser.email);

        if (existingUserByEmail) {
          // Link Google account to existing user
          if (existingUserByEmail.authProvider === 'local') {
            user = await this.userRepository.update(existingUserByEmail.id, {
              googleId: googleUser.googleId,
              emailVerified: true,
              avatar: existingUserByEmail.avatar || googleUser.avatar,
            });
            logger.info('Google account linked to existing user', {
              userId: user.id,
              googleId: googleUser.googleId,
            });
          } else {
            user = existingUserByEmail;
          }
        }
      }

      // Create new user if not found
      if (!user) {
        user = await this.userRepository.create({
          googleId: googleUser.googleId,
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          avatar: googleUser.avatar,
          authProvider: 'google',
          role: data.role || UserRole.CLIENT,
          language: data.language || 'fr',
          emailVerified: googleUser.emailVerified,
          status: UserStatus.ACTIVE,
        });
        isNewUser = true;

        logger.info('New user registered via Google', {
          userId: user.id,
          googleId: googleUser.googleId,
          email: googleUser.email,
        });
      }
    }

    // Check user status
    if (user.status === 'SUSPENDED') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        'Votre compte a été suspendu. Veuillez contacter le support.',
        'ACCOUNT_SUSPENDED'
      );
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        'Votre compte a été désactivé.',
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    logger.info('User authenticated via Google', {
      userId: user.id,
      isNewUser,
    });

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
      isNewUser,
    };
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(
    userId: string,
    data: { idToken?: string; accessToken?: string }
  ): Promise<{ message: string }> {
    // Verify Google token
    let googleUser;
    if (data.idToken) {
      googleUser = await GoogleAuthService.verifyIdToken(data.idToken);
    } else if (data.accessToken) {
      googleUser = await GoogleAuthService.verifyAccessToken(data.accessToken);
    } else {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Token Google requis',
        'MISSING_GOOGLE_TOKEN'
      );
    }

    // Check if Google ID is already linked to another account
    const existingGoogleUser = await this.userRepository.findByGoogleId(googleUser.googleId);
    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.CONFLICT,
        'Ce compte Google est déjà lié à un autre utilisateur',
        'GOOGLE_ALREADY_LINKED'
      );
    }

    // Get current user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Update user with Google info
    await this.userRepository.update(userId, {
      googleId: googleUser.googleId,
      emailVerified: true,
      email: user.email || googleUser.email,
      avatar: user.avatar || googleUser.avatar,
    });

    logger.info('Google account linked', { userId, googleId: googleUser.googleId });

    return {
      message: 'Compte Google lié avec succès',
    };
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Check if user has password (can't unlink if only auth method)
    if (!user.passwordHash && user.authProvider === 'google') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Vous devez d\'abord définir un mot de passe avant de délier votre compte Google',
        'PASSWORD_REQUIRED'
      );
    }

    await this.userRepository.update(userId, {
      googleId: null,
      authProvider: user.passwordHash ? 'local' : user.authProvider,
    });

    logger.info('Google account unlinked', { userId });

    return {
      message: 'Compte Google délié avec succès',
    };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Mot de passe actuel incorrect',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, passwordHash);

    logger.info('Password changed', { userId });

    return {
      message: 'Mot de passe modifié avec succès',
    };
  }
}

export default AuthService;
