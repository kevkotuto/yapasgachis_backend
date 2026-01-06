import { OAuth2Client, TokenPayload } from 'google-auth-library';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';

interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret
    );
  }

  /**
   * Verify Google ID token (from mobile app or web)
   * @param idToken - Google ID token from client
   * @returns Google user info
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: [
          config.google.clientId,
          config.google.iosClientId,
          config.google.androidClientId,
        ].filter(Boolean),
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new AppError(
          APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
          'Token Google invalide',
          'INVALID_GOOGLE_TOKEN'
        );
      }

      return this.extractUserInfo(payload);
    } catch (error) {
      logger.error('Google token verification failed', { error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Échec de la vérification du token Google',
        'GOOGLE_AUTH_FAILED'
      );
    }
  }

  /**
   * Verify Google access token (alternative method)
   * @param accessToken - Google access token
   * @returns Google user info
   */
  async verifyAccessToken(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new AppError(
          APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
          'Token Google invalide',
          'INVALID_GOOGLE_TOKEN'
        );
      }

      const userInfo = await response.json();

      return {
        googleId: userInfo.sub,
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || '',
        lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' '),
        avatar: userInfo.picture,
        emailVerified: userInfo.email_verified || false,
      };
    } catch (error) {
      logger.error('Google access token verification failed', { error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Échec de la vérification du token Google',
        'GOOGLE_AUTH_FAILED'
      );
    }
  }

  /**
   * Extract user info from Google token payload
   */
  private extractUserInfo(payload: TokenPayload): GoogleUserInfo {
    if (!payload.sub || !payload.email) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST,
        'Informations Google incomplètes',
        'INCOMPLETE_GOOGLE_DATA'
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.name?.split(' ')[0] || '',
      lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' '),
      avatar: payload.picture,
      emailVerified: payload.email_verified || false,
    };
  }
}

export default new GoogleAuthService();
