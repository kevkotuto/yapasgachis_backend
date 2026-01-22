import { Request, Response } from 'express';

import {
  GetUsersQuery,
  UpdateUserStatusInput,
  UpdateUserRoleInput,
  GetSuppliersQuery,
  RejectSupplierInput,
  UpdateSupplierCommissionInput,
  GetProductsQuery,
  RejectProductInput,
  UpdateProductStatusInput,
} from '../validators/admin.validator';

import adminService from '@/core/services/admin.service';
import analyticsService from '@/core/services/analytics.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Admin Controller
 * Handles admin-related HTTP requests
 */
export class AdminController {
  // ==================== DASHBOARD ====================

  /**
   * Get dashboard statistics
   * GET /api/v1/admin/dashboard/stats
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await analyticsService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get impact metrics
   * GET /api/v1/admin/dashboard/impact
   */
  getImpactMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    const metrics = await analyticsService.getImpactMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    res.json({
      success: true,
      data: metrics,
    });
  });

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users
   * GET /api/v1/admin/users
   */
  getUsers = asyncHandler(
    async (req: Request<{}, {}, {}, GetUsersQuery>, res: Response) => {
      const result = await adminService.getUsers(req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get user by ID
   * GET /api/v1/admin/users/:id
   */
  getUserById = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;

      const user = await adminService.getUserById(id);

      res.json({
        success: true,
        data: { user },
      });
    }
  );

  /**
   * Update user status
   * PATCH /api/v1/admin/users/:id/status
   */
  updateUserStatus = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateUserStatusInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { status, reason } = req.body;

      const user = await adminService.updateUserStatus(
        id,
        status,
        reason,
        adminId
      );

      logger.info('User status updated via admin API', {
        userId: id,
        status,
        adminId,
      });

      res.json({
        success: true,
        message: 'Statut utilisateur mis à jour',
        data: { user },
      });
    }
  );

  /**
   * Update user role
   * PATCH /api/v1/admin/users/:id/role
   */
  updateUserRole = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateUserRoleInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { role } = req.body;

      const user = await adminService.updateUserRole(id, role, adminId);

      logger.info('User role updated via admin API', {
        userId: id,
        role,
        adminId,
      });

      res.json({
        success: true,
        message: 'Rôle utilisateur mis à jour',
        data: { user },
      });
    }
  );

  /**
   * Delete user
   * DELETE /api/v1/admin/users/:id
   */
  deleteUser = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;

      await adminService.deleteUser(id, adminId);

      logger.info('User deleted via admin API', {
        userId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Utilisateur supprimé',
      });
    }
  );

  // ==================== SUPPLIER MANAGEMENT ====================

  /**
   * Get all suppliers
   * GET /api/v1/admin/suppliers
   */
  getSuppliers = asyncHandler(
    async (req: Request<{}, {}, {}, GetSuppliersQuery>, res: Response) => {
      const result = await adminService.getSuppliers(req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get pending suppliers
   * GET /api/v1/admin/suppliers/pending
   */
  getPendingSuppliers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page?: number; limit?: number };

    const result = await adminService.getPendingSuppliers(
      page || 1,
      limit || 20
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Verify supplier
   * PATCH /api/v1/admin/suppliers/:id/verify
   */
  verifySupplier = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;

      const supplier = await adminService.verifySupplier(id, adminId);

      logger.info('Supplier verified via admin API', {
        supplierId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Fournisseur vérifié avec succès',
        data: { supplier },
      });
    }
  );

  /**
   * Reject supplier
   * PATCH /api/v1/admin/suppliers/:id/reject
   */
  rejectSupplier = asyncHandler(
    async (
      req: Request<{ id: string }, {}, RejectSupplierInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { reason } = req.body;

      const supplier = await adminService.rejectSupplier(id, reason, adminId);

      logger.info('Supplier rejected via admin API', {
        supplierId: id,
        reason,
        adminId,
      });

      res.json({
        success: true,
        message: 'Vérification fournisseur rejetée',
        data: { supplier },
      });
    }
  );

  /**
   * Update supplier commission rate
   * PATCH /api/v1/admin/suppliers/:id/commission
   */
  updateSupplierCommission = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateSupplierCommissionInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { commissionRate } = req.body;

      const supplier = await adminService.updateSupplierCommission(
        id,
        commissionRate,
        adminId
      );

      logger.info('Supplier commission updated via admin API', {
        supplierId: id,
        commissionRate,
        adminId,
      });

      res.json({
        success: true,
        message: 'Taux de commission mis à jour',
        data: { supplier },
      });
    }
  );

  /**
   * Bulk verify suppliers
   * POST /api/v1/admin/suppliers/bulk-verify
   */
  bulkVerifySuppliers = asyncHandler(
    async (req: Request<{}, {}, { supplierIds: string[] }>, res: Response) => {
      const adminId = req.user.id;
      const { supplierIds } = req.body;

      const result = await adminService.bulkVerifySuppliers(
        supplierIds,
        adminId
      );

      logger.info('Suppliers bulk verified via admin API', {
        supplierIds,
        count: result.count,
        adminId,
      });

      res.json({
        success: true,
        message: `${result.count} fournisseur(s) vérifié(s)`,
        data: result,
      });
    }
  );

  // ==================== PRODUCT MODERATION ====================

  /**
   * Get all products
   * GET /api/v1/admin/products
   */
  getProducts = asyncHandler(
    async (req: Request<{}, {}, {}, GetProductsQuery>, res: Response) => {
      const result = await adminService.getProducts(req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get products for moderation
   * GET /api/v1/admin/products/moderation
   */
  getProductsForModeration = asyncHandler(
    async (req: Request, res: Response) => {
      const { page, limit } = req.query as { page?: number; limit?: number };

      const result = await adminService.getProductsForModeration(
        page || 1,
        limit || 20
      );

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Approve product
   * PATCH /api/v1/admin/products/:id/approve
   */
  approveProduct = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;

      const product = await adminService.approveProduct(id, adminId);

      logger.info('Product approved via admin API', {
        productId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Produit approuvé',
        data: { product },
      });
    }
  );

  /**
   * Reject product
   * PATCH /api/v1/admin/products/:id/reject
   */
  rejectProduct = asyncHandler(
    async (
      req: Request<{ id: string }, {}, RejectProductInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { reason } = req.body;

      const product = await adminService.rejectProduct(id, reason, adminId);

      logger.info('Product rejected via admin API', {
        productId: id,
        reason,
        adminId,
      });

      res.json({
        success: true,
        message: 'Produit rejeté',
        data: { product },
      });
    }
  );

  /**
   * Update product status
   * PATCH /api/v1/admin/products/:id/status
   */
  updateProductStatus = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateProductStatusInput>,
      res: Response
    ) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { status } = req.body;

      const product = await adminService.updateProductStatus(
        id,
        status,
        adminId
      );

      logger.info('Product status updated via admin API', {
        productId: id,
        status,
        adminId,
      });

      res.json({
        success: true,
        message: 'Statut produit mis à jour',
        data: { product },
      });
    }
  );

  /**
   * Delete product
   * DELETE /api/v1/admin/products/:id
   */
  deleteProduct = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;

      await adminService.deleteProduct(id, adminId);

      logger.info('Product deleted via admin API', {
        productId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Produit supprimé',
      });
    }
  );

  /**
   * Bulk approve products
   * POST /api/v1/admin/products/bulk-approve
   */
  bulkApproveProducts = asyncHandler(
    async (req: Request<{}, {}, { productIds: string[] }>, res: Response) => {
      const adminId = req.user.id;
      const { productIds } = req.body;

      const result = await adminService.bulkApproveProducts(
        productIds,
        adminId
      );

      logger.info('Products bulk approved via admin API', {
        productIds,
        count: result.count,
        adminId,
      });

      res.json({
        success: true,
        message: `${result.count} produit(s) approuvé(s)`,
        data: result,
      });
    }
  );

  // ==================== ANALYTICS ====================

  /**
   * Get financial report
   * GET /api/v1/admin/reports/financial
   */
  getFinancialReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as {
      startDate: string;
      endDate: string;
    };

    const report = await analyticsService.getFinancialReport(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: report,
    });
  });

  /**
   * Get top products
   * GET /api/v1/admin/analytics/top-products
   */
  getTopProducts = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, limit } = req.query as unknown as {
      startDate: string;
      endDate: string;
      limit?: number;
    };

    const products = await analyticsService.getTopProducts(
      new Date(startDate),
      new Date(endDate),
      limit || 10
    );

    res.json({
      success: true,
      data: { products },
    });
  });

  /**
   * Get top search terms
   * GET /api/v1/admin/analytics/top-searches
   */
  getTopSearchTerms = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, limit } = req.query as unknown as {
      startDate: string;
      endDate: string;
      limit?: number;
    };

    const terms = await analyticsService.getTopSearchTerms(
      new Date(startDate),
      new Date(endDate),
      limit || 20
    );

    res.json({
      success: true,
      data: { terms },
    });
  });

  /**
   * Get user growth metrics
   * GET /api/v1/admin/analytics/user-growth
   */
  getUserGrowthMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as {
      startDate: string;
      endDate: string;
    };

    const metrics = await analyticsService.getUserGrowthMetrics(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: metrics,
    });
  });

  /**
   * Get supplier performance metrics
   * GET /api/v1/admin/analytics/supplier/:supplierId
   */
  getSupplierPerformance = asyncHandler(
    async (req: Request<{ supplierId: string }>, res: Response) => {
      const { supplierId } = req.params;

      const metrics =
        await analyticsService.getSupplierPerformanceMetrics(supplierId);

      res.json({
        success: true,
        data: metrics,
      });
    }
  );

  // ==================== ADMIN USER CREATION ====================

  /**
   * Create a new user
   * POST /api/v1/admin/users
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role,
      status,
      emailVerified,
      phoneVerified,
    } = req.body;

    const user = await adminService.createUser({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role,
      status,
      emailVerified,
      phoneVerified,
      adminId,
    });

    logger.info('User created via admin API', {
      userId: user.id,
      role,
      adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { user },
    });
  });

  /**
   * Force verify a user (bypass OTP)
   * PATCH /api/v1/admin/users/:id/verify
   */
  forceVerifyUser = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { verifyEmail, verifyPhone, verifyKyc, activateUser } = req.body;

      const user = await adminService.forceVerifyUser(
        id,
        { verifyEmail, verifyPhone, verifyKyc, activateUser },
        adminId
      );

      logger.info('User force-verified via admin API', {
        userId: id,
        verifications: { verifyEmail, verifyPhone, verifyKyc, activateUser },
        adminId,
      });

      res.json({
        success: true,
        message: 'Utilisateur vérifié avec succès',
        data: { user },
      });
    }
  );

  // ==================== KYC MANAGEMENT ====================

  /**
   * Get suppliers pending KYC verification
   * GET /api/v1/admin/suppliers/kyc/pending
   */
  getPendingKyc = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page?: string; limit?: string };

    const result = await adminService.getSuppliersWithPendingKyc({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Verify supplier KYC documents
   * POST /api/v1/admin/suppliers/:id/kyc/verify
   */
  verifySupplierKyc = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;

      const supplier = await adminService.verifySupplierKyc(id, adminId);

      logger.info('Supplier KYC verified via admin API', {
        supplierId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'KYC vérifié avec succès',
        data: { supplier },
      });
    }
  );

  /**
   * Reject supplier KYC documents
   * POST /api/v1/admin/suppliers/:id/kyc/reject
   */
  rejectSupplierKyc = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const adminId = req.user.id;
      const { reason } = req.body;

      const supplier = await adminService.rejectSupplierKyc(
        id,
        reason,
        adminId
      );

      logger.info('Supplier KYC rejected via admin API', {
        supplierId: id,
        reason,
        adminId,
      });

      res.json({
        success: true,
        message: 'KYC rejeté',
        data: { supplier },
      });
    }
  );
}

export default new AdminController();
