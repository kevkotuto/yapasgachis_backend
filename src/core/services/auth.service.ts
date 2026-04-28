import { User, UserRole, UserStatus } from '@prisma/client';

import AppleAuthService from './apple-auth.service';
import GoogleAuthService from './google-auth.service';
import JWTService from './jwt.service';
import notificationService from './notification.service';
import OTPService, { OTPPurpose } from './otp.service';
import referralService from './referral.service';

import config from '@/config';
import UserRepository from '@/core/repositories/user.repository';
import { redis } from '@/infrastructure/database/redis/client';
import emailService from '@/infrastructure/messaging/email/email.service';
import SMSService from '@/infrastructure/messaging/sms/sms.service';
import { WhatsAppService } from '@/infrastructure/messaging/whatsapp';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';
import { hashPassword, comparePassword } from '@/utils/crypto.utils';
import { formatPhoneNumber } from '@/utils/helpers';

interface RegisterDTO {
  phoneNumber?: string;
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

interface LoginEmailDTO {
  email: string;
  password: string;
}

interface VerifyEmailOTPDTO {
  email: string;
  code: string;
  purpose: OTPPurpose;
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

interface AppleAuthDTO {
  identityToken: string;
  authorizationCode?: string;
  user: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  language?: string;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Send OTP via the best available channel (WhatsApp preferred, SMS fallback)
   */
  private async sendOTPViaPreferredChannel(
    phoneNumber: string,
    otpCode: string,
    expiresInMinutes: number = 10
  ): Promise<{ channel: 'whatsapp' | 'sms' | 'email'; success: boolean }> {
    // Try WhatsApp first if enabled and preferred
    if (config.whatsapp.enabled && config.whatsapp.preferOverSms) {
      try {
        const whatsappAvailable = await WhatsAppService.isAvailable();
        if (whatsappAvailable) {
          const success = await WhatsAppService.sendOTP(
            phoneNumber,
            otpCode,
            expiresInMinutes
          );
          if (success) {
            logger.info('OTP sent via WhatsApp', {
              phone: phoneNumber.slice(-4),
            });
            return { channel: 'whatsapp', success: true };
          }
        }
      } catch (error) {
        logger.warn('WhatsApp OTP failed, falling back to SMS', {
          phone: phoneNumber.slice(-4),
          error: (error as Error).message,
        });
      }
    }

    // Fallback to SMS
    try {
      const success = await SMSService.sendOTP(
        phoneNumber,
        otpCode,
        expiresInMinutes
      );
      if (success) {
        logger.info('OTP sent via SMS', { phone: phoneNumber.slice(-4) });
        return { channel: 'sms', success: true };
      }
    } catch (error) {
      logger.error('SMS OTP failed', {
        phone: phoneNumber.slice(-4),
        error: (error as Error).message,
      });
    }

    return { channel: 'sms', success: false };
  }

  /**
   * Send welcome message via preferred channel
   */
  private async sendWelcomeViaPreferredChannel(
    phoneNumber: string,
    firstName: string
  ): Promise<void> {
    if (config.whatsapp.enabled && config.whatsapp.preferOverSms) {
      try {
        const whatsappAvailable = await WhatsAppService.isAvailable();
        if (whatsappAvailable) {
          await WhatsAppService.sendWelcome(phoneNumber, firstName);
          return;
        }
      } catch (error) {
        logger.warn('WhatsApp welcome failed, falling back to SMS', {
          error: (error as Error).message,
        });
      }
    }

    await SMSService.sendWelcomeSMS(phoneNumber, firstName);
  }

  /**
   * Send password reset via preferred channel
   */
  private async sendPasswordResetViaPreferredChannel(
    phoneNumber: string,
    code: string
  ): Promise<void> {
    if (config.whatsapp.enabled && config.whatsapp.preferOverSms) {
      try {
        const whatsappAvailable = await WhatsAppService.isAvailable();
        if (whatsappAvailable) {
          await WhatsAppService.sendPasswordReset(phoneNumber, code);
          return;
        }
      } catch (error) {
        logger.warn('WhatsApp password reset failed, falling back to SMS', {
          error: (error as Error).message,
        });
      }
    }

    await SMSService.sendPasswordResetSMS(phoneNumber, code);
  }

