// Mock dependencies before importing the service
jest.mock('@/infrastructure/database/redis/client', () => ({
  redis: {
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn(),
    ttl: jest.fn(),
  },
}));

jest.mock('@/utils/constants', () => ({
  APP_CONSTANTS: {
    CACHE_KEYS: {
      OTP_PREFIX: 'otp:',
    },
  },
}));

jest.mock('@/utils/helpers', () => ({
  generateOTP: jest.fn().mockReturnValue('123456'),
}));

jest.mock('@/config', () => ({
  default: {
    security: {
      otpLength: 6,
      otpExpiration: 600000, // 10 minutes in ms
    },
  },
}));

jest.mock('@/infrastructure/monitoring/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import { OTPService, OTPPurpose } from '@/core/services/otp.service';
import { redis } from '@/infrastructure/database/redis/client';

describe('OTPService', () => {
  const mockPhoneNumber = '+2250701234567';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOTP', () => {
    it('should generate and store OTP when no cooldown exists', async () => {
      // Mock no cooldown exists
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const code = await OTPService.generateOTP(mockPhoneNumber, OTPPurpose.REGISTRATION);

      expect(code).toBe('123456');
      expect(redis.setex).toHaveBeenCalledTimes(2); // Once for OTP, once for cooldown
    });

    it('should throw error if cooldown is active', async () => {
      // Mock cooldown exists
      (redis.get as jest.Mock).mockResolvedValueOnce('1');
      (redis.ttl as jest.Mock).mockResolvedValueOnce(45);

      await expect(
        OTPService.generateOTP(mockPhoneNumber, OTPPurpose.REGISTRATION)
      ).rejects.toThrow('Veuillez attendre 45 secondes avant de renvoyer le code');
    });

    it('should store OTP with correct TTL', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      await OTPService.generateOTP(mockPhoneNumber, OTPPurpose.LOGIN);

      // Check OTP storage call (first setex call)
      const otpCall = (redis.setex as jest.Mock).mock.calls[0];
      expect(otpCall[0]).toBe(`otp:${mockPhoneNumber}:login`);
      expect(otpCall[1]).toBe(600); // 10 minutes in seconds
    });

    it('should set cooldown for 60 seconds', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      await OTPService.generateOTP(mockPhoneNumber, OTPPurpose.PASSWORD_RESET);

      // Check cooldown storage call (second setex call)
      const cooldownCall = (redis.setex as jest.Mock).mock.calls[1];
      expect(cooldownCall[0]).toBe(`otp:cooldown:${mockPhoneNumber}`);
      expect(cooldownCall[1]).toBe(60);
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP code', async () => {
      const otpData = {
        code: '123456',
        purpose: OTPPurpose.REGISTRATION,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(otpData));

      const result = await OTPService.verifyOTP(
        mockPhoneNumber,
        '123456',
        OTPPurpose.REGISTRATION
      );

      expect(result).toBe(true);
      expect(redis.del).toHaveBeenCalledWith(`otp:${mockPhoneNumber}:registration`);
    });

    it('should throw error for incorrect OTP code', async () => {
      const otpData = {
        code: '123456',
        purpose: OTPPurpose.REGISTRATION,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(otpData));
      (redis.ttl as jest.Mock).mockResolvedValueOnce(300);

      await expect(
        OTPService.verifyOTP(mockPhoneNumber, '999999', OTPPurpose.REGISTRATION)
      ).rejects.toThrow('Code OTP incorrect. 2 tentative(s) restante(s)');
    });

    it('should throw error when OTP not found or expired', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        OTPService.verifyOTP(mockPhoneNumber, '123456', OTPPurpose.REGISTRATION)
      ).rejects.toThrow('Code OTP invalide ou expiré');
    });

    it('should throw error when max attempts exceeded', async () => {
      const otpData = {
        code: '123456',
        purpose: OTPPurpose.REGISTRATION,
        attempts: 3, // Max attempts reached
        createdAt: new Date().toISOString(),
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(otpData));

      await expect(
        OTPService.verifyOTP(mockPhoneNumber, '123456', OTPPurpose.REGISTRATION)
      ).rejects.toThrow('Nombre maximum de tentatives atteint. Demandez un nouveau code');

      // Should delete the OTP after max attempts
      expect(redis.del).toHaveBeenCalled();
    });

    it('should increment attempts on failed verification', async () => {
      const otpData = {
        code: '123456',
        purpose: OTPPurpose.REGISTRATION,
        attempts: 1,
        createdAt: new Date().toISOString(),
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(otpData));
      (redis.ttl as jest.Mock).mockResolvedValueOnce(300);

      try {
        await OTPService.verifyOTP(mockPhoneNumber, '999999', OTPPurpose.REGISTRATION);
      } catch {
        // Expected to throw
      }

      // Check that setex was called to update attempts
      expect(redis.setex).toHaveBeenCalled();
      const updatedData = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2]);
      expect(updatedData.attempts).toBe(2);
    });
  });

  describe('hasActiveOTP', () => {
    it('should return true if OTP exists', async () => {
      (redis.exists as jest.Mock).mockResolvedValueOnce(1);

      const result = await OTPService.hasActiveOTP(mockPhoneNumber, OTPPurpose.LOGIN);

      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledWith(`otp:${mockPhoneNumber}:login`);
    });

    it('should return false if OTP does not exist', async () => {
      (redis.exists as jest.Mock).mockResolvedValueOnce(0);

      const result = await OTPService.hasActiveOTP(mockPhoneNumber, OTPPurpose.LOGIN);

      expect(result).toBe(false);
    });
  });

  describe('getOTPRemainingTime', () => {
    it('should return remaining TTL', async () => {
      (redis.ttl as jest.Mock).mockResolvedValueOnce(450);

      const result = await OTPService.getOTPRemainingTime(
        mockPhoneNumber,
        OTPPurpose.REGISTRATION
      );

      expect(result).toBe(450);
    });

    it('should return -2 if key does not exist', async () => {
      (redis.ttl as jest.Mock).mockResolvedValueOnce(-2);

      const result = await OTPService.getOTPRemainingTime(
        mockPhoneNumber,
        OTPPurpose.REGISTRATION
      );

      expect(result).toBe(-2);
    });
  });

  describe('deleteOTP', () => {
    it('should delete OTP from Redis', async () => {
      await OTPService.deleteOTP(mockPhoneNumber, OTPPurpose.PASSWORD_RESET);

      expect(redis.del).toHaveBeenCalledWith(`otp:${mockPhoneNumber}:password_reset`);
    });
  });

  describe('canResendOTP', () => {
    it('should return true if no cooldown exists', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await OTPService.canResendOTP(mockPhoneNumber);

      expect(result).toBe(true);
    });

    it('should return false if cooldown is active', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce('1');

      const result = await OTPService.canResendOTP(mockPhoneNumber);

      expect(result).toBe(false);
    });
  });

  describe('getResendCooldown', () => {
    it('should return remaining cooldown time', async () => {
      (redis.ttl as jest.Mock).mockResolvedValueOnce(30);

      const result = await OTPService.getResendCooldown(mockPhoneNumber);

      expect(result).toBe(30);
    });

    it('should return 0 if no cooldown', async () => {
      (redis.ttl as jest.Mock).mockResolvedValueOnce(-2);

      const result = await OTPService.getResendCooldown(mockPhoneNumber);

      expect(result).toBe(0);
    });
  });
});
