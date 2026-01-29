import { z } from 'zod';

// ==================== PAYOUT CONFIGURATION VALIDATORS ====================

export const configurePayoutMethodSchema = z.object({
  body: z.object({
    payoutProviderId: z.string().uuid('ID du moyen de paiement invalide'),
    accountInfo: z
      .object({
        phoneNumber: z.string().optional(),
        accountId: z.string().optional(),
        accountName: z.string().optional(),
      })
      .refine((data) => data.phoneNumber || data.accountId, {
        message:
          'Au moins un numéro de téléphone ou un identifiant de compte est requis',
      }),
  }),
});

export const storePayoutMethodSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
  }),
  body: z.object({
    payoutProviderId: z.string().uuid('ID du moyen de paiement invalide'),
    accountInfo: z
      .object({
        phoneNumber: z.string().optional(),
        accountId: z.string().optional(),
        accountName: z.string().optional(),
      })
      .refine((data) => data.phoneNumber || data.accountId, {
        message:
          'Au moins un numéro de téléphone ou un identifiant de compte est requis',
      }),
  }),
});

export const storeIdParamSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
  }),
});

// Export types
export type ConfigurePayoutMethodInput = z.infer<
  typeof configurePayoutMethodSchema
>;
export type StorePayoutMethodInput = z.infer<typeof storePayoutMethodSchema>;
