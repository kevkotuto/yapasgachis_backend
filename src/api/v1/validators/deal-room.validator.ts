import { z } from 'zod';

/**
 * Deal Room Validators
 * Zod schemas for deal room-related requests
 */

// Create deal room
export const createDealRoomSchema = z.object({
  params: z.object({
    dealId: z.string().uuid('ID de deal invalide'),
  }),
  body: z.object({
    title: z
      .string()
      .min(3, 'Le titre doit contenir au moins 3 caractères')
      .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
    description: z
      .string()
      .max(2000, 'La description ne peut pas dépasser 2000 caractères')
      .optional(),
    price: z
      .number()
      .positive('Le prix doit être positif')
      .min(0.01, 'Le prix minimum est 0.01'),
    capacity: z.string().max(50).optional(),
    size: z.string().max(50).optional(),
    floor: z.string().max(100).optional(),
    amenities: z.array(z.string().max(100)).max(50).optional(),
    bedTypes: z.array(z.string().max(100)).max(20).optional(),
    images: z.array(z.string().url()).max(20).optional(),
    maxOccupancy: z.number().int().positive().optional(),
    isAvailable: z.boolean().optional(),
  }),
});

export type CreateDealRoomInput = z.infer<typeof createDealRoomSchema>;

// Update deal room
export const updateDealRoomSchema = z.object({
  params: z.object({
    dealId: z.string().uuid('ID de deal invalide'),
    roomId: z.string().uuid('ID de chambre invalide'),
  }),
  body: z
    .object({
      title: z.string().min(3).max(200).optional(),
      description: z.string().max(2000).optional(),
      price: z.number().positive().min(0.01).optional(),
      capacity: z.string().max(50).optional(),
      size: z.string().max(50).optional(),
      floor: z.string().max(100).optional(),
      amenities: z.array(z.string().max(100)).max(50).optional(),
      bedTypes: z.array(z.string().max(100)).max(20).optional(),
      images: z.array(z.string().url()).max(20).optional(),
      maxOccupancy: z.number().int().positive().optional(),
      isAvailable: z.boolean().optional(),
    })
    .partial(),
});

export type UpdateDealRoomInput = z.infer<typeof updateDealRoomSchema>;

// Get rooms by deal ID
export const getRoomsByDealIdSchema = z.object({
  params: z.object({
    dealId: z.string().uuid('ID de deal invalide'),
  }),
  query: z.object({
    availableOnly: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
  }),
});

export type GetRoomsByDealIdInput = z.infer<typeof getRoomsByDealIdSchema>;

// Get room by ID
export const getRoomByIdSchema = z.object({
  params: z.object({
    dealId: z.string().uuid('ID de deal invalide'),
    roomId: z.string().uuid('ID de chambre invalide'),
  }),
});

export type GetRoomByIdInput = z.infer<typeof getRoomByIdSchema>;

// Delete room
export const deleteRoomSchema = z.object({
  params: z.object({
    dealId: z.string().uuid('ID de deal invalide'),
    roomId: z.string().uuid('ID de chambre invalide'),
  }),
});

export type DeleteRoomInput = z.infer<typeof deleteRoomSchema>;
