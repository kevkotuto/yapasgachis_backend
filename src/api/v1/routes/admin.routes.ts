import { Router } from 'express';

import adminController from '@/api/v1/controllers/admin.controller';
import reviewController from '@/api/v1/controllers/review.controller';
import {
  getUsersSchema,
  userIdSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  getSuppliersSchema,
  supplierIdSchema,
  rejectSupplierSchema,
  updateSupplierCommissionSchema,
  getProductsSchema,
  productIdSchema,
  rejectProductSchema,
  updateProductStatusSchema,
  bulkApproveProductsSchema,
  bulkVerifySuppliersSchema,
  paginationSchema,
} from '@/api/v1/validators/admin.validator';
import {
  dateRangeSchema,
  dateRangeWithLimitSchema,
  supplierIdSchema as analyticsSupplierIdSchema,
} from '@/api/v1/validators/analytics.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']));

// ==================== DASHBOARD ====================

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/impact', adminController.getImpactMetrics);

// ==================== USER MANAGEMENT ====================

router.get('/users', validate(getUsersSchema), adminController.getUsers);
router.get('/users/:id', validate(userIdSchema), adminController.getUserById);
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  adminController.updateUserRole
);
router.delete('/users/:id', validate(userIdSchema), adminController.deleteUser);

// ==================== SUPPLIER MANAGEMENT ====================

router.get(
  '/suppliers',
  validate(getSuppliersSchema),
  adminController.getSuppliers
);
router.get(
  '/suppliers/pending',
  validate(paginationSchema),
  adminController.getPendingSuppliers
);
router.patch(
  '/suppliers/:id/verify',
  validate(supplierIdSchema),
  adminController.verifySupplier
);
router.patch(
  '/suppliers/:id/reject',
  validate(rejectSupplierSchema),
  adminController.rejectSupplier
);
router.patch(
  '/suppliers/:id/commission',
  validate(updateSupplierCommissionSchema),
  adminController.updateSupplierCommission
);
router.post(
  '/suppliers/bulk-verify',
  validate(bulkVerifySuppliersSchema),
  adminController.bulkVerifySuppliers
);

// ==================== PRODUCT MODERATION ====================

router.get(
  '/products',
  validate(getProductsSchema),
  adminController.getProducts
);
router.get(
  '/products/moderation',
  validate(paginationSchema),
  adminController.getProductsForModeration
);
router.patch(
  '/products/:id/approve',
  validate(productIdSchema),
  adminController.approveProduct
);
router.patch(
  '/products/:id/reject',
  validate(rejectProductSchema),
  adminController.rejectProduct
);
router.patch(
  '/products/:id/status',
  validate(updateProductStatusSchema),
  adminController.updateProductStatus
);
router.delete(
  '/products/:id',
  validate(productIdSchema),
  adminController.deleteProduct
);
router.post(
  '/products/bulk-approve',
  validate(bulkApproveProductsSchema),
  adminController.bulkApproveProducts
);

// ==================== REVIEW MODERATION ====================

router.get(
  '/reviews/reported',
  validate(paginationSchema),
  reviewController.getReportedReviews
);
router.patch('/reviews/:id/clear-report', reviewController.clearReport);
router.delete('/reviews/:id', reviewController.adminDeleteReview);

// ==================== ANALYTICS ====================

router.get(
  '/reports/financial',
  validate(dateRangeSchema),
  adminController.getFinancialReport
);
router.get(
  '/analytics/top-products',
  validate(dateRangeWithLimitSchema),
  adminController.getTopProducts
);
router.get(
  '/analytics/top-searches',
  validate(dateRangeWithLimitSchema),
  adminController.getTopSearchTerms
);
router.get(
  '/analytics/user-growth',
  validate(dateRangeSchema),
  adminController.getUserGrowthMetrics
);
router.get(
  '/analytics/supplier/:supplierId',
  validate(analyticsSupplierIdSchema),
  adminController.getSupplierPerformance
);

export default router;
