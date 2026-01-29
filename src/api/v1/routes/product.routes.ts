import { Router } from 'express';

import productController from '../controllers/product.controller';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  deleteProductSchema,
  searchProductsSchema,
  getExpiringSoonSchema,
  getTrendingSchema,
  updateStockSchema,
  uploadImagesSchema,
  deleteImageSchema,
  getSupplierProductsSchema,
  toggleProductStatusSchema,
} from '../validators/product.validator';

import { authMiddleware } from '@/middleware/auth.middleware';
import { supplierOnly } from '@/middleware/role-guard.middleware';
import {
  uploadImages,
  requireFiles,
  handleUploadError,
} from '@/middleware/upload.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Product Routes
 * Base path: /api/v1/products
 */

// ==================== PUBLIC ROUTES ====================

/**
 * Search products (public)
 * GET /search
 */
router.get(
  '/search',
  validate(searchProductsSchema),
  productController.searchProducts
);

/**
 * Get products expiring soon (public)
 * GET /expiring-soon
 */
router.get(
  '/expiring-soon',
  validate(getExpiringSoonSchema),
  productController.getExpiringSoon
);

/**
 * Get trending products (public)
 * GET /trending
 */
router.get(
  '/trending',
  validate(getTrendingSchema),
  productController.getTrending
);

// ==================== PROTECTED ROUTES (SUPPLIER ONLY) ====================

/**
 * Get supplier's products
 * GET /my-products
 * Requires: Authentication + SUPPLIER role
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get(
  '/my-products',
  authMiddleware,
  supplierOnly,
  validate(getSupplierProductsSchema),
  productController.getMyProducts
);

/**
 * Create product
 * POST /
 * Requires: Authentication + SUPPLIER role
 */
router.post(
  '/',
  authMiddleware,
  supplierOnly,
  validate(createProductSchema),
  productController.createProduct
);

/**
 * Update product
 * PUT /:id
 * Requires: Authentication + SUPPLIER role
 */
router.put(
  '/:id',
  authMiddleware,
  supplierOnly,
  validate(updateProductSchema),
  productController.updateProduct
);

/**
 * Delete product
 * DELETE /:id
 * Requires: Authentication + SUPPLIER role
 */
router.delete(
  '/:id',
  authMiddleware,
  supplierOnly,
  validate(deleteProductSchema),
  productController.deleteProduct
);

/**
 * Update product stock
 * PATCH /:id/stock
 * Requires: Authentication + SUPPLIER role
 */
router.patch(
  '/:id/stock',
  authMiddleware,
  supplierOnly,
  validate(updateStockSchema),
  productController.updateStock
);

/**
 * Upload product images
 * POST /:id/images
 * Requires: Authentication + SUPPLIER role
 */
router.post(
  '/:id/images',
  authMiddleware,
  supplierOnly,
  uploadImages,
  handleUploadError,
  requireFiles('images'),
  validate(uploadImagesSchema),
  productController.uploadImages
);

/**
 * Delete product image
 * DELETE /:id/images
 * Requires: Authentication + SUPPLIER role
 */
router.delete(
  '/:id/images',
  authMiddleware,
  supplierOnly,
  validate(deleteImageSchema),
  productController.deleteImage
);

/**
 * Toggle product status
 * PATCH /:id/toggle-status
 * Requires: Authentication + SUPPLIER role
 */
router.patch(
  '/:id/toggle-status',
  authMiddleware,
  supplierOnly,
  validate(toggleProductStatusSchema),
  productController.toggleStatus
);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

/**
 * Get product by ID (public)
 * GET /:id
 * NOTE: Must be last to avoid capturing static routes like /search, /trending
 */
router.get(
  '/:id',
  validate(getProductByIdSchema),
  productController.getProduct
);

export default router;
