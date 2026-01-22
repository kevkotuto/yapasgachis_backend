import { z } from 'zod';

// Schéma de mise à jour des paramètres
export const updateSettingsSchema = z.object({
  body: z
    .object({
      // Business
      defaultCommissionRate: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Commission par défaut (0-1, ex: 0.10 = 10%)'),
      premiumCommissionRate: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Commission premium (0-1, ex: 0.05 = 5%)'),
      defaultDeliveryFee: z
        .number()
        .min(0)
        .optional()
        .describe('Frais de livraison par défaut (FCFA)'),
      deliveryFeePerKm: z
        .number()
        .min(0)
        .optional()
        .describe('Frais de livraison par km (FCFA)'),
      maxDeliveryDistance: z
        .number()
        .min(1)
        .optional()
        .describe('Distance max de livraison (km)'),

      // Payment Fees
      wavePaymentFeeRate: z
        .number()
        .min(0)
        .max(0.1)
        .optional()
        .describe('Frais de paiement Wave (0-0.1, ex: 0.01 = 1%)'),
      waveTransferFeeRate: z
        .number()
        .min(0)
        .max(0.1)
        .optional()
        .describe('Frais de transfert Wave (0-0.1, ex: 0.01 = 1%)'),

      // Features
      graphqlEnabled: z.boolean().optional(),
      websocketEnabled: z.boolean().optional(),
      analyticsEnabled: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),

      // Rate Limiting
      rateLimitWindowMs: z
        .number()
        .min(1000)
        .optional()
        .describe('Fenêtre rate limit (ms)'),
      rateLimitMaxRequests: z
        .number()
        .min(1)
        .optional()
        .describe('Max requêtes par fenêtre'),
      authRateLimitMaxRequests: z
        .number()
        .min(1)
        .optional()
        .describe('Max requêtes auth par fenêtre'),

      // Security
      bcryptRounds: z
        .number()
        .min(10)
        .max(15)
        .optional()
        .describe('Rounds bcrypt (10-15)'),
      otpExpiration: z
        .number()
        .min(60000)
        .optional()
        .describe('Expiration OTP (ms)'),
      otpLength: z
        .number()
        .min(4)
        .max(8)
        .optional()
        .describe('Longueur OTP (4-8)'),

      // Cache TTL
      cacheTtlShort: z
        .number()
        .min(60)
        .optional()
        .describe('TTL cache court (secondes)'),
      cacheTtlMedium: z
        .number()
        .min(300)
        .optional()
        .describe('TTL cache moyen (secondes)'),
      cacheTtlLong: z
        .number()
        .min(3600)
        .optional()
        .describe('TTL cache long (secondes)'),

      // Pagination
      defaultPageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Taille page par défaut'),
      maxPageSize: z
        .number()
        .min(10)
        .max(500)
        .optional()
        .describe('Taille page max'),

      // Upload
      maxFileSize: z
        .number()
        .min(1048576)
        .optional()
        .describe('Taille max fichier (bytes)'),

      // Reason for change
      reason: z.string().max(500).optional().describe('Raison du changement'),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Au moins un paramètre doit être fourni',
    }),
});

// Schéma pour l'historique des modifications
export const getAuditHistorySchema = z.object({
  query: z.object({
    settingKey: z.string().optional(),
    adminId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
});

// Types inférés
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
export type GetAuditHistoryInput = z.infer<
  typeof getAuditHistorySchema
>['query'];
