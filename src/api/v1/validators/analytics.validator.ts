import { z } from 'zod';

// ==================== ANALYTICS VALIDATORS ====================

export const trackEventSchema = z.object({
  body: z.object({
    eventType: z.string().min(1).max(100),
    eventData: z.record(z.any()),
  }),
});

export const dateRangeSchema = z.object({
  query: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    })
    .refine((data) => data.startDate <= data.endDate, {
      message: 'La date de début doit être antérieure à la date de fin',
    }),
});

export const dateRangeWithLimitSchema = z.object({
  query: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      limit: z.coerce.number().min(1).max(100).optional().default(10),
    })
    .refine((data) => data.startDate <= data.endDate, {
      message: 'La date de début doit être antérieure à la date de fin',
    }),
});

export const supplierIdSchema = z.object({
  params: z.object({
    supplierId: z.string().uuid(),
  }),
});

// Types
export type TrackEventInput = z.infer<typeof trackEventSchema>['body'];
export type DateRangeQuery = z.infer<typeof dateRangeSchema>['query'];
export type DateRangeWithLimitQuery = z.infer<
  typeof dateRangeWithLimitSchema
>['query'];
