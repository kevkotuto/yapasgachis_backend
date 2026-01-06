import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { NotificationType } from '@/utils/enums';
import type {
  NotificationPreferenceData,
  UpdatePreferencesParams,
} from '@/types/notification.types';
import { NotificationCategoryMap } from '@/types/notification.types';

/**
 * NotificationPreferencesService - Manages user notification preferences
 *
 * Features:
 * - Create default preferences for new users
 * - Update preferences
 * - Check if notification should be sent based on preferences
 * - Quiet hours support
 */
class NotificationPreferencesService {
  private static instance: NotificationPreferencesService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance = new NotificationPreferencesService();
    }
    return NotificationPreferencesService.instance;
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceData> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if not exist
    if (!prefs) {
      return this.createDefaultPreferences(userId);
    }

    return {
      pushEnabled: prefs.pushEnabled,
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      orderUpdates: prefs.orderUpdates,
      paymentAlerts: prefs.paymentAlerts,
      promotions: prefs.promotions,
      productAlerts: prefs.productAlerts,
      systemAnnouncements: prefs.systemAnnouncements,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
    };
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: UpdatePreferencesParams
  ): Promise<NotificationPreferenceData> {
    // Ensure preferences exist
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!existing) {
      await this.createDefaultPreferences(userId);
    }

    const updated = await prisma.notificationPreference.update({
      where: { userId },
      data: updates,
    });

    logger.info('Notification preferences updated', {
      userId,
      updates: Object.keys(updates),
    });

    return {
      pushEnabled: updated.pushEnabled,
      emailEnabled: updated.emailEnabled,
      smsEnabled: updated.smsEnabled,
      orderUpdates: updated.orderUpdates,
      paymentAlerts: updated.paymentAlerts,
      promotions: updated.promotions,
      productAlerts: updated.productAlerts,
      systemAnnouncements: updated.systemAnnouncements,
      quietHoursEnabled: updated.quietHoursEnabled,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
    };
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreferenceData> {
    const prefs = await prisma.notificationPreference.create({
      data: { userId },
    });

    logger.debug('Created default notification preferences', { userId });

    return {
      pushEnabled: prefs.pushEnabled,
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      orderUpdates: prefs.orderUpdates,
      paymentAlerts: prefs.paymentAlerts,
      promotions: prefs.promotions,
      productAlerts: prefs.productAlerts,
      systemAnnouncements: prefs.systemAnnouncements,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
    };
  }

  /**
   * Check if push notification should be sent based on user preferences
   */
  async shouldSendPush(
    userId: string,
    notificationType: NotificationType
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check global push toggle
    if (!prefs.pushEnabled) {
      return false;
    }

    // Check category-specific toggle
    const category = NotificationCategoryMap[notificationType];
    if (category && !prefs[category]) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHoursEnabled && this.isInQuietHours(prefs)) {
      return false;
    }

    return true;
  }

  /**
   * Check if email notification should be sent based on user preferences
   */
  async shouldSendEmail(
    userId: string,
    notificationType: NotificationType
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check global email toggle
    if (!prefs.emailEnabled) {
      return false;
    }

    // Check category-specific toggle
    const category = NotificationCategoryMap[notificationType];
    if (category && !prefs[category]) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(prefs: NotificationPreferenceData): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    // Use Africa/Abidjan timezone (UTC+0)
    const currentTime = now.toLocaleTimeString('fr-FR', {
      timeZone: 'Africa/Abidjan',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Delete user preferences (for account deletion)
   */
  async deletePreferences(userId: string): Promise<void> {
    await prisma.notificationPreference.deleteMany({
      where: { userId },
    });
  }
}

export const notificationPreferencesService =
  NotificationPreferencesService.getInstance();
export default notificationPreferencesService;
