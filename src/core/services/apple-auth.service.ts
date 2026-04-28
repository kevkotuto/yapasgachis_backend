import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';

interface AppleUserInfo {
  appleId: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

export class AppleAuthService {
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    this.jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }

  /**
   * Verify Apple identity token (RS256 JWT signed by Apple)
   * Validates signature, issuer, audience, and expiration.
   */
  async verifyIdentityToken(identityToken: string): Promise<AppleUserInfo> {
    const audiences = [config.apple.bundleId, config.apple.serviceId].filter(
      Boolean
    );

    let payload: JWTPayload;
    try {
      const result = await jwtVerify(identityToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: audiences,
      });
      payload = result.payload;
    } catch (error) {
      logger.error('Apple identity token verification failed', {
        error: (error as Error).message,
      });
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Token Apple invalide',
        'INVALID_APPLE_TOKEN'
      );
    }

    if (!payload.sub) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Token Apple invalide',
        'INVALID_APPLE_TOKEN'
      );
    }

    const email =
      typeof payload.email === 'string' ? (payload.email as string) : null;
    const emailVerified = this.parseAppleBoolean(payload.email_verified);
    const isPrivateEmail = this.parseAppleBoolean(payload.is_private_email);

    return {
      appleId: payload.sub,
      email,
      emailVerified,
      isPrivateEmail,
    };
  }

  /**
   * Apple sometimes returns booleans as strings ("true"/"false") in the JWT payload.
   */
  private parseAppleBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return false;
  }
}

export default new AppleAuthService();
