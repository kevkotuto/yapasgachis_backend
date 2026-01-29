import config from '@/config';
import { redis } from '@/infrastructure/database/redis/client';
import logger from '@/infrastructure/monitoring/logger';
import { APP_CONSTANTS } from '@/utils/constants';
import { generateOTP } from '@/utils/helpers';

export enum OTPPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  PHONE_VERIFICATION = 'phone_verification',
  EMAIL_VERIFICATION = 'email_verification',
}

export enum OTPChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

interface OTPData {
  code: string;
  purpose: OTPPurpose;
  channel: OTPChannel;
  attempts: number;
  createdAt: string;
}

export class OTPService {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RESEND_COOLDOWN = 60; // seconds

  /**
   * Generate and store OTP for phone (SMS)
   */
  static async generateOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<string> {
    return this.generateOTPForIdentifier(phoneNumber, purpose, OTPChannel.SMS);
  }

  /**
   * Generate and store OTP for phone (WhatsApp)
   */
  static async generateWhatsAppOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<string> {
    return this.generateOTPForIdentifier(
      phoneNumber,
      purpose,
      OTPChannel.WHATSAPP
    );
  }

  /**
   * Generate and store OTP for email
   */
  static async generateEmailOTP(
    email: string,
    purpose: OTPPurpose
  ): Promise<string> {
    return this.generateOTPForIdentifier(email, purpose, OTPChannel.EMAIL);
  }

  /**
   * Generic OTP generation for any identifier (phone or email)
   */
  private static async generateOTPForIdentifier(
    identifier: string,
    purpose: OTPPurpose,
    channel: OTPChannel
  ): Promise<string> {
    // Check resend cooldown
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${identifier}`;
    const cooldown = await redis.get(cooldownKey);

    if (cooldown) {
      const remaining = await redis.ttl(cooldownKey);
      throw new Error(
        `Veuillez attendre ${remaining} secondes avant de renvoyer le code`
      );
    }

    // Generate OTP
    const code = generateOTP(config.security.otpLength);

    // Store OTP in Redis
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${identifier}:${purpose}`;
    const otpData: OTPData = {
      code,
      purpose,
      channel,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    const ttl = Math.floor(config.security.otpExpiration / 1000); // Convert to seconds

    await redis.setex(otpKey, ttl, JSON.stringify(otpData));

    // Set resend cooldown
    await redis.setex(cooldownKey, this.RESEND_COOLDOWN, '1');

    logger.info('OTP generated', {
      identifier:
        channel === OTPChannel.EMAIL ? identifier : identifier.slice(-4),
      channel,
      purpose,
      expiresIn: `${ttl}s`,
    });

    return code;
  }

  /**
   * Verify OTP (for phone - backwards compatible)
   */
  static async verifyOTP(
    phoneNumber: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    return this.verifyOTPForIdentifier(phoneNumber, code, purpose);
  }

  /**
   * Verify OTP for email
   */
  static async verifyEmailOTP(
    email: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    return this.verifyOTPForIdentifier(email, code, purpose);
  }

  /**
   * Verify OTP for WhatsApp
   */
  static async verifyWhatsAppOTP(
    phoneNumber: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    return this.verifyOTPForIdentifier(phoneNumber, code, purpose);
  }

  /**
   * Generic OTP verification for any identifier
   */
  private static async verifyOTPForIdentifier(
    identifier: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${identifier}:${purpose}`;
    const verifiedKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}verified:${identifier}:${purpose}`;

    // Check if this OTP was recently verified (within last 30 seconds)
    const recentlyVerified = await redis.get(verifiedKey);
    if (recentlyVerified) {
      const recentData = JSON.parse(recentlyVerified);
      if (recentData.code === code) {
        logger.info('OTP already verified recently (idempotent)', {
          identifier,
          purpose,
        });
        return true;
      }
    }

    const otpDataStr = await redis.get(otpKey);

    if (!otpDataStr) {
      // Check if it was recently verified to provide better error message
      if (recentlyVerified) {
        logger.warn('OTP already used', { identifier, purpose });
        throw new Error(
          'Ce code OTP a déjà été utilisé. Veuillez demander un nouveau code si nécessaire'
        );
      }

      logger.warn('OTP not found or expired', { identifier, purpose });
      throw new Error(
        'Code OTP expiré ou invalide. Veuillez demander un nouveau code'
      );
    }

    const otpData: OTPData = JSON.parse(otpDataStr);

    // Check max attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await redis.del(otpKey);
      logger.warn('OTP max attempts exceeded', { identifier, purpose });
      throw new Error(
        'Nombre maximum de tentatives atteint. Demandez un nouveau code'
      );
    }

    // Verify code
    if (otpData.code !== code) {
      // Increment attempts
      otpData.attempts++;
      const ttl = await redis.ttl(otpKey);
      await redis.setex(otpKey, ttl, JSON.stringify(otpData));

      logger.warn('Invalid OTP attempt', {
        identifier,
        purpose,
        attempts: otpData.attempts,
      });

      throw new Error(
        `Code OTP incorrect. ${this.MAX_ATTEMPTS - otpData.attempts} tentative(s) restante(s)`
      );
    }

    // OTP is valid, mark as verified for 30 seconds (for idempotency)
    await redis.setex(
      verifiedKey,
      30,
      JSON.stringify({ code, verifiedAt: new Date().toISOString() })
    );

    // Delete the OTP
    await redis.del(otpKey);

    logger.info('OTP verified successfully', { identifier, purpose });

    return true;
  }

  /**
   * Check if OTP exists (for phone - backwards compatible)
   */
  static async hasActiveOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    return this.hasActiveOTPForIdentifier(phoneNumber, purpose);
  }

  /**
   * Check if OTP exists for email
   */
  static async hasActiveEmailOTP(
    email: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    return this.hasActiveOTPForIdentifier(email, purpose);
  }

  /**
   * Generic check for any identifier
   */
  private static async hasActiveOTPForIdentifier(
    identifier: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${identifier}:${purpose}`;
    const exists = await redis.exists(otpKey);
    return exists === 1;
  }

  /**
   * Get remaining time for OTP
   */
  static async getOTPRemainingTime(
    identifier: string,
    purpose: OTPPurpose
  ): Promise<number> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${identifier}:${purpose}`;
    return redis.ttl(otpKey);
  }

  /**
   * Delete OTP (for cleanup or cancellation)
   */
  static async deleteOTP(
    identifier: string,
    purpose: OTPPurpose
  ): Promise<void> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${identifier}:${purpose}`;
    await redis.del(otpKey);

    logger.info('OTP deleted', { identifier, purpose });
  }

  /**
   * Check resend cooldown
   */
  static async canResendOTP(identifier: string): Promise<boolean> {
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${identifier}`;
    const cooldown = await redis.get(cooldownKey);
    return !cooldown;
  }

  /**
   * Get resend cooldown remaining time
   */
  static async getResendCooldown(identifier: string): Promise<number> {
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${identifier}`;
    const ttl = await redis.ttl(cooldownKey);
    return ttl > 0 ? ttl : 0;
  }
}

export default OTPService;
