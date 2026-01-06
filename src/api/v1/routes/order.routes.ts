import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { roleGuard } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  createOrderSchema,
  getOrderByIdSchema,
  getUserOrdersSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  checkPaymentStatusSchema,
} from '../validators/order.validator';
import { UserRole } from '@prisma/client';

const router: Router = Router();

/**
 * Order Routes
 * Base path: /api/v1/orders
 */

// ==================== PROTECTED ROUTES (CLIENT) ====================

/**
 * Create order with payment
 * POST /
 * Requires: Authentication + CLIENT role
 */
router.post(
  '/',
  authMiddleware,
  roleGuard(UserRole.CLIENT),
  validate(createOrderSchema),
  orderController.createOrder
);

/**
 * Get order by ID
 * GET /:id
 * Requires: Authentication
 */
router.get(
  '/:id',
  authMiddleware,
  validate(getOrderByIdSchema),
  orderController.getOrder
);

/**
 * Get user's orders
 * GET /my-orders
 * Requires: Authentication + CLIENT role
 */
router.get(
  '/my-orders',
  authMiddleware,
  roleGuard(UserRole.CLIENT),
  validate(getUserOrdersSchema),
  orderController.getMyOrders
);

/**
 * Cancel order
 * POST /:id/cancel
 * Requires: Authentication + CLIENT role
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  roleGuard(UserRole.CLIENT),
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

/**
 * Get order statistics
 * GET /statistics
 * Requires: Authentication + CLIENT role
 */
router.get(
  '/statistics',
  authMiddleware,
  roleGuard(UserRole.CLIENT),
  orderController.getStatistics
);

// ==================== PROTECTED ROUTES (SUPPLIER) ====================

/**
 * Get supplier's orders
 * GET /supplier-orders
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/supplier-orders',
  authMiddleware,
  roleGuard(UserRole.SUPPLIER),
  validate(getUserOrdersSchema),
  orderController.getSupplierOrders
);

/**
 * Update order status
 * PATCH /:id/status
 * Requires: Authentication + SUPPLIER role
 */
router.patch(
  '/:id/status',
  authMiddleware,
  roleGuard(UserRole.SUPPLIER),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

/**
 * Get supplier order statistics
 * GET /supplier-statistics
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/supplier-statistics',
  authMiddleware,
  roleGuard(UserRole.SUPPLIER),
  orderController.getSupplierStatistics
);

// ==================== PAYMENT ROUTES ====================

/**
 * Check payment status
 * GET /payments/:transactionId/status
 * Requires: Authentication
 */
router.get(
  '/payments/:transactionId/status',
  authMiddleware,
  validate(checkPaymentStatusSchema),
  orderController.checkPaymentStatus
);

/**
 * Get supported payment providers
 * GET /payments/providers
 * Public route
 */
router.get('/payments/providers', orderController.getPaymentProviders);

export default router;
