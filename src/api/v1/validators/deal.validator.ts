import {
  DealCategory,
  DealStatus,
  BookingStatus,
  PaymentMethod,
} from '@prisma/client';
import { z } from 'zod';

// ==================== DEAL VALIDATORS ====================

export const createDealSchema = z.object({
  body: z
    .object({
      storeId: z.string().uuid().optional(),
      title: z
        .string()
        .min(5, 'Le titre doit avoir au moins 5 caractères')
        .max(100),
      description: z
        .string()
        .min(20, 'La description doit avoir au moins 20 caractères'),
      category: z.nativeEnum(DealCategory),
      images: z
        .array(z.string().url())
        .min(1, 'Au moins une image est requise'),
      originalPrice: z.number().positive('Le prix original doit être positif'),
      dealPrice: z.number().positive('Le prix du deal doit être positif'),
      includes: z.array(z.string()).optional(),
      excludes: z.array(z.string()).optional(),
      terms: z.string().optional(),
      availableFrom: z.string().datetime(),
      availableUntil: z.string().datetime(),
      availableSlots: z
        .array(
          z.object({
            day: z.string(),
            slots: z.array(z.string()),
          })
        )
        .optional(),
      totalQuantity: z
        .number()
        .int()
        .positive('La quantité doit être positive'),
      maxPerUser: z.number().int().positive().default(1),
      isOffPeakOnly: z.boolean().default(false),
      offPeakDays: z.array(z.string()).optional(),
      offPeakHours: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      requiresBooking: z.boolean().default(true),
      bookingLeadTime: z.number().int().min(0).default(0),
      cancellationHours: z.number().int().min(0).default(24),
      bookingMode: z.enum(['SINGLE_DATE', 'DATE_RANGE']).optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional(),
    })
    .refine((data) => data.dealPrice < data.originalPrice, {
      message: 'Le prix du deal doit être inférieur au prix original',
      path: ['dealPrice'],
    }),
});

export const updateDealSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(20).optional(),
    images: z.array(z.string().url()).min(1).optional(),
    originalPrice: z.number().positive().optional(),
    dealPrice: z.number().positive().optional(),
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
    terms: z.string().optional().nullable(),
    availableFrom: z.string().datetime().optional(),
    availableUntil: z.string().datetime().optional(),
    availableSlots: z
      .array(
        z.object({
          day: z.string(),
          slots: z.array(z.string()),
        })
      )
      .optional()
      .nullable(),
    totalQuantity: z.number().int().positive().optional(),
    maxPerUser: z.number().int().positive().optional(),
    isOffPeakOnly: z.boolean().optional(),
    offPeakDays: z.array(z.string()).optional().nullable(),
    offPeakHours: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .optional()
      .nullable(),
    bookingLeadTime: z.number().int().min(0).optional(),
    cancellationHours: z.number().int().min(0).optional(),
    contactPhone: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().nullable(),
  }),
});

export const dealIdParamSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
});

export const searchDealsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.nativeEnum(DealCategory).optional(),
    city: z.string().optional(),
    latitude: z.string().transform(Number).pipe(z.number()).optional(),
    longitude: z.string().transform(Number).pipe(z.number()).optional(),
    radius: z.string().transform(Number).pipe(z.number().positive()).optional(),
    minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxPrice: z
      .string()
      .transform(Number)
      .pipe(z.number().positive())
      .optional(),
    isOffPeakOnly: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
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
  }),
});

export const supplierDealsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(DealStatus).optional(),
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
  }),
});

// ==================== BOOKING VALIDATORS ====================

export const bookDealSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  body: z
    .object({
      bookingDate: z.string().datetime(),
      bookingEndDate: z.string().datetime().optional(),
      bookingSlot: z.string().optional(),
      quantity: z.number().int().positive().default(1),
      paymentMethod: z.enum(['WAVE', 'CASH_ON_DELIVERY']),
      userNotes: z.string().max(500).optional(),
    })
    .refine(
      (data) => {
        if (data.bookingEndDate) {
          return new Date(data.bookingEndDate) > new Date(data.bookingDate);
        }
        return true;
      },
      {
        message: 'La date de fin doit être postérieure à la date de début',
        path: ['bookingEndDate'],
      }
    ),
});

export const purchaseDealSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  body: z.object({
    quantity: z.number().int().positive().default(1),
    paymentMethod: z.enum(['WAVE', 'CASH_ON_DELIVERY']),
    userNotes: z.string().max(500).optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    bookingId: z.string().uuid(),
  }),
});

export const cancelBookingSchema = z.object({
  params: z.object({
    bookingId: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const validateBookingSchema = z.object({
  body: z.object({
    validationCode: z.string().min(6).max(20),
    staffId: z.string().optional(),
  }),
});

export const userBookingsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(BookingStatus).optional(),
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
  }),
});

export const supplierBookingsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(BookingStatus).optional(),
    storeId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
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
  }),
});

// ==================== ADMIN DEAL VALIDATORS ====================

export const adminModerateDealSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
});

export const adminRejectDealSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(10, 'La raison doit avoir au moins 10 caractères'),
  }),
});

// Export types
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type SearchDealsInput = z.infer<typeof searchDealsSchema>;
export type BookDealInput = z.infer<typeof bookDealSchema>;
export type PurchaseDealInput = z.infer<typeof purchaseDealSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ValidateBookingInput = z.infer<typeof validateBookingSchema>;
export type UserBookingsQueryInput = z.infer<typeof userBookingsQuerySchema>;
export type SupplierBookingsQueryInput = z.infer<
  typeof supplierBookingsQuerySchema
>;
