import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

// Mock dependencies before importing the service
jest.mock('@/config', () => ({
  default: {
    jwt: {
      secret: 'test-jwt-secret-key-for-unit-tests',
      refreshSecret: 'test-refresh-secret-key-for-unit-tests',
      accessExpiration: '15m',
      refreshExpiration: '7d',
    },
    app: {
      name: 'YapaGachis-Test',
      url: 'http://localhost:3000',
    },
  },
}));

jest.mock('@/infrastructure/database/redis/client', () => ({
  redis: {
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(3600),
  },
}));

jest.mock('@/infrastructure/monitoring/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/constants', () => ({
  APP_CONSTANTS: {
    CACHE_KEYS: {
      SESSION_PREFIX: 'session:',
    },
    ERROR_CODES: {
      TOKEN_EXPIRED: 'TOKEN_EXPIRED',
      INVALID_TOKEN: 'INVALID_TOKEN',
    },
  },
}));

// Import after mocks
import { JWTService } from '@/core/services/jwt.service';
import { redis } from '@/infrastructure/database/redis/client';
import config from '@/config';

describe('JWTService', () => {
  const mockUserId = 'user-123-uuid';
  const mockRole = UserRole.CLIENT;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify token can be decoded
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
      expect(decoded.sessionId).toBe('session-123');
    });

    it('should include issuer and audience in token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iss).toBe(config.app.name);
      expect(decoded.aud).toBe(config.app.url);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.role).toBe(mockRole);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', async () => {
      const result = await JWTService.generateTokenPair(mockUserId, mockRole);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should store refresh token in Redis', async () => {
      await JWTService.generateTokenPair(mockUserId, mockRole);

      expect(redis.setex).toHaveBeenCalled();
      const call = (redis.setex as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('session:');
      expect(call[1]).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);
      const result = JWTService.verifyAccessToken(token);

      expect(result.userId).toBe(mockUserId);
      expect(result.role).toBe(mockRole);
      expect(result.sessionId).toBe('session-123');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTService.verifyAccessToken('invalid-token');
      }).toThrow('INVALID_TOKEN');
    });

    it('should throw error for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: mockUserId, role: mockRole, sessionId: 'session-123' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      expect(() => {
        JWTService.verifyAccessToken(expiredToken);
      }).toThrow('TOKEN_EXPIRED');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token with session in Redis', async () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateRefreshToken(payload);

      // Mock Redis to return stored session
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          userId: mockUserId,
          role: mockRole,
          refreshToken: token,
          createdAt: new Date().toISOString(),
        })
      );

      const result = await JWTService.verifyRefreshToken(token);

      expect(result.userId).toBe(mockUserId);
      expect(result.role).toBe(mockRole);
    });

    it('should throw error when session not found in Redis', async () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateRefreshToken(payload);

      // Mock Redis to return null (no session)
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(JWTService.verifyRefreshToken(token)).rejects.toThrow('INVALID_TOKEN');
    });

    it('should throw error when token does not match stored token', async () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateRefreshToken(payload);

      // Mock Redis to return different token
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          userId: mockUserId,
          role: mockRole,
          refreshToken: 'different-token',
          createdAt: new Date().toISOString(),
        })
      );

      await expect(JWTService.verifyRefreshToken(token)).rejects.toThrow('INVALID_TOKEN');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a valid refresh token', async () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateRefreshToken(payload);

      await JWTService.revokeRefreshToken(token);

      expect(redis.del).toHaveBeenCalledWith('session:session-123');
    });

    it('should not throw error for invalid token', async () => {
      await expect(JWTService.revokeRefreshToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);
      const result = JWTService.decodeToken(token);

      expect(result?.userId).toBe(mockUserId);
      expect(result?.role).toBe(mockRole);
    });

    it('should return null for invalid token', () => {
      const result = JWTService.decodeToken('not-a-valid-jwt');
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);
      const result = JWTService.isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: mockUserId, role: mockRole, sessionId: 'session-123' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      const result = JWTService.isTokenExpired(expiredToken);
      expect(result).toBe(true);
    });

    it('should return true for invalid token', () => {
      const result = JWTService.isTokenExpired('invalid-token');
      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const payload = {
        userId: mockUserId,
        role: mockRole,
        sessionId: 'session-123',
      };

      const token = JWTService.generateAccessToken(payload);
      const result = JWTService.getTokenExpiration(token);

      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const result = JWTService.getTokenExpiration('invalid-token');
      expect(result).toBeNull();
    });
  });
});
