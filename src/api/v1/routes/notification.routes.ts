import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  registerDeviceTokenSchema,
  unregisterDeviceTokenSchema,
  getNotificationsSchema,
  markAsReadSchema,
  deleteNotificationSchema,
  updatePreferencesSchema,
} from '../validators/notification.validator';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== DEVICE TOKEN MANAGEMENT ====================

/**
 * Register device token for push notifications
 * POST /api/v1/notifications/device-token
 */
router.post(
  '/device-token',
  validate(registerDeviceTokenSchema),
  notificationController.registerDeviceToken
);

/**
 * Unregister a specific device token
 * DELETE /api/v1/notifications/device-token
 */
router.delete(
  '/device-token',
  validate(unregisterDeviceTokenSchema),
  notificationController.unregisterDeviceToken
);

/**
 * Unregister all device tokens for current user (for logout)
 * DELETE /api/v1/notifications/device-tokens
 */
router.delete('/device-tokens', notificationController.unregisterAllDeviceTokens);

// ==================== NOTIFICATION CRUD ====================

/**
 * Get user's notifications with pagination and filters
 * GET /api/v1/notifications
 *
 * Query params:
 * - read: boolean - Filter by read status
 * - type: string - Filter by notification type
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 */
router.get(
  '/',
  validate(getNotificationsSchema),
  notificationController.getNotifications
);

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * Mark a single notification as read
 * PATCH /api/v1/notifications/:id/read
 */
router.patch(
  '/:id/read',
  validate(markAsReadSchema),
  notificationController.markAsRead
);

/**
 * Delete all notifications
 * DELETE /api/v1/notifications
 */
router.delete('/', notificationController.deleteAllNotifications);

/**
 * Delete a single notification
 * DELETE /api/v1/notifications/:id
 */
router.delete(
  '/:id',
  validate(deleteNotificationSchema),
  notificationController.deleteNotification
);

// ==================== NOTIFICATION PREFERENCES ====================

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * Update notification preferences
 * PATCH /api/v1/notifications/preferences
 */
router.patch(
  '/preferences',
  validate(updatePreferencesSchema),
  notificationController.updatePreferences
);

export default router;
