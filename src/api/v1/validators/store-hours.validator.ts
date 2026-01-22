import { z } from 'zod';

// ==================== STORE HOURS VALIDATORS ====================

const timeSlotSchema = z.object({
  open: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format invalide (HH:MM)'),
  close: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format invalide (HH:MM)'),
});

const dayHoursSchema = z.object({
  day: z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]),
  isClosed: z.boolean(),
  slots: z.array(timeSlotSchema),
});

export const createStoreHoursSchema = z.object({
  body: z.object({
    storeId: z.string().uuid('Store ID invalide'),
    hours: z.array(dayHoursSchema).length(7, '7 jours requis'),
    timezone: z.string().optional(),
    specialNotes: z.string().max(500).optional(),
  }),
});

export const updateStoreHoursSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
  body: z.object({
    hours: z.array(dayHoursSchema).length(7, '7 jours requis').optional(),
    timezone: z.string().optional(),
    specialNotes: z.string().max(500).optional(),
  }),
});

export const storeIdParamSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
});

export const createSpecialClosureSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
  body: z.object({
    date: z.coerce.date(),
    reason: z.string().min(1, 'Raison requise').max(200),
    allDay: z.boolean(),
    from: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    to: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
  }),
});

export const specialClosuresQuerySchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
  query: z.object({
    futureOnly: z.enum(['true', 'false']).optional(),
  }),
});

export const closureIdParamSchema = z.object({
  params: z.object({
    closureId: z.string().uuid(),
  }),
});

// Types
export type CreateStoreHoursInput = z.infer<
  typeof createStoreHoursSchema
>['body'];
export type UpdateStoreHoursInput = z.infer<
  typeof updateStoreHoursSchema
>['body'];
export type CreateSpecialClosureInput = z.infer<
  typeof createSpecialClosureSchema
>['body'];