  /**
   * Register new user
   */
  async register(data: RegisterDTO): Promise<{
    user: Partial<User>;
    message: string;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }> {
    // Format phone number
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Check if user already exists
    const existingUser =
      await this.userRepository.findByPhoneNumber(phoneNumber);
    if (existingUser) {
      // If user exists but is pending verification, allow re-registration with new OTP
      if (existingUser.status === 'PENDING_VERIFICATION') {
        // Update user info if provided
        const updatedUser = await this.userRepository.update(existingUser.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash: await hashPassword(data.password),
          city: data.city,
          commune: data.commune,
          neighborhood: data.neighborhood,
          language: data.language || 'fr',
        });

        // Generate new OTP
        const otpCode =
          config.whatsapp.enabled && config.whatsapp.preferOverSms
            ? await OTPService.generateWhatsAppOTP(
                phoneNumber,
                OTPPurpose.REGISTRATION
              )
            : await OTPService.generateOTP(
                phoneNumber,
                OTPPurpose.REGISTRATION
              );

        // Send OTP via preferred channel
        const { channel } = await this.sendOTPViaPreferredChannel(
          phoneNumber,
          otpCode
        );

        // Also send OTP via email if provided
        if (data.email) {
          await emailService.sendOTPEmail({
            to: data.email,
            firstName: data.firstName,
            code: otpCode,
            purpose: 'registration',
          });
        }

        logger.info('User re-registered with new OTP', {
          userId: existingUser.id,
          phoneNumber: phoneNumber.slice(-4),
          otpChannel: channel,
        });

        // Auto-verify OTP if enabled (development/mock mode)
        if (config.security.autoVerifyOTP) {
          // Verify phone number automatically
          await this.userRepository.verifyPhoneNumber(updatedUser.id);

          // Update user status to ACTIVE
          const verifiedUser = await this.userRepository.update(
            updatedUser.id,
            {
              status: 'ACTIVE',
            }
          );

          // Generate tokens for automatic login
          const tokens = await JWTService.generateTokenPair(
            verifiedUser.id,
            verifiedUser.role
          );

          // Send welcome message
          await this.sendWelcomeViaPreferredChannel(
            phoneNumber,
            updatedUser.firstName
          );

          logger.info('User auto-verified on re-registration (mock mode)', {
            userId: updatedUser.id,
            phoneNumber: phoneNumber.slice(-4),
          });

          return {
            user: {
              id: verifiedUser.id,
              phoneNumber: verifiedUser.phoneNumber!,
              email: verifiedUser.email,
              firstName: verifiedUser.firstName,
              lastName: verifiedUser.lastName,
              role: verifiedUser.role,
              status: verifiedUser.status,
            },
            message:
              'Réinscription réussie ! Compte automatiquement vérifié (mode développement).',
            tokens,
          };
        }

        return {
          user: {
            id: updatedUser.id,
            phoneNumber: updatedUser.phoneNumber!,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
          },
          message: `Un nouveau code de vérification a été envoyé par ${channel}`,
        };
      }

      // If user is already verified/active, throw error
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.CONFLICT,
        'Un compte existe déjà avec ce numéro de téléphone',
        APP_CONSTANTS.ERROR_CODES.CONFLICT
      );
    }

