import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { supplierOnly, clientOnly } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  createOrderSchema,
  getOrderByIdSchema,
  getUserOrdersSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  checkPaymentStatusSchema,
} from '../validators/order.validator';

const router: Router = Router();

/**
 * Order Routes
 * Base path: /api/v1/orders
 *
 * IMPORTANT: Static routes MUST be defined BEFORE parameterized routes (/:id)
 * to avoid route conflicts where "my-orders" would be treated as an ID
 */

// ==================== PAYMENT ROUTES (PUBLIC/AUTH) ====================

/**
 * Get supported payment providers
 * GET /payments/providers
 * Public route
 */
router.get('/payments/providers', orderController.getPaymentProviders);

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

// ==================== STATIC ROUTES (BEFORE /:id) ====================

/**
 * Get user's orders
 * GET /my-orders
 * Requires: Authentication + CLIENT role
 */
router.get(
  '/my-orders',
  authMiddleware,
  clientOnly,
  validate(getUserOrdersSchema),
  orderController.getMyOrders
);

/**
 * Get order statistics
 * GET /statistics
 * Requires: Authentication + CLIENT role
 */
router.get(
  '/statistics',
  authMiddleware,
  clientOnly,
  orderController.getStatistics
);

/**
 * Get supplier's orders
 * GET /supplier-orders
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/supplier-orders',
  authMiddleware,
  supplierOnly,
  validate(getUserOrdersSchema),
  orderController.getSupplierOrders
);

/**
 * Get supplier order statistics
 * GET /supplier-statistics
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/supplier-statistics',
  authMiddleware,
  supplierOnly,
  orderController.getSupplierStatistics
);

// ==================== PARAMETERIZED ROUTES (/:id) ====================

/**
 * Create order with payment
 * POST /
 * Requires: Authentication + CLIENT role
 */
router.post(
  '/',
  authMiddleware,
  clientOnly,
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
 * Cancel order
 * POST /:id/cancel
 * Requires: Authentication + CLIENT role
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  clientOnly,
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

/**
 * Update order status
 * PATCH /:id/status
 * Requires: Authentication + SUPPLIER role
 */
router.patch(
  '/:id/status',
  authMiddleware,
  supplierOnly,
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
