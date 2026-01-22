import { z } from 'zod';

export const createPOSSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    type: z.enum(['MAIN', 'BRANCH', 'KIOSK', 'WAREHOUSE', 'PICKUP_POINT']),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    commune: z.string().min(1).max(100),
    neighborhood: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phoneNumber: z.string().max(20).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().default(true),
    acceptsOrders: z.boolean().default(true),
    acceptsPickup: z.boolean().default(true),
    acceptsDelivery: z.boolean().default(true),
    description: z.string().max(1000).optional(),
    images: z.array(z.string().url()).optional(),
    amenities: z.array(z.string()).optional(),
  }),
});

export const updatePOSSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    type: z
      .enum(['MAIN', 'BRANCH', 'KIOSK', 'WAREHOUSE', 'PICKUP_POINT'])
      .optional(),
    address: z.string().min(1).max(500).optional(),
    city: z.string().min(1).max(100).optional(),
    commune: z.string().min(1).max(100).optional(),
    neighborhood: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    phoneNumber: z.string().max(20).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
    acceptsOrders: z.boolean().optional(),
    acceptsPickup: z.boolean().optional(),
    acceptsDelivery: z.boolean().optional(),
    description: z.string().max(1000).optional(),
    images: z.array(z.string().url()).optional(),
    amenities: z.array(z.string()).optional(),
  }),
});

export const posIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const supplierIdSchema = z.object({
  params: z.object({ supplierId: z.string().uuid() }),
  query: z.object({ activeOnly: z.enum(['true', 'false']).optional() }),
});

export const searchPOSSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(100).optional(),
    city: z.string().optional(),
    commune: z.string().optional(),
    type: z
      .enum(['MAIN', 'BRANCH', 'KIOSK', 'WAREHOUSE', 'PICKUP_POINT'])
      .optional(),
    acceptsOrders: z.coerce.boolean().optional(),
    acceptsPickup: z.coerce.boolean().optional(),
    acceptsDelivery: z.coerce.boolean().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

export const findNearestSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().min(1).max(100).optional(),
  }),
});

export type CreatePOSInput = z.infer<typeof createPOSSchema>['body'];
export type UpdatePOSInput = z.infer<typeof updatePOSSchema>['body'];