    // Check email if provided
    if (data.email) {
      const existingEmail = await this.userRepository.findByEmail(data.email);
      if (existingEmail && existingEmail.status !== 'PENDING_VERIFICATION') {
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

    // Generate OTP (use WhatsApp channel if enabled)
    const otpCode =
      config.whatsapp.enabled && config.whatsapp.preferOverSms
        ? await OTPService.generateWhatsAppOTP(
            phoneNumber,
            OTPPurpose.REGISTRATION
          )
        : await OTPService.generateOTP(phoneNumber, OTPPurpose.REGISTRATION);

    // Send OTP via preferred channel (WhatsApp > SMS)
    const { channel } = await this.sendOTPViaPreferredChannel(
      phoneNumber,
      otpCode
    );

    // Also send OTP via email if provided
    if (data.email) {
      await emailService.sendOTPEmail({
        to: data.email,
        firstName: data.firstName,
        code: otpCode,
        purpose: 'registration',
      });
    }

    // Create referral code for the new user
    try {
      await referralService.createReferralCode(user.id);
      logger.info('Referral code created for new user', { userId: user.id });
    } catch (error) {
      logger.error('Failed to create referral code', {
        userId: user.id,
        error: (error as Error).message,
      });
      // Don't fail registration if referral code creation fails
    }

    // Send welcome notification (push + in-app)
    try {
      await notificationService.create({
        userId: user.id,
        type: 'WELCOME' as any,
        title: `Bienvenue ${user.firstName} ! 🎉`,
        message: `Merci de rejoindre YaPasGachis ! Découvrez des produits à prix réduits près de chez vous et contribuez à réduire le gaspillage alimentaire.`,
        priority: 'NORMAL' as any,
        data: {
          action: 'open_home',
          timestamp: new Date().toISOString(),
        },
        sendPush: true,
        sendRealtime: true,
        sendEmail: false,
      });
      logger.info('Welcome notification sent', { userId: user.id });
    } catch (error) {
      logger.error('Failed to send welcome notification', {
        userId: user.id,
        error: (error as Error).message,
      });
      // Don't fail registration if notification fails
    }

    logger.info('User registered', {
      userId: user.id,
      phoneNumber,
      email: data.email || null,
      role: user.role,
      otpChannel: channel,
    });

    // Auto-verify OTP if enabled (development/mock mode)
    if (config.security.autoVerifyOTP) {
      // Verify phone number automatically
      await this.userRepository.verifyPhoneNumber(user.id);

      // Update user status to ACTIVE
      const updatedUser = await this.userRepository.update(user.id, {
        status: 'ACTIVE',
      });

      // Generate tokens for automatic login
      const tokens = await JWTService.generateTokenPair(
        updatedUser.id,
        updatedUser.role
      );

      // Send welcome message
      await this.sendWelcomeViaPreferredChannel(phoneNumber, user.firstName);

      logger.info('User auto-verified (mock mode)', {
        userId: user.id,
        phoneNumber: phoneNumber.slice(-4),
      });

      // Return user with tokens
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;

      return {
        user: userWithoutPassword,
        message:
          'Inscription réussie ! Compte automatiquement vérifié (mode développement).',
        tokens,
      };
    }

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    // Determine message based on channel used
    let message: string;
    if (channel === 'whatsapp') {
      message = data.email
        ? 'Inscription réussie. Veuillez vérifier votre WhatsApp ou email pour le code OTP.'
        : 'Inscription réussie. Veuillez vérifier votre WhatsApp pour le code OTP.';
    } else {
      message = data.email
        ? 'Inscription réussie. Veuillez vérifier votre téléphone ou email pour le code OTP.'
        : 'Inscription réussie. Veuillez vérifier votre téléphone pour le code OTP.';
    }

    return {
      user: userWithoutPassword,
      message,
    };
  }

  /**
   * Login user with phone number (NO OTP required - direct login)
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
    const isPasswordValid = await comparePassword(
      data.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiants invalides',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
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

    // Auto-verify phone if not verified (since we're allowing direct login)
    if (!user.phoneVerified) {
      await this.userRepository.verifyPhoneNumber(user.id);
    }

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    logger.info('User logged in via phone', { userId: user.id, phoneNumber });

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login user with email (OTP required)
   * Step 1: Verify credentials and send OTP
   */
  async loginWithEmail(data: LoginEmailDTO): Promise<{
    message: string;
    requiresOTP: boolean;
  }> {
    const email = data.email.toLowerCase().trim();

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiants invalides',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check password
    const isPasswordValid = await comparePassword(
      data.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiants invalides',
        APP_CONSTANTS.ERROR_CODES.INVALID_CREDENTIALS
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

    // Generate and send OTP via email
    const otpCode = await OTPService.generateEmailOTP(email, OTPPurpose.LOGIN);
    await emailService.sendOTPEmail({
      to: email,
      firstName: user.firstName,
      code: otpCode,
      purpose: 'login',
    });

    logger.info('Login OTP sent via email', { userId: user.id, email });

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email',
      requiresOTP: true,
    };
  }

  /**
   * Verify email OTP and complete login
   */
  async verifyEmailOTP(data: VerifyEmailOTPDTO): Promise<{
    user: Partial<User>;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }> {
    const email = data.email.toLowerCase().trim();

    // Check if tokens were recently generated for this email (within 30s)
    const recentTokenKey = `recent_verification:${email}:${data.purpose}`;
    const cachedResponse = await redis.get(recentTokenKey);

    if (cachedResponse) {
      logger.info(
        'Returning cached response for recent email verification (idempotent)',
        {
          email,
          purpose: data.purpose,
        }
      );

      return JSON.parse(cachedResponse);
    }

    // Verify OTP
    await OTPService.verifyEmailOTP(email, data.code, data.purpose);

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Mark email as verified if not already
    if (!user.emailVerified) {
      await this.userRepository.update(user.id, { emailVerified: true });
    }

    // Ensure user is active
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.userRepository.update(user.id, { status: UserStatus.ACTIVE });
    }

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    logger.info('User logged in via email OTP', { userId: user.id, email });

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    const response = {
      user: userWithoutPassword,
      tokens,
    };

    // Cache response for 30 seconds to handle duplicate requests
    await redis.setex(recentTokenKey, 30, JSON.stringify(response));

    return response;
  }

