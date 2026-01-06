import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import config from '@/config';
import { redis } from '@/infrastructure/database/redis/client';
import logger from '@/infrastructure/monitoring/logger';
import { APP_CONSTANTS } from '@/utils/constants';

interface TokenPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiration as jwt.SignOptions['expiresIn'],
      issuer: config.app.name,
      audience: config.app.url,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiration as jwt.SignOptions['expiresIn'],
      issuer: config.app.name,
      audience: config.app.url,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static async generateTokenPair(
    userId: string,
    role: UserRole
  ): Promise<TokenPair> {
    const sessionId = uuidv4();

    const payload: TokenPayload = {
      userId,
      role,
      sessionId,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token in Redis
    const refreshTokenKey = `${APP_CONSTANTS.CACHE_KEYS.SESSION_PREFIX}${sessionId}`;
    const refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days in seconds

    await redis.setex(
      refreshTokenKey,
      refreshTokenTTL,
      JSON.stringify({
        userId,
        role,
        refreshToken,
        createdAt: new Date().toISOString(),
      })
    );

    // Get token expiration time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    logger.info('Token pair generated', { userId, sessionId });

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.app.name,
        audience: config.app.url,
      }) as TokenPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new Error(APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN);
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: config.app.name,
        audience: config.app.url,
      }) as TokenPayload;

      // Check if session exists in Redis
      const sessionKey = `${APP_CONSTANTS.CACHE_KEYS.SESSION_PREFIX}${payload.sessionId}`;
      const sessionData = await redis.get(sessionKey);

      if (!sessionData) {
        throw new Error(APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN);
      }

      const session = JSON.parse(sessionData);

      // Verify token matches stored token
      if (session.refreshToken !== token) {
        throw new Error(APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN);
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(APP_CONSTANTS.ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new Error(APP_CONSTANTS.ERROR_CODES.INVALID_TOKEN);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // Generate new access token with same session
    const accessToken = this.generateAccessToken({
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
    });

    // Get token expiration time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    logger.info('Access token refreshed', {
      userId: payload.userId,
      sessionId: payload.sessionId,
    });

    return {
      accessToken,
      expiresIn,
    };
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = jwt.verify(
        token,
        config.jwt.refreshSecret
      ) as TokenPayload;
      const sessionKey = `${APP_CONSTANTS.CACHE_KEYS.SESSION_PREFIX}${payload.sessionId}`;

      await redis.del(sessionKey);

      logger.info('Refresh token revoked', {
        userId: payload.userId,
        sessionId: payload.sessionId,
      });
    } catch (error) {
      // Token already invalid or expired, no need to do anything
      logger.warn('Failed to revoke refresh token', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `${APP_CONSTANTS.CACHE_KEYS.SESSION_PREFIX}*`;
    const keys = await redis.keys(pattern);

    let revokedCount = 0;

    for (const key of keys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          await redis.del(key);
          revokedCount++;
        }
      }
    }

    logger.info('All user sessions revoked', { userId, count: revokedCount });
  }

  /**
   * Decode token without verification (use with caution)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

export default JWTService;
