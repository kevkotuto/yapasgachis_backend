import { PaymentProviderStatus } from '@prisma/client';
import { z } from 'zod';

// ==================== ADMIN VALIDATORS ====================

export const createPaymentProviderSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Le nom doit avoir au moins 2 caractères'),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(
        /^[a-z0-9-]+$/,
        'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets'
      ),
    description: z.string().optional(),
    logoUrl: z.string().url('URL du logo invalide').optional(),
    iconUrl: z.string().url("URL de l'icône invalide").optional(),
    isActive: z.boolean().default(true),
    status: z.nativeEnum(PaymentProviderStatus).default('ACTIVE'),
    paymentFeeRate: z
      .number()
      .min(0, 'Les frais de paiement doivent être positifs')
      .max(1, 'Les frais de paiement ne peuvent pas dépasser 100%')
      .default(0),
    transferFeeRate: z
      .number()
      .min(0, 'Les frais de transfert doivent être positifs')
      .max(1, 'Les frais de transfert ne peuvent pas dépasser 100%')
      .default(0),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    supportedCountries: z.array(z.string()).optional(),
    supportedCurrencies: z.array(z.string()).optional(),
    config: z.record(z.any()).optional(),
    displayOrder: z.number().int().min(0).default(0),
    isFeatured: z.boolean().default(false),
  }),
});

export const updatePaymentProviderSchema = z.object({
  params: z.object({
    providerId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().optional(),
    logoUrl: z.string().url().optional().nullable(),
    iconUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    status: z.nativeEnum(PaymentProviderStatus).optional(),
    paymentFeeRate: z.number().min(0).max(1).optional(),
    transferFeeRate: z.number().min(0).max(1).optional(),
    minAmount: z.number().min(0).optional().nullable(),
    maxAmount: z.number().min(0).optional().nullable(),
    supportedCountries: z.array(z.string()).optional().nullable(),
    supportedCurrencies: z.array(z.string()).optional().nullable(),
    config: z.record(z.any()).optional().nullable(),
    displayOrder: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const providerIdParamSchema = z.object({
  params: z.object({
    providerId: z.string().uuid(),
  }),
});

export const providerSlugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(2),
  }),
});

export const listPaymentProvidersSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive())
      .optional(),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive().max(100))
      .optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
    status: z.nativeEnum(PaymentProviderStatus).optional(),
    search: z.string().optional(),
  }),
});

export const updateDisplayOrderSchema = z.object({
  body: z.object({
    updates: z
      .array(
        z.object({
          id: z.string().uuid(),
          displayOrder: z.number().int().min(0),
        })
      )
      .min(1),
  }),
});

// Export types
export type CreatePaymentProviderInput = z.infer<
  typeof createPaymentProviderSchema
>;
export type UpdatePaymentProviderInput = z.infer<
  typeof updatePaymentProviderSchema
>;
export type ListPaymentProvidersInput = z.infer<
  typeof listPaymentProvidersSchema
>;
export type UpdateDisplayOrderInput = z.infer<typeof updateDisplayOrderSchema>;
