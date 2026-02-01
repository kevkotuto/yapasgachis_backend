import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

import { MobileMoneyProvider } from '@/infrastructure/payment/mobile-money.service';

/**
 * Order Validators
 * Zod schemas for order and payment requests
 */

// Create order
export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('ID de produit invalide'),
          quantity: z.number().int().min(1, 'La quantité minimum est 1'),
        })
      )
      .min(1, 'Au moins un produit est requis'),
    deliveryAddress: z
      .string()
      .min(5, "L'adresse doit contenir au moins 5 caractères")
      .max(500)
      .optional(),
    deliveryCity: z.string().min(2).max(100).optional(),
    deliveryPhone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Numéro de téléphone invalide')
      .optional(),
    deliveryMethod: z.enum(['PICKUP', 'DELIVERY'], {
      required_error: 'La méthode de livraison est requise',
    }),
    scheduledPickupTime: z
      .string()
      .regex(
        /^\d{2}:\d{2}-\d{2}:\d{2}$/,
        'Format invalide. Utilisez "HH:MM-HH:MM"'
      )
      .optional(),
    notes: z.string().max(1000).optional(),
    paymentProvider: z.nativeEnum(MobileMoneyProvider, {
      required_error: 'Le fournisseur de paiement est requis',
    }),
    paymentPhoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Numéro de téléphone invalide'),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];

// Get order by ID
export const getOrderByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de commande invalide'),
  }),
});

export type GetOrderByIdInput = z.infer<typeof getOrderByIdSchema>['params'];

// Get user orders
export const getUserOrdersSchema = z.object({
  query: z.object({
    storeId: z.string().uuid('ID de magasin invalide').optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type GetUserOrdersInput = z.infer<typeof getUserOrdersSchema>['query'];

// Update order status
export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de commande invalide'),
  }),
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      required_error: 'Le statut est requis',
    }),
  }),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// Cancel order
export const cancelOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de commande invalide'),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// Check payment status
export const checkPaymentStatusSchema = z.object({
  params: z.object({
    transactionId: z.string().min(1, 'Transaction ID requis'),
  }),
});

export type CheckPaymentStatusInput = z.infer<
  typeof checkPaymentStatusSchema
>['params'];

// Search orders
export const searchOrdersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    startDate: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
    endDate: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type SearchOrdersInput = z.infer<typeof searchOrdersSchema>['query'];

// Calculate delivery fee
export const calculateDeliveryFeeSchema = z.object({
  body: z.object({
    storeId: z.string().uuid('ID de magasin invalide').optional(),
    supplierId: z.string().uuid('ID de fournisseur invalide').optional(),
    deliveryLatitude: z.number().min(-90).max(90),
    deliveryLongitude: z.number().min(-180).max(180),
  }),
});

export type CalculateDeliveryFeeInput = z.infer<
  typeof calculateDeliveryFeeSchema
>['body'];

// Get supplier statistics
export const getSupplierStatisticsSchema = z.object({
  query: z.object({
    storeId: z.string().uuid('ID de magasin invalide').optional(),
  }),
});

export type GetSupplierStatisticsInput = z.infer<
  typeof getSupplierStatisticsSchema
>['query'];
