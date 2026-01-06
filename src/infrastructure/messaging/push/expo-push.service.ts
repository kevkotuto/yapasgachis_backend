import axios from 'axios';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { DeviceType } from '@/utils/enums';
import type {
  RegisterDeviceTokenParams,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushReceipt,
} from '@/types/notification.types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/**
 * ExpoPushService - Handles push notifications via Expo Push API
 *
 * Features:
 * - Device token registration and management
 * - Push notification sending (single and batch)
 * - Automatic invalid token cleanup
 * - Receipt checking for delivery confirmation
 */
class ExpoPushService {
  private static instance: ExpoPushService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ExpoPushService {
    if (!ExpoPushService.instance) {
      ExpoPushService.instance = new ExpoPushService();
    }
    return ExpoPushService.instance;
  }

  /**
   * Register or update a device token for a user
   */
  async registerDeviceToken(params: RegisterDeviceTokenParams): Promise<void> {
    try {
      // Validate Expo token format
      if (!this.isValidExpoToken(params.token)) {
        throw new AppError(400, 'Format de token Expo invalide', 'INVALID_TOKEN_FORMAT');
      }

      // Upsert: update if exists, create if not
      await prisma.deviceToken.upsert({
        where: { token: params.token },
        update: {
          userId: params.userId,
          isActive: true,
          lastUsedAt: new Date(),
          deviceName: params.deviceName,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
        },
        create: {
          userId: params.userId,
          token: params.token,
          deviceType: params.deviceType as DeviceType,
          deviceId: params.deviceId,
          deviceName: params.deviceName,
          appVersion: params.appVersion,
          osVersion: params.osVersion,
        },
      });

      logger.info('Device token registered', {
        userId: params.userId,
        deviceType: params.deviceType,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to register device token', {
        userId: params.userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Échec de l\'enregistrement du token', 'TOKEN_REGISTRATION_FAILED');
    }
  }

  /**
   * Unregister/deactivate a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });

    logger.info('Device token unregistered', {
      token: token.substring(0, 30) + '...',
    });
  }

  /**
   * Unregister all tokens for a user (e.g., on logout)
   */
  async unregisterAllUserTokens(userId: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    logger.info('All device tokens unregistered for user', { userId });
  }

  /**
   * Get all active tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(
    userId: string,
    message: Omit<ExpoPushMessage, 'to'>
  ): Promise<ExpoPushTicket[]> {
    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      logger.debug('No active tokens for user', { userId });
      return [];
    }

    return this.send(tokens.map((token) => ({ ...message, to: token })));
  }

  /**
   * Send push notifications to multiple users
   */
  async sendToUsers(
    userIds: string[],
    message: Omit<ExpoPushMessage, 'to'>
  ): Promise<ExpoPushTicket[]> {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { token: true },
    });

    if (tokens.length === 0) {
      logger.debug('No active tokens for users', { userCount: userIds.length });
      return [];
    }

    return this.send(tokens.map((t) => ({ ...message, to: t.token })));
  }

  /**
   * Send push notifications (batch)
   * Handles chunking for Expo's 100 message limit per request
   */
  async send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) return [];

    try {
      // Expo allows max 100 messages per request
      const chunks = this.chunkArray(messages, 100);
      const allTickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const response = await axios.post<{ data: ExpoPushTicket[] }>(
          EXPO_PUSH_URL,
          chunk,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        allTickets.push(...response.data.data);

        // Handle invalid tokens asynchronously
        this.handleInvalidTokens(chunk, response.data.data).catch((err) => {
          logger.error('Failed to handle invalid tokens', { error: err.message });
        });
      }

      logger.info('Push notifications sent', {
        totalMessages: messages.length,
        successCount: allTickets.filter((t) => t.status === 'ok').length,
        errorCount: allTickets.filter((t) => t.status === 'error').length,
      });

      return allTickets;
    } catch (error) {
      logger.error('Failed to send push notifications', {
        error: (error as Error).message,
        messageCount: messages.length,
      });
      throw error;
    }
  }

  /**
   * Get push notification receipts for delivery confirmation
   */
  async getReceipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
    if (ticketIds.length === 0) return {};

    try {
      const response = await axios.post<{ data: Record<string, ExpoPushReceipt> }>(
        EXPO_RECEIPTS_URL,
        { ids: ticketIds },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get push receipts', {
        error: (error as Error).message,
        ticketCount: ticketIds.length,
      });
      return {};
    }
  }

  /**
   * Validate Expo push token format
   */
  private isValidExpoToken(token: string): boolean {
    return (
      /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token)
    );
  }

  /**
   * Handle invalid tokens by deactivating them
   */
  private async handleInvalidTokens(
    messages: ExpoPushMessage[],
    tickets: ExpoPushTicket[]
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const toField = messages[i].to;
        const token = Array.isArray(toField) ? toField[0] : toField;
        await this.unregisterDeviceToken(token);
        logger.info('Deactivated invalid token', {
          token: token.substring(0, 30) + '...',
        });
      }
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const expoPushService = ExpoPushService.getInstance();
export default expoPushService;
