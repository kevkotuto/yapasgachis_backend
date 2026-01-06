import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/helpers';
import notificationService from '@/core/services/notification.service';
import notificationPreferencesService from '@/core/services/notification-preferences.service';
import expoPushService from '@/infrastructure/messaging/push/expo-push.service';
import logger from '@/infrastructure/monitoring/logger';
import type { DeviceType, NotificationType } from '@/utils/enums';

interface RegisterDeviceTokenBody {
  token: string;
  deviceType: DeviceType;
  deviceName?: string;
  deviceId?: string;
  appVersion?: string;
  osVersion?: string;
}

interface UnregisterDeviceTokenBody {
  token: string;
}

interface GetNotificationsQuery {
  read?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

/**
 * NotificationController - Handles notification-related HTTP requests
 */
export class NotificationController {
  /**
   * Register device token for push notifications
   * POST /api/v1/notifications/device-token
   */
  registerDeviceToken = asyncHandler(
    async (req: Request<object, object, RegisterDeviceTokenBody>, res: Response) => {
      const userId = req.user!.id;
      const { token, deviceType, deviceName, deviceId, appVersion, osVersion } = req.body;

      await expoPushService.registerDeviceToken({
        userId,
        token,
        deviceType,
        deviceName,
        deviceId,
        appVersion,
        osVersion,
      });

      logger.info('Device token registered via API', { userId, deviceType });

      res.status(201).json({
        success: true,
        message: 'Token enregistré avec succès',
      });
    }
  );

  /**
   * Unregister device token
   * DELETE /api/v1/notifications/device-token
   */
  unregisterDeviceToken = asyncHandler(
    async (req: Request<object, object, UnregisterDeviceTokenBody>, res: Response) => {
      const { token } = req.body;

      await expoPushService.unregisterDeviceToken(token);

      res.json({
        success: true,
        message: 'Token supprimé avec succès',
      });
    }
  );

  /**
   * Unregister all device tokens for current user (logout)
   * DELETE /api/v1/notifications/device-tokens
   */
  unregisterAllDeviceTokens = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await expoPushService.unregisterAllUserTokens(userId);

    res.json({
      success: true,
      message: 'Tous les tokens supprimés avec succès',
    });
  });

  /**
   * Get user notifications with pagination
   * GET /api/v1/notifications
   */
  getNotifications = asyncHandler(
    async (
      req: Request<object, object, object, GetNotificationsQuery>,
      res: Response
    ) => {
      const userId = req.user!.id;
      const { read, type, page, limit } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        read,
        type,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get unread notification count
   * GET /api/v1/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  });

  /**
   * Mark notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  markAsRead = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notification marquée comme lue',
        data: { notification },
      });
    }
  );

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues',
    });
  });

  /**
   * Delete a notification
   * DELETE /api/v1/notifications/:id
   */
  deleteNotification = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      await notificationService.delete(id, userId);

      res.json({
        success: true,
        message: 'Notification supprimée',
      });
    }
  );

  /**
   * Delete all notifications
   * DELETE /api/v1/notifications
   */
  deleteAllNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await notificationService.deleteAll(userId);

    res.json({
      success: true,
      message: 'Toutes les notifications supprimées',
    });
  });

  /**
   * Get notification preferences
   * GET /api/v1/notifications/preferences
   */
  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationPreferencesService.getPreferences(userId);

    res.json({
      success: true,
      data: { preferences },
    });
  });

  /**
   * Update notification preferences
   * PATCH /api/v1/notifications/preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationPreferencesService.updatePreferences(
      userId,
      req.body
    );

    logger.info('Notification preferences updated via API', {
      userId,
      updates: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'Préférences mises à jour',
      data: { preferences },
    });
  });
}

export default new NotificationController();
