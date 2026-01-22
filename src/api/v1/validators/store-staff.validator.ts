import { z } from 'zod';
import { StoreStaffRole, StoreStaffInviteStatus } from '@prisma/client';

// Invite staff member
export const inviteStaffSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
  }),
  body: z
    .object({
      email: z.string().email('Email invalide').optional(),
      phoneNumber: z
        .string()
        .regex(/^\+?[0-9]{8,15}$/, 'Numéro de téléphone invalide')
        .optional(),
      role: z.nativeEnum(StoreStaffRole, {
        errorMap: () => ({ message: 'Rôle invalide' }),
      }),
      customPermissions: z
        .object({
          canManageProducts: z.boolean().optional(),
          canManageOrders: z.boolean().optional(),
          canViewStats: z.boolean().optional(),
          canManageStaff: z.boolean().optional(),
          canManageDeals: z.boolean().optional(),
          canManageSettings: z.boolean().optional(),
        })
        .optional(),
      notes: z.string().max(500).optional(),
    })
    .refine((data) => data.email || data.phoneNumber, {
      message: 'Email ou numéro de téléphone requis',
    }),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// Accept/Reject invitation
export const respondInvitationSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token requis'),
  }),
});

export type RespondInvitationInput = z.infer<typeof respondInvitationSchema>;

// Update staff member
export const updateStaffSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
    userId: z.string().uuid('ID utilisateur invalide'),
  }),
  body: z.object({
    role: z.nativeEnum(StoreStaffRole).optional(),
    isActive: z.boolean().optional(),
    canManageProducts: z.boolean().optional(),
    canManageOrders: z.boolean().optional(),
    canViewStats: z.boolean().optional(),
    canManageStaff: z.boolean().optional(),
    canManageDeals: z.boolean().optional(),
    canManageSettings: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// Remove staff member
export const removeStaffSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
    userId: z.string().uuid('ID utilisateur invalide'),
  }),
});

export type RemoveStaffInput = z.infer<typeof removeStaffSchema>;

// List store staff
export const listStoreStaffSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
  }),
  query: z.object({
    role: z.nativeEnum(StoreStaffRole).optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    inviteStatus: z.nativeEnum(StoreStaffInviteStatus).optional(),
  }),
});

export type ListStoreStaffInput = z.infer<typeof listStoreStaffSchema>;

// Store ID param
export const storeIdSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID du magasin invalide'),
  }),
});

export type StoreIdInput = z.infer<typeof storeIdSchema>;
