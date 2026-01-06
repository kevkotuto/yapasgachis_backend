import { z } from 'zod';

/**
 * Register device token validation
 */
export const registerDeviceTokenSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Token requis')
      .refine(
        (val) =>
          /^ExponentPushToken\[.+\]$/.test(val) ||
          /^ExpoPushToken\[.+\]$/.test(val),
        { message: 'Format de token Expo invalide' }
      ),
    deviceType: z.enum(['IOS', 'ANDROID', 'WEB'], {
      errorMap: () => ({ message: 'Type de device invalide' }),
    }),
    deviceName: z.string().max(100).optional(),
    deviceId: z.string().max(200).optional(),
    appVersion: z.string().max(20).optional(),
    osVersion: z.string().max(20).optional(),
  }),
});

/**
 * Unregister device token validation
 */
export const unregisterDeviceTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token requis'),
  }),
});

/**
 * Get notifications query validation
 */
export const getNotificationsSchema = z.object({
  query: z.object({
    read: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
    type: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 20)),
  }),
});

/**
 * Mark notification as read validation
 */
export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID notification invalide'),
  }),
});

/**
 * Delete notification validation
 */
export const deleteNotificationSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID notification invalide'),
  }),
});

/**
 * Update preferences validation
 */
export const updatePreferencesSchema = z.object({
  body: z
    .object({
      pushEnabled: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      orderUpdates: z.boolean().optional(),
      paymentAlerts: z.boolean().optional(),
      promotions: z.boolean().optional(),
      productAlerts: z.boolean().optional(),
      systemAnnouncements: z.boolean().optional(),
      quietHoursEnabled: z.boolean().optional(),
      quietHoursStart: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM invalide')
        .optional(),
      quietHoursEnd: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM invalide')
        .optional(),
    })
    .refine(
      (data) => {
        // If quiet hours enabled, both start and end must be provided
        if (data.quietHoursEnabled === true) {
          return !!data.quietHoursStart && !!data.quietHoursEnd;
        }
        return true;
      },
      { message: 'quietHoursStart et quietHoursEnd sont requis quand quietHoursEnabled est true' }
    ),
});
