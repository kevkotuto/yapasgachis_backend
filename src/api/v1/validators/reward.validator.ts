import { z } from 'zod';

// ==================== REWARD VALIDATORS ====================

export const redeemPointsSchema = z.object({
  body: z.object({
    points: z.number().int().min(1, 'Au moins 1 point requis'),
    rewardType: z.enum(['DISCOUNT', 'VOUCHER', 'GIFT']),
    orderId: z.string().uuid().optional(),
  }),
});

export const transactionHistorySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    type: z.enum(['EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED']).optional(),
  }),
});

export const tierParamSchema = z.object({
  params: z.object({
    tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  }),
});

export const calculateDiscountSchema = z.object({
  body: z.object({
    points: z.number().int().min(1, 'Au moins 1 point requis'),
  }),
});

// Admin schemas
export const adminAwardPointsSchema = z.object({
  body: z.object({
    userId: z.string().uuid('User ID invalide'),
    amount: z.number().int().min(1, 'Le montant doit être positif'),
    source: z.enum([
      'PURCHASE',
      'REFERRAL',
      'DONATION',
      'REVIEW',
      'SIGNUP_BONUS',
      'DAILY_LOGIN',
      'ACHIEVEMENT',
    ]),
    description: z.string().min(1, 'Description requise').max(500),
    reference: z.string().optional(),
  }),
});

export const adminUserIdSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// Types
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>['body'];
export type TransactionHistoryQuery = z.infer<
  typeof transactionHistorySchema
>['query'];
export type AdminAwardPointsInput = z.infer<
  typeof adminAwardPointsSchema
>['body'];
