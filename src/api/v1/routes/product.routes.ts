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

/**
 * Get product by ID (public)
 * GET /:id
 */
router.get(
  '/:id',
  validate(getProductByIdSchema),
  productController.getProduct
);

// ==================== PROTECTED ROUTES (SUPPLIER ONLY) ====================

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
 * Get supplier's products
 * GET /my-products
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/my-products',
  authMiddleware,
  supplierOnly,
  validate(getSupplierProductsSchema),
  productController.getMyProducts
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

export default router;
