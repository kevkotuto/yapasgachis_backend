import { z } from 'zod';

/**
 * Wave Payment Validators
 */

// Initiate Wave payment
export const initiateWavePaymentSchema = z.object({
  body: z
    .object({
      orderId: z.string().uuid('ID de commande invalide').optional(),
      bookingId: z.string().uuid('ID de réservation invalide').optional(),
      donationId: z.string().uuid('ID de donation invalide').optional(),
      amount: z.number().positive('Le montant doit être positif'),
      currency: z.enum(['XOF', 'XAF']).default('XOF'),
      successUrl: z.string().url('URL de succès invalide').optional(),
      errorUrl: z.string().url("URL d'erreur invalide").optional(),
    })
    .refine((data) => data.orderId || data.bookingId || data.donationId, {
      message: 'Au moins un ID (orderId, bookingId ou donationId) est requis',
    }),
});

export type InitiateWavePaymentInput = z.infer<
  typeof initiateWavePaymentSchema
>['body'];

// Get Wave payment status
export const getWavePaymentStatusSchema = z.object({
  params: z.object({
    checkoutId: z.string().min(1, 'ID de checkout requis'),
  }),
});

export type GetWavePaymentStatusInput = z.infer<
  typeof getWavePaymentStatusSchema
>['params'];

// Wave webhook (no validation needed, signature will be checked)
export const waveWebhookSchema = z.object({
  body: z.any(), // Will be validated after signature check
});
