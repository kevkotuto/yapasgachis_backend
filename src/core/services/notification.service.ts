import { Prisma } from '@prisma/client';

import notificationPreferencesService from '@/core/services/notification-preferences.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { notificationQueue } from '@/infrastructure/queue/queues/notification.queue';
import socketService from '@/infrastructure/websocket/socket.service';
import { AppError } from '@/middleware/error-handler.middleware';
import type {
  CreateNotificationParams,
  NotificationWithMeta,
  NotificationListResult,
  NotificationFilters,
} from '@/types/notification.types';
import { NotificationType, NotificationPriority } from '@/utils/enums';

/**
 * NotificationService - Central orchestrator for all notifications
 *
 * Features:
 * - Create notifications with optional push/email/realtime delivery
 * - Bulk notifications for multiple users
 * - Scheduled notifications
 * - Read/unread management
 * - User preference checking
 */
class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create and send a notification
   */
  async create(
    params: CreateNotificationParams
  ): Promise<NotificationWithMeta> {
    const {
      sendPush = true,
      sendEmail = false,
      sendRealtime = true,
      scheduledFor,
      ...notificationData
    } = params;

    // If scheduled for future, add to queue and create notification
    if (scheduledFor && scheduledFor > new Date()) {
      await notificationQueue.add(
        'scheduled-notification',
        { ...params, sendPush, sendEmail, sendRealtime },
        { delay: scheduledFor.getTime() - Date.now() }
      );

      // Create notification in DB with scheduledFor
      const { userId, data: notifData, ...restData } = notificationData;
      const notification = await prisma.notification.create({
        data: {
          ...restData,
          data: notifData as Prisma.InputJsonValue,
          user: { connect: { id: userId } },
          priority: params.priority || NotificationPriority.NORMAL,
          scheduledFor,
        },
      });

      return notification as unknown as NotificationWithMeta;
    }

    // Create notification in database
    const {
      userId: userIdForNotif,
      data: notifDataForCreate,
      ...restNotifData
    } = notificationData;
    const notification = await prisma.notification.create({
      data: {
        ...restNotifData,
        data: notifDataForCreate as Prisma.InputJsonValue,
        user: { connect: { id: userIdForNotif } },
        priority: params.priority || NotificationPriority.NORMAL,
      },
    });

    // Check user preferences and send push notification via queue
    if (sendPush) {
      const shouldSend = await notificationPreferencesService.shouldSendPush(
        params.userId,
        params.type
      );

      if (shouldSend) {
        await notificationQueue.add('send-push', {
          notificationId: notification.id,
          userId: params.userId,
          title: params.title,
          body: params.message,
          data: params.data,
          priority: params.priority,
        });
      }
    }

    // Send email notification via queue
    if (sendEmail) {
      const shouldSend = await notificationPreferencesService.shouldSendEmail(
        params.userId,
        params.type
      );

      if (shouldSend) {
        const user = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { email: true },
        });

        if (user?.email) {
          await notificationQueue.add('send-email', {
            notificationId: notification.id,
            userId: params.userId,
            email: user.email,
            subject: params.title,
            body: params.message,
          });
        }
      }
    }

    // Send real-time update via WebSocket
    if (sendRealtime) {
      socketService.sendToUser(params.userId, 'notification:new', {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt,
        },
      });

      // Update unread count
      const unreadCount = await this.getUnreadCount(params.userId);
      socketService.sendToUser(params.userId, 'notification:unread_count', {
        count: unreadCount,
      });
    }

    logger.info('Notification created', {
      notificationId: notification.id,
      userId: params.userId,
      type: params.type,
      sendPush,
      sendEmail,
      sendRealtime,
    });

    return notification as unknown as NotificationWithMeta;
  }

  /**
   * Create notifications for multiple users (bulk)
   */
  async createBulk(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    if (userIds.length === 0) return;

    // Add to queue for async processing
    await notificationQueue.add('bulk-notification', {
      userIds,
      ...params,
    });

    logger.info('Bulk notification queued', {
      userCount: userIds.length,
      type: params.type,
    });
  }

  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<NotificationListResult> {
    const { read, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Build where clause properly with AND to avoid Prisma conflicts
    const whereConditions: any[] = [
      { userId },
    ];

    // Add expiry filter (active notifications only)
    const now = new Date();
    whereConditions.push({
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    });

    // Add optional filters
    if (read !== undefined) {
      whereConditions.push({ read });
    }

    if (type) {
      whereConditions.push({ type });
    }

    const where = {
      AND: whereConditions
    };

    try {
      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, read: false } }),
      ]);

      return {
        notifications: notifications as unknown as NotificationWithMeta[],
        total,
        unreadCount,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error('Error fetching user notifications', {
        userId,
        filters,
        where,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithMeta> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppError(
        404,
        'Notification non trouvée',
        'NOTIFICATION_NOT_FOUND'
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });

    // Update unread count via WebSocket
    const unreadCount = await this.getUnreadCount(userId);
    socketService.sendToUser(userId, 'notification:unread_count', {
      count: unreadCount,
    });

    return updated as unknown as NotificationWithMeta;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    // Update unread count via WebSocket
    socketService.sendToUser(userId, 'notification:unread_count', { count: 0 });

    logger.debug('All notifications marked as read', { userId });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppError(
        404,
        'Notification non trouvée',
        'NOTIFICATION_NOT_FOUND'
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { userId },
    });

    logger.debug('All notifications deleted', { userId });
  }

  /**
   * Send notification to all admin users
   */
  async notifyAdmins(
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    });

    if (admins.length === 0) {
      logger.warn('No admin users found for notification');
      return;
    }

    await this.createBulk(
      admins.map((a) => a.id),
      {
        ...params,
        priority: params.priority || NotificationPriority.HIGH,
        sendEmail: true, // Always send email to admins
      }
    );
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
