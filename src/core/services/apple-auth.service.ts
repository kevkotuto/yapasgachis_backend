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

export type ApplePlatform = 'mobile' | 'web';

interface AppleUserInfo {
  appleId: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
  platform: ApplePlatform;
}

export type AppleNotificationType =
  | 'email-disabled'
  | 'email-enabled'
  | 'consent-revoked'
  | 'account-delete';

export interface AppleNotificationEvent {
  type: AppleNotificationType;
  sub: string; // Apple user identifier
  email?: string;
  isPrivateEmail?: boolean;
  eventTime: number;
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
  private cachedPrivateKeys: Partial<Record<ApplePlatform, ApplePrivateKey>> =
    {};
  private cachedClientSecrets: Partial<
    Record<ApplePlatform, { jwt: string; expiresAt: number }>
  > = {};

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

    const platform: ApplePlatform =
      payload.aud === config.apple.serviceId ? 'web' : 'mobile';

    return {
      appleId: payload.sub,
      email,
      emailVerified,
      isPrivateEmail,
      platform,
    };
  }

  /**
   * Verify and decode an Apple server-to-server notification payload.
   *
   * Apple sends a single field `payload` containing a JWT signed with the same
   * Apple keys as identity tokens. The JWT contains a stringified JSON `events`
   * field describing the user-side change (email forwarding toggled, consent
   * revoked, Apple Account deleted).
   *
   * https://developer.apple.com/documentation/sign_in_with_apple/processing_changes_for_sign_in_with_apple_accounts
   */
  async verifyServerNotification(
    signedPayload: string
  ): Promise<AppleNotificationEvent> {
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(signedPayload, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: config.apple.bundleId,
      });
      payload = result.payload;
    } catch (error) {
      logger.error('Apple S2S notification verification failed', {
        error: (error as Error).message,
      });
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Notification Apple invalide',
        'INVALID_APPLE_NOTIFICATION'
      );
    }

    const rawEvents = payload.events;
    if (typeof rawEvents !== 'string') {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Champ `events` manquant ou mal formé',
        'INVALID_APPLE_NOTIFICATION'
      );
    }

    let parsed: {
      type: AppleNotificationType;
      sub: string;
      email?: string;
      is_private_email?: unknown;
      event_time: number;
    };
    try {
      parsed = JSON.parse(rawEvents);
    } catch {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Champ `events` non parseable',
        'INVALID_APPLE_NOTIFICATION'
      );
    }

    if (!parsed.type || !parsed.sub) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Champs `type` ou `sub` manquants dans events',
        'INVALID_APPLE_NOTIFICATION'
      );
    }

    return {
      type: parsed.type,
      sub: parsed.sub,
      email: parsed.email,
      isPrivateEmail: this.parseAppleBoolean(parsed.is_private_email),
      eventTime: parsed.event_time,
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
    authorizationCode: string,
    platform: ApplePlatform = 'mobile'
  ): Promise<AppleTokenResponse | null> {
    if (!this.isRevocationConfigured(platform)) {
      return null;
    }

    const clientSecret = await this.getClientSecret(platform);
    const body = new URLSearchParams({
      client_id: this.getClientId(platform),
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
    tokenType: 'refresh_token' | 'access_token' = 'refresh_token',
    platform: ApplePlatform = 'mobile'
  ): Promise<boolean> {
    if (!this.isRevocationConfigured(platform)) {
      logger.warn(
        'Apple token revocation skipped: revocation not configured (missing teamId/keyId/privateKey)',
        { platform }
      );
      return false;
    }

    try {
      const clientSecret = await this.getClientSecret(platform);
      const body = new URLSearchParams({
        client_id: this.getClientId(platform),
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
   * Returns true when all revocation prerequisites are configured for the
   * given platform (separate .p8 keys are used for native vs web flows).
   */
  private isRevocationConfigured(platform: ApplePlatform): boolean {
    if (!config.apple.teamId) return false;
    if (platform === 'web') {
      return Boolean(
        config.apple.serviceId &&
        config.apple.webKeyId &&
        config.apple.webPrivateKeyPath
      );
    }
    return Boolean(
      config.apple.bundleId && config.apple.keyId && config.apple.privateKeyPath
    );
  }

  /**
   * client_id used in Apple OAuth token exchange / revoke endpoints. For the
   * native (mobile) flow this is the app Bundle ID; for the web flow this is
   * the Services ID configured in Apple Developer.
   */
  private getClientId(platform: ApplePlatform): string {
    return platform === 'web' ? config.apple.serviceId : config.apple.bundleId;
  }

  /**
   * Build (and cache) the client_secret JWT signed with the Apple .p8 key.
   *
   * iss = TEAM_ID, aud = https://appleid.apple.com, sub = clientId,
   * kid header = KEY_ID, alg = ES256.
   */
  private async getClientSecret(platform: ApplePlatform): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const cached = this.cachedClientSecrets[platform];
    if (cached && cached.expiresAt - now > 5 * 60) {
      return cached.jwt;
    }

    const privateKey = await this.getPrivateKey(platform);
    const exp = now + CLIENT_SECRET_TTL_SECONDS;
    const kid = platform === 'web' ? config.apple.webKeyId : config.apple.keyId;

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid })
      .setIssuer(config.apple.teamId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience(APPLE_ISSUER)
      .setSubject(this.getClientId(platform))
      .sign(privateKey);

    this.cachedClientSecrets[platform] = { jwt, expiresAt: exp };
    return jwt;
  }

  /**
   * Load and cache the Apple .p8 private key from disk for the given platform.
   */
  private async getPrivateKey(
    platform: ApplePlatform
  ): Promise<ApplePrivateKey> {
    const cached = this.cachedPrivateKeys[platform];
    if (cached) return cached;

    const path =
      platform === 'web'
        ? config.apple.webPrivateKeyPath
        : config.apple.privateKeyPath;
    const pem = await readFile(path, 'utf8');
    const key = await importPKCS8(pem, 'ES256');
    this.cachedPrivateKeys[platform] = key;
    return key;
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
