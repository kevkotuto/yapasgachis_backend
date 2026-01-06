import { UserRole, UserStatus, ProductStatus } from '@prisma/client';
import { z } from 'zod';

// ==================== USER MANAGEMENT VALIDATORS ====================

export const getUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    sortBy: z
      .enum(['createdAt', 'firstName', 'lastName'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.nativeEnum(UserStatus),
    reason: z.string().max(500).optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    role: z.nativeEnum(UserRole),
  }),
});

// ==================== SUPPLIER MANAGEMENT VALIDATORS ====================

export const getSuppliersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isVerified: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    supplierType: z.string().optional(),
    subscriptionTier: z.string().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

export const supplierIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const rejectSupplierSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(10).max(500),
  }),
});

export const updateSupplierCommissionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    commissionRate: z.number().min(0).max(1),
  }),
});

// ==================== PRODUCT MODERATION VALIDATORS ====================

export const getProductsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    category: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const rejectProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(10).max(500),
  }),
});

export const updateProductStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.nativeEnum(ProductStatus),
  }),
});

// ==================== BULK OPERATIONS VALIDATORS ====================

export const bulkApproveProductsSchema = z.object({
  body: z.object({
    productIds: z.array(z.string().uuid()).min(1).max(100),
  }),
});

export const bulkVerifySuppliersSchema = z.object({
  body: z.object({
    supplierIds: z.array(z.string().uuid()).min(1).max(100),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

// ==================== ADMIN USER CREATION VALIDATORS ====================

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().max(50).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
    password: z.string().min(8).optional(),
    role: z.nativeEnum(UserRole),
    status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
    emailVerified: z.boolean().optional().default(true),
    phoneVerified: z.boolean().optional().default(true),
  }).refine(
    (data) => data.email || data.phoneNumber,
    { message: 'Email ou numéro de téléphone requis' }
  ),
});

export const forceVerifyUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    verifyEmail: z.boolean().optional(),
    verifyPhone: z.boolean().optional(),
    verifyKyc: z.boolean().optional(),
    activateUser: z.boolean().optional(),
  }).refine(
    (data) => data.verifyEmail || data.verifyPhone || data.verifyKyc || data.activateUser,
    { message: 'Au moins une option de vérification requise' }
  ),
});

// ==================== KYC MANAGEMENT VALIDATORS ====================

export const rejectKycSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(10).max(500),
  }),
});

export const getPendingKycSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

// Types
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type ForceVerifyUserInput = z.infer<typeof forceVerifyUserSchema>['body'];
export type RejectKycInput = z.infer<typeof rejectKycSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>['body'];
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>['body'];
export type GetSuppliersQuery = z.infer<typeof getSuppliersSchema>['query'];
export type RejectSupplierInput = z.infer<typeof rejectSupplierSchema>['body'];
export type UpdateSupplierCommissionInput = z.infer<
  typeof updateSupplierCommissionSchema
>['body'];
export type GetProductsQuery = z.infer<typeof getProductsSchema>['query'];
export type RejectProductInput = z.infer<typeof rejectProductSchema>['body'];
export type UpdateProductStatusInput = z.infer<
  typeof updateProductStatusSchema
>['body'];
