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
}

interface OTPData {
  code: string;
  purpose: OTPPurpose;
  attempts: number;
  createdAt: string;
}

export class OTPService {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RESEND_COOLDOWN = 60; // seconds

  /**
   * Generate and store OTP
   */
  static async generateOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<string> {
    // Check resend cooldown
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${phoneNumber}`;
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
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${phoneNumber}:${purpose}`;
    const otpData: OTPData = {
      code,
      purpose,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    const ttl = Math.floor(config.security.otpExpiration / 1000); // Convert to seconds

    await redis.setex(otpKey, ttl, JSON.stringify(otpData));

    // Set resend cooldown
    await redis.setex(cooldownKey, this.RESEND_COOLDOWN, '1');

    logger.info('OTP generated', {
      phoneNumber,
      purpose,
      expiresIn: `${ttl}s`,
    });

    return code;
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(
    phoneNumber: string,
    code: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${phoneNumber}:${purpose}`;
    const otpDataStr = await redis.get(otpKey);

    if (!otpDataStr) {
      logger.warn('OTP not found or expired', { phoneNumber, purpose });
      throw new Error('Code OTP invalide ou expiré');
    }

    const otpData: OTPData = JSON.parse(otpDataStr);

    // Check max attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await redis.del(otpKey);
      logger.warn('OTP max attempts exceeded', { phoneNumber, purpose });
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
        phoneNumber,
        purpose,
        attempts: otpData.attempts,
      });

      throw new Error(
        `Code OTP incorrect. ${this.MAX_ATTEMPTS - otpData.attempts} tentative(s) restante(s)`
      );
    }

    // OTP is valid, delete it
    await redis.del(otpKey);

    logger.info('OTP verified successfully', { phoneNumber, purpose });

    return true;
  }

  /**
   * Check if OTP exists
   */
  static async hasActiveOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<boolean> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${phoneNumber}:${purpose}`;
    const exists = await redis.exists(otpKey);
    return exists === 1;
  }

  /**
   * Get remaining time for OTP
   */
  static async getOTPRemainingTime(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<number> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${phoneNumber}:${purpose}`;
    return redis.ttl(otpKey);
  }

  /**
   * Delete OTP (for cleanup or cancellation)
   */
  static async deleteOTP(
    phoneNumber: string,
    purpose: OTPPurpose
  ): Promise<void> {
    const otpKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}${phoneNumber}:${purpose}`;
    await redis.del(otpKey);

    logger.info('OTP deleted', { phoneNumber, purpose });
  }

  /**
   * Check resend cooldown
   */
  static async canResendOTP(phoneNumber: string): Promise<boolean> {
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${phoneNumber}`;
    const cooldown = await redis.get(cooldownKey);
    return !cooldown;
  }

  /**
   * Get resend cooldown remaining time
   */
  static async getResendCooldown(phoneNumber: string): Promise<number> {
    const cooldownKey = `${APP_CONSTANTS.CACHE_KEYS.OTP_PREFIX}cooldown:${phoneNumber}`;
    const ttl = await redis.ttl(cooldownKey);
    return ttl > 0 ? ttl : 0;
  }
}

export default OTPService;
