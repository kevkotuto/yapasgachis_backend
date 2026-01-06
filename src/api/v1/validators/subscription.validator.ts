import { z } from 'zod';
import { SubscriptionTier, PromoCodeType, PromoCodeStatus } from '@prisma/client';

// ==================== SUBSCRIPTION PLAN VALIDATORS ====================

export const createSubscriptionPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Le nom doit avoir au moins 2 caractères'),
    tier: z.nativeEnum(SubscriptionTier),
    description: z.string().optional(),
    monthlyPrice: z.number().min(0, 'Le prix doit être positif'),
    yearlyPrice: z.number().min(0).optional(),
    maxStores: z.number().int().min(1).default(1),
    maxProducts: z.number().int().min(1).default(10),
    maxDeals: z.number().int().min(0).default(0),
    canCreateDeals: z.boolean().default(false),
    priorityListing: z.boolean().default(false),
    analyticsAccess: z.boolean().default(false),
    commissionRate: z.number().min(0).max(1).default(0.10),
    trialDays: z.number().int().min(0).default(0),
    isPublic: z.boolean().default(true),
  }),
});

export const updateSubscriptionPlanSchema = z.object({
  params: z.object({
    planId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    monthlyPrice: z.number().min(0).optional(),
    yearlyPrice: z.number().min(0).optional().nullable(),
    maxStores: z.number().int().min(1).optional(),
    maxProducts: z.number().int().min(1).optional(),
    maxDeals: z.number().int().min(0).optional(),
    canCreateDeals: z.boolean().optional(),
    priorityListing: z.boolean().optional(),
    analyticsAccess: z.boolean().optional(),
    commissionRate: z.number().min(0).max(1).optional(),
    trialDays: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }),
});

export const planIdParamSchema = z.object({
  params: z.object({
    planId: z.string().uuid(),
  }),
});

// ==================== PROMO CODE VALIDATORS ====================

export const createPromoCodeSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20).optional(),
    description: z.string().optional(),
    type: z.nativeEnum(PromoCodeType),
    value: z.number().positive('La valeur doit être positive'),
    applicablePlanId: z.string().uuid().optional(),
    reservedForSupplierId: z.string().uuid().optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().default(1),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional().nullable(),
  }),
});

export const updatePromoCodeSchema = z.object({
  params: z.object({
    promoCodeId: z.string().uuid(),
  }),
  body: z.object({
    description: z.string().optional(),
    maxUses: z.number().int().positive().optional().nullable(),
    maxUsesPerUser: z.number().int().positive().optional(),
    validUntil: z.string().datetime().optional().nullable(),
    status: z.nativeEnum(PromoCodeStatus).optional(),
  }),
});

export const promoCodeIdParamSchema = z.object({
  params: z.object({
    promoCodeId: z.string().uuid(),
  }),
});

export const validatePromoCodeSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20),
    planId: z.string().uuid().optional(),
  }),
});

export const searchPromoCodesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(PromoCodeStatus).optional(),
    type: z.nativeEnum(PromoCodeType).optional(),
    reservedForSupplierId: z.string().uuid().optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

export const createBulkPromoCodesSchema = z.object({
  body: z.object({
    count: z.number().int().min(1).max(100),
    prefix: z.string().min(2).max(10).optional(),
    type: z.nativeEnum(PromoCodeType),
    value: z.number().positive(),
    applicablePlanId: z.string().uuid().optional(),
    maxUsesPerCode: z.number().int().positive().optional(),
    validUntil: z.string().datetime().optional(),
  }),
});

// ==================== SUBSCRIPTION (SUPPLIER) VALIDATORS ====================

export const subscribeSchema = z.object({
  body: z.object({
    planId: z.string().uuid(),
    paymentMethod: z.string().min(1),
    billingPeriod: z.enum(['monthly', 'yearly']),
    promoCode: z.string().min(3).max(20).optional(),
  }),
});

export const renewSubscriptionSchema = z.object({
  body: z.object({
    billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  }),
});

// Export types
export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanSchema>;
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;
export type CreateBulkPromoCodesInput = z.infer<typeof createBulkPromoCodesSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>;