  /**
   * Resend email OTP
   */
  async resendEmailOTP(
    email: string,
    purpose: OTPPurpose
  ): Promise<{ message: string }> {
    const formattedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await this.userRepository.findByEmail(formattedEmail);
    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Generate and send new OTP
    const otpCode = await OTPService.generateEmailOTP(formattedEmail, purpose);
    await emailService.sendOTPEmail({
      to: formattedEmail,
      firstName: user.firstName,
      code: otpCode,
      purpose: purpose === OTPPurpose.LOGIN ? 'login' : 'verification',
    });

    logger.info('Email OTP resent', { email: formattedEmail, purpose });

    return {
      message: 'Un nouveau code OTP vous a été envoyé par email',
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(data: VerifyOTPDTO): Promise<{
    success: boolean;
    message: string;
    user?: Partial<User>;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }> {
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Check if tokens were recently generated for this phone (within 30s)
    const recentTokenKey = `recent_verification:${phoneNumber}:${data.purpose}`;
    const cachedResponse = await redis.get(recentTokenKey);

    if (cachedResponse) {
      logger.info(
        'Returning cached response for recent verification (idempotent)',
        {
          phoneNumber,
          purpose: data.purpose,
        }
      );

      return JSON.parse(cachedResponse);
    }

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

    // Verify phone number (only if not already verified)
    if (!user.phoneVerified) {
      await this.userRepository.verifyPhoneNumber(user.id);

      // Send welcome message via preferred channel (only on first verification)
      await this.sendWelcomeViaPreferredChannel(phoneNumber, user.firstName);
    }

    logger.info('Phone verified', { userId: user.id, phoneNumber });

    // Generate tokens for automatic login
    const tokens = await JWTService.generateTokenPair(user.id, user.role);

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    const response = {
      success: true,
      message: 'Numéro de téléphone vérifié avec succès',
      user: userWithoutPassword,
      tokens,
    };

    // Cache response for 30 seconds to handle duplicate requests
    await redis.setex(recentTokenKey, 30, JSON.stringify(response));

    return response;
  }

  /**
   * Resend OTP
   */
  async resendOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<{ message: string }> {
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

    // Map OTPPurpose to email purpose
    const emailPurposeMap: Record<
      OTPPurpose,
      'login' | 'registration' | 'verification'
    > = {
      [OTPPurpose.REGISTRATION]: 'registration',
      [OTPPurpose.LOGIN]: 'login',
      [OTPPurpose.PASSWORD_RESET]: 'verification',
      [OTPPurpose.PHONE_VERIFICATION]: 'verification',
      [OTPPurpose.EMAIL_VERIFICATION]: 'verification',
    };

    // Generate and send new OTP via preferred channel
    const otpCode =
      config.whatsapp.enabled && config.whatsapp.preferOverSms
        ? await OTPService.generateWhatsAppOTP(formattedPhone, purpose)
        : await OTPService.generateOTP(formattedPhone, purpose);

    const { channel } = await this.sendOTPViaPreferredChannel(
      formattedPhone,
      otpCode
    );

    // Also send via email if user has email
    if (user.email) {
      await emailService.sendOTPEmail({
        to: user.email,
        firstName: user.firstName,
        code: otpCode,
        purpose: emailPurposeMap[purpose],
      });
    }

    logger.info('OTP resent', {
      phoneNumber: formattedPhone,
      email: user.email,
      purpose,
      channel,
    });

    let message: string;
    if (channel === 'whatsapp') {
      message = user.email
        ? 'Un nouveau code OTP vous a été envoyé par WhatsApp et email'
        : 'Un nouveau code OTP vous a été envoyé par WhatsApp';
    } else {
      message = user.email
        ? 'Un nouveau code OTP vous a été envoyé par SMS et email'
        : 'Un nouveau code OTP vous a été envoyé';
    }

    return { message };
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

    // Generate and send OTP via preferred channel
    const otpCode =
      config.whatsapp.enabled && config.whatsapp.preferOverSms
        ? await OTPService.generateWhatsAppOTP(
            formattedPhone,
            OTPPurpose.PASSWORD_RESET
          )
        : await OTPService.generateOTP(
            formattedPhone,
            OTPPurpose.PASSWORD_RESET
          );

    await this.sendPasswordResetViaPreferredChannel(formattedPhone, otpCode);

    // Also send via email if user has email
    if (user.email) {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetCode: otpCode,
      });
    }

    logger.info('Password reset OTP sent', {
      userId: user.id,
      phoneNumber: formattedPhone,
      email: user.email,
    });

    const whatsappUsed =
      config.whatsapp.enabled && config.whatsapp.preferOverSms;
    let message: string;
    if (whatsappUsed) {
      message = user.email
        ? 'Un code de réinitialisation vous a été envoyé par WhatsApp et email'
        : 'Un code de réinitialisation vous a été envoyé par WhatsApp';
    } else {
      message = user.email
        ? 'Un code de réinitialisation vous a été envoyé par SMS et email'
        : 'Un code de réinitialisation vous a été envoyé par SMS';
    }

    return { message };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(data: ResetPasswordDTO): Promise<{ message: string }> {
    const phoneNumber = formatPhoneNumber(data.phoneNumber);

    // Verify OTP
    await OTPService.verifyOTP(
      phoneNumber,
      data.code,
      OTPPurpose.PASSWORD_RESET
    );

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
        const existingUserByEmail = await this.userRepository.findByEmail(
          googleUser.email
        );

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

        // Create referral code for the new user
        try {
          await referralService.createReferralCode(user.id);
          logger.info('Referral code created for Google user', {
            userId: user.id,
          });
        } catch (error) {
          logger.error('Failed to create referral code for Google user', {
            userId: user.id,
            error: (error as Error).message,
          });
        }

        // Send welcome notification (push + in-app)
        try {
          await notificationService.create({
            userId: user.id,
            type: 'WELCOME' as any,
            title: `Bienvenue ${user.firstName} ! 🎉`,
            message: `Merci de rejoindre YaPasGachis ! Découvrez des produits à prix réduits près de chez vous et contribuez à réduire le gaspillage alimentaire.`,
            priority: 'NORMAL' as any,
            data: {
              action: 'open_home',
              timestamp: new Date().toISOString(),
            },
            sendPush: true,
            sendRealtime: true,
            sendEmail: false,
          });
          logger.info('Welcome notification sent to Google user', {
            userId: user.id,
          });
        } catch (error) {
          logger.error('Failed to send welcome notification to Google user', {
            userId: user.id,
            error: (error as Error).message,
          });
        }

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
    const existingGoogleUser = await this.userRepository.findByGoogleId(
      googleUser.googleId
    );
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

    logger.info('Google account linked', {
      userId,
      googleId: googleUser.googleId,
    });

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
        "Vous devez d'abord définir un mot de passe avant de délier votre compte Google",
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
   * Login or Register with Apple (Sign in with Apple)
   *
   * Apple sends email/firstName/lastName ONLY on the first sign-in. Subsequent
   * sign-ins return null for these fields, so the first-sign-in payload must
   * be persisted. The stable account key is the JWT `sub` (= `user` in body).
   */
  async appleAuth(data: AppleAuthDTO): Promise<{
    user: Partial<User>;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    isNewUser: boolean;
  }> {
    // 1. Verify the identity token (signature, iss, aud, exp)
    const appleUser = await AppleAuthService.verifyIdentityToken(
      data.identityToken
    );

    // 2. Cohérence: the JWT `sub` must match the `user` field from the body
    if (appleUser.appleId !== data.user) {
      logger.warn('Apple sub/user mismatch', {
        sub: appleUser.appleId,
        user: data.user,
      });
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Identifiant Apple incohérent',
        'APPLE_USER_MISMATCH'
      );
    }

    // 3. Find existing user by appleId
    let user = await this.userRepository.findByAppleId(appleUser.appleId);
    let isNewUser = false;

    if (!user) {
      // 4a. PREMIER SIGN-IN — Apple n'enverra plus jamais email/firstName/lastName
      const finalEmail = data.email || appleUser.email || null;

      // Link to existing account (e.g. created via Google) when emails match
      if (finalEmail) {
        const existingByEmail =
          await this.userRepository.findByEmail(finalEmail);
        if (existingByEmail) {
          user = await this.userRepository.update(existingByEmail.id, {
            appleId: appleUser.appleId,
            emailVerified: true,
          });
          logger.info('Apple account linked to existing user', {
            userId: user.id,
            appleId: appleUser.appleId,
          });
        }
      }

      if (!user) {
        user = await this.userRepository.create({
          appleId: appleUser.appleId,
          email: finalEmail,
          firstName: data.firstName || 'Utilisateur',
          lastName: data.lastName || null,
          authProvider: 'apple',
          role: data.role || UserRole.CLIENT,
          language: data.language || 'fr',
          emailVerified: appleUser.emailVerified,
          status: UserStatus.ACTIVE,
        });
        isNewUser = true;

        // Create referral code
        try {
          await referralService.createReferralCode(user.id);
        } catch (error) {
          logger.error('Failed to create referral code for Apple user', {
            userId: user.id,
            error: (error as Error).message,
          });
        }

        // Welcome notification
        try {
          await notificationService.create({
            userId: user.id,
            type: 'WELCOME' as any,
            title: `Bienvenue ${user.firstName} ! 🎉`,
            message: `Merci de rejoindre YaPasGachis ! Découvrez des produits à prix réduits près de chez vous et contribuez à réduire le gaspillage alimentaire.`,
            priority: 'NORMAL' as any,
            data: {
              action: 'open_home',
              timestamp: new Date().toISOString(),
            },
            sendPush: true,
            sendRealtime: true,
            sendEmail: false,
          });
        } catch (error) {
          logger.error('Failed to send welcome notification to Apple user', {
            userId: user.id,
            error: (error as Error).message,
          });
        }

        logger.info('New user registered via Apple', {
          userId: user.id,
          appleId: appleUser.appleId,
          hasEmail: !!finalEmail,
          isPrivateEmail: appleUser.isPrivateEmail,
        });
      }
    }

    // Status checks
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

    logger.info('User authenticated via Apple', {
      userId: user.id,
      isNewUser,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
      isNewUser,
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
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );
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

  /**
   * Get current user with full profile based on role
   */
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Fetch user with profile relations based on role
    const userWithProfile =
      await this.userRepository.findByIdWithProfile(userId);

    if (!userWithProfile) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.NOT_FOUND,
        'Profil utilisateur non trouvé',
        APP_CONSTANTS.ERROR_CODES.NOT_FOUND
      );
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = userWithProfile;

    return userWithoutPassword;
  }
}

export default AuthService;
