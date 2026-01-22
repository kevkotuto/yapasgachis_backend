import { z } from 'zod';

// ==================== REFERRAL VALIDATORS ====================

export const createReferralCodeSchema = z.object({
  body: z.object({
    customCode: z
      .string()
      .min(4, 'Le code doit contenir au moins 4 caractères')
      .max(20, 'Le code doit contenir au maximum 20 caractères')
      .regex(
        /^[A-Z0-9]+$/,
        'Le code ne peut contenir que des lettres et chiffres'
      )
      .optional(),
    maxUses: z.number().int().min(1).optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const useReferralCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4, 'Code invalide').max(20),
  }),
});

export const validateCodeSchema = z.object({
  params: z.object({
    code: z.string().min(4).max(20),
  }),
});

export const referralHistorySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    status: z.enum(['PENDING', 'COMPLETED', 'REWARDED', 'EXPIRED']).optional(),
  }),
});

export const updateReferralCodeSchema = z.object({
  params: z.object({
    codeId: z.string(),
  }),
  body: z.object({
    isActive: z.boolean().optional(),
    maxUses: z.number().int().min(1).optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const codeIdParamSchema = z.object({
  params: z.object({
    codeId: z.string(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// Types
export type CreateReferralCodeInput = z.infer<
  typeof createReferralCodeSchema
>['body'];
export type UseReferralCodeInput = z.infer<
  typeof useReferralCodeSchema
>['body'];
export type UpdateReferralCodeInput = z.infer<
  typeof updateReferralCodeSchema
>['body'];
export type ReferralHistoryQuery = z.infer<
  typeof referralHistorySchema
>['query'];
