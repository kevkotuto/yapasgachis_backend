import { readFile } from 'fs/promises';

import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  JWTPayload,
  SignJWT,
} from 'jose';

type ApplePrivateKey = Awaited<ReturnType<typeof importPKCS8>>;

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

interface AppleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

// Apple allows client_secret JWTs valid up to 6 months. Use a shorter window
// for safety + cache the signed JWT until ~5 minutes before expiry.
const CLIENT_SECRET_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export class AppleAuthService {
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private cachedPrivateKey: ApplePrivateKey | null = null;
  private cachedClientSecret: { jwt: string; expiresAt: number } | null = null;

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
   * Exchange the short-lived `authorizationCode` (from native Sign in with
   * Apple) for an Apple refresh_token. The refresh_token must be persisted
   * server-side to allow revocation when the user deletes their account.
   *
   * Returns null if revocation is not configured (no .p8 / teamId / keyId).
   */
  async exchangeAuthorizationCode(
    authorizationCode: string
  ): Promise<AppleTokenResponse | null> {
    if (!this.isRevocationConfigured()) {
      return null;
    }

    const clientSecret = await this.getClientSecret();
    const body = new URLSearchParams({
      client_id: config.apple.bundleId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    });

    const response = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await response.json()) as AppleTokenResponse;

    if (!response.ok || data.error) {
      logger.warn('Apple authorizationCode exchange failed', {
        status: response.status,
        error: data.error,
        description: data.error_description,
      });
      return null;
    }

    return data;
  }

  /**
   * Revoke an Apple refresh_token (or access_token). Best-effort: logs and
   * resolves silently on failure since user-account deletion should never be
   * blocked by an Apple-side hiccup.
   *
   * https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
   */
  async revokeToken(
    token: string,
    tokenType: 'refresh_token' | 'access_token' = 'refresh_token'
  ): Promise<boolean> {
    if (!this.isRevocationConfigured()) {
      logger.warn(
        'Apple token revocation skipped: revocation not configured (missing teamId/keyId/privateKey)'
      );
      return false;
    }

    try {
      const clientSecret = await this.getClientSecret();
      const body = new URLSearchParams({
        client_id: config.apple.bundleId,
        client_secret: clientSecret,
        token,
        token_type_hint: tokenType,
      });

      const response = await fetch(APPLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        logger.warn('Apple token revocation returned non-OK', {
          status: response.status,
          body: text.slice(0, 300),
        });
        return false;
      }

      logger.info('Apple token revoked successfully', { tokenType });
      return true;
    } catch (error) {
      logger.error('Apple token revocation threw', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Returns true when all revocation prerequisites are configured.
   */
  private isRevocationConfigured(): boolean {
    return Boolean(
      config.apple.teamId &&
      config.apple.keyId &&
      config.apple.privateKeyPath &&
      config.apple.bundleId
    );
  }

  /**
   * Build (and cache) the client_secret JWT signed with the Apple .p8 key.
   *
   * iss = TEAM_ID, aud = https://appleid.apple.com, sub = bundleId,
   * kid header = KEY_ID, alg = ES256.
   */
  private async getClientSecret(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    if (
      this.cachedClientSecret &&
      this.cachedClientSecret.expiresAt - now > 5 * 60
    ) {
      return this.cachedClientSecret.jwt;
    }

    const privateKey = await this.getPrivateKey();
    const exp = now + CLIENT_SECRET_TTL_SECONDS;

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: config.apple.keyId })
      .setIssuer(config.apple.teamId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience(APPLE_ISSUER)
      .setSubject(config.apple.bundleId)
      .sign(privateKey);

    this.cachedClientSecret = { jwt, expiresAt: exp };
    return jwt;
  }

  /**
   * Load and cache the Apple .p8 private key from disk.
   */
  private async getPrivateKey(): Promise<ApplePrivateKey> {
    if (this.cachedPrivateKey) return this.cachedPrivateKey;

    const pem = await readFile(config.apple.privateKeyPath, 'utf8');
    this.cachedPrivateKey = await importPKCS8(pem, 'ES256');
    return this.cachedPrivateKey;
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
