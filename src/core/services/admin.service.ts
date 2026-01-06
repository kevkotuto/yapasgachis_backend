import { UserRole, UserStatus, ProductStatus, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Admin Service
 * Business logic for admin operations (users, suppliers, products moderation)
 */
export class AdminService {
  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users with filters
   */
  async getUsers(options: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'firstName' | 'lastName';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      role,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
      deletedAt: null,
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          phoneVerified: true,
          emailVerified: true,
          kycVerified: true,
          city: true,
          commune: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
              donations: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user details by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        supplierProfile: true,
        associationProfile: true,
        advertiserProfile: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        donations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            donations: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    userId: string,
    status: UserStatus,
    reason?: string,
    adminId?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé');
    }

    // Prevent changing status of SUPER_ADMIN
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        403,
        "Impossible de modifier le statut d'un super administrateur"
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    logger.info('User status updated by admin', {
      userId,
      previousStatus: user.status,
      newStatus: status,
      reason,
      adminId,
    });

    return updatedUser;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole, adminId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé');
    }

    // Prevent changing SUPER_ADMIN role
    if (user.role === UserRole.SUPER_ADMIN || role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        403,
        "Impossible d'attribuer ou retirer le rôle de super administrateur"
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    logger.info('User role updated by admin', {
      userId,
      previousRole: user.role,
      newRole: role,
      adminId,
    });

    return updatedUser;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, adminId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        403,
        'Impossible de supprimer un super administrateur'
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: UserStatus.DEACTIVATED,
      },
    });

    logger.info('User deleted by admin', {
      userId,
      adminId,
    });

    return { success: true };
  }

  // ==================== SUPPLIER MANAGEMENT ====================

  /**
   * Get pending supplier verifications
   */
  async getPendingSuppliers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      prisma.supplierProfile.findMany({
        where: { isVerified: false },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          stores: {
            select: {
              id: true,
              name: true,
              city: true,
              commune: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.supplierProfile.count({ where: { isVerified: false } }),
    ]);

    return {
      suppliers,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all suppliers with filters
   */
  async getSuppliers(options: {
    search?: string;
    isVerified?: boolean;
    supplierType?: string;
    subscriptionTier?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      isVerified,
      supplierType,
      subscriptionTier,
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.SupplierProfileWhereInput = {
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { user: { phoneNumber: { contains: search } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(isVerified !== undefined && { isVerified }),
      ...(supplierType && { supplierType: supplierType as any }),
      ...(subscriptionTier && { subscriptionTier: subscriptionTier as any }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplierProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          _count: {
            select: {
              products: true,
              stores: true,
              orders: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierProfile.count({ where }),
    ]);

    return {
      suppliers,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Verify supplier
   */
  async verifySupplier(supplierId: string, adminId: string) {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    if (supplier.isVerified) {
      throw new AppError(400, 'Ce fournisseur est déjà vérifié');
    }

    const updatedSupplier = await prisma.supplierProfile.update({
      where: { id: supplierId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    logger.info('Supplier verified by admin', {
      supplierId,
      userId: supplier.userId,
      adminId,
    });

    // TODO: Send notification to supplier

    return updatedSupplier;
  }

  /**
   * Reject supplier verification
   */
  async rejectSupplier(supplierId: string, reason: string, adminId: string) {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    const updatedSupplier = await prisma.supplierProfile.update({
      where: { id: supplierId },
      data: {
        isVerified: false,
        rejectionReason: reason,
      },
    });

    logger.info('Supplier verification rejected by admin', {
      supplierId,
      userId: supplier.userId,
      reason,
      adminId,
    });

    // TODO: Send notification to supplier

    return updatedSupplier;
  }

  /**
   * Update supplier commission rate
   */
  async updateSupplierCommission(
    supplierId: string,
    commissionRate: number,
    adminId: string
  ) {
    if (commissionRate < 0 || commissionRate > 1) {
      throw new AppError(
        400,
        'Le taux de commission doit être entre 0 et 1 (0% - 100%)'
      );
    }

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    const updatedSupplier = await prisma.supplierProfile.update({
      where: { id: supplierId },
      data: { commissionRate },
    });

    logger.info('Supplier commission rate updated by admin', {
      supplierId,
      previousRate: supplier.commissionRate,
      newRate: commissionRate,
      adminId,
    });

    return updatedSupplier;
  }

  // ==================== PRODUCT MODERATION ====================

  /**
   * Get products pending moderation
   */
  async getProductsForModeration(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get products with DRAFT status from verified suppliers
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: ProductStatus.DRAFT,
          supplier: { isVerified: true },
        },
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              supplierType: true,
              user: {
                select: {
                  phoneNumber: true,
                  email: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.product.count({
        where: {
          status: ProductStatus.DRAFT,
          supplier: { isVerified: true },
        },
      }),
    ]);

    return {
      products,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all products with filters
   */
  async getProducts(options: {
    search?: string;
    status?: ProductStatus;
    category?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      status,
      category,
      supplierId,
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(category && { category: category as any }),
      ...(supplierId && { supplierId }),
      deletedAt: null,
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve product (change status to ACTIVE)
   */
  async approveProduct(productId: string, adminId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { supplier: true },
    });

    if (!product) {
      throw new AppError(404, 'Produit non trouvé');
    }

    if (product.status !== ProductStatus.DRAFT) {
      throw new AppError(
        400,
        'Seuls les produits en brouillon peuvent être approuvés'
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ACTIVE },
    });

    logger.info('Product approved by admin', {
      productId,
      supplierId: product.supplierId,
      adminId,
    });

    // TODO: Send notification to supplier

    return updatedProduct;
  }

  /**
   * Reject product (archive it)
   */
  async rejectProduct(productId: string, reason: string, adminId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { supplier: true },
    });

    if (!product) {
      throw new AppError(404, 'Produit non trouvé');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });

    logger.info('Product rejected by admin', {
      productId,
      supplierId: product.supplierId,
      reason,
      adminId,
    });

    // TODO: Send notification to supplier with reason

    return updatedProduct;
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    productId: string,
    status: ProductStatus,
    adminId: string
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, 'Produit non trouvé');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    logger.info('Product status updated by admin', {
      productId,
      previousStatus: product.status,
      newStatus: status,
      adminId,
    });

    return updatedProduct;
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string, adminId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, 'Produit non trouvé');
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });

    logger.info('Product deleted by admin', {
      productId,
      adminId,
    });

    return { success: true };
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk approve products
   */
  async bulkApproveProducts(productIds: string[], adminId: string) {
    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.DRAFT,
      },
      data: { status: ProductStatus.ACTIVE },
    });

    logger.info('Products bulk approved by admin', {
      productIds,
      count: result.count,
      adminId,
    });

    return { count: result.count };
  }

  /**
   * Bulk verify suppliers
   */
  async bulkVerifySuppliers(supplierIds: string[], adminId: string) {
    const result = await prisma.supplierProfile.updateMany({
      where: {
        id: { in: supplierIds },
        isVerified: false,
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    logger.info('Suppliers bulk verified by admin', {
      supplierIds,
      count: result.count,
      adminId,
    });

    return { count: result.count };
  }

  // ==================== ADMIN USER CREATION ====================

  /**
   * Create a new user (admin only)
   * Allows creating users with any role and bypassing OTP verification
   */
  async createUser(params: {
    firstName: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    role: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    adminId: string;
  }) {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role,
      status = UserStatus.ACTIVE,
      emailVerified = true,
      phoneVerified = true,
      adminId,
    } = params;

    // Check if email or phone already exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new AppError(400, 'Un utilisateur avec cet email existe déjà');
      }
    }

    if (phoneNumber) {
      const existingPhone = await prisma.user.findUnique({ where: { phoneNumber } });
      if (existingPhone) {
        throw new AppError(400, 'Un utilisateur avec ce numéro existe déjà');
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password) {
      const bcrypt = await import('bcrypt');
      passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        passwordHash,
        role,
        status,
        emailVerified,
        phoneVerified,
        kycVerified: role === UserRole.CLIENT,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    logger.info('User created by admin', {
      userId: user.id,
      role,
      adminId,
    });

    return user;
  }

  /**
   * Force verify a user (bypass OTP)
   */
  async forceVerifyUser(
    userId: string,
    options: {
      verifyEmail?: boolean;
      verifyPhone?: boolean;
      verifyKyc?: boolean;
      activateUser?: boolean;
    },
    adminId: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé');
    }

    const updates: any = {};
    if (options.verifyEmail) updates.emailVerified = true;
    if (options.verifyPhone) updates.phoneVerified = true;
    if (options.verifyKyc) updates.kycVerified = true;
    if (options.activateUser) updates.status = UserStatus.ACTIVE;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true,
        updatedAt: true,
      },
    });

    logger.info('User verified by admin', {
      userId,
      verifications: options,
      adminId,
    });

    return updatedUser;
  }

  // ==================== KYC MANAGEMENT ====================

  /**
   * Verify supplier KYC documents
   */
  async verifySupplierKyc(supplierId: string, adminId: string) {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    if (supplier.kycStatus === 'VERIFIED') {
      throw new AppError(400, 'Le KYC est déjà vérifié');
    }

    const updated = await prisma.supplierProfile.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'VERIFIED',
        kycVerifiedAt: new Date(),
        kycRejectionReason: null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Also verify the user's KYC flag
    await prisma.user.update({
      where: { id: supplier.userId },
      data: { kycVerified: true },
    });

    logger.info('Supplier KYC verified by admin', {
      supplierId,
      userId: supplier.userId,
      adminId,
    });

    return updated;
  }

  /**
   * Reject supplier KYC documents
   */
  async rejectSupplierKyc(
    supplierId: string,
    reason: string,
    adminId: string
  ) {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    const updated = await prisma.supplierProfile.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'REJECTED',
        kycRejectionReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info('Supplier KYC rejected by admin', {
      supplierId,
      reason,
      adminId,
    });

    return updated;
  }

  /**
   * Get suppliers pending KYC verification
   */
  async getSuppliersWithPendingKyc(options: {
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = {
      kycStatus: 'SUBMITTED',
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplierProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { kycSubmittedAt: 'asc' },
      }),
      prisma.supplierProfile.count({ where }),
    ]);

    return {
      suppliers,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new AdminService();
