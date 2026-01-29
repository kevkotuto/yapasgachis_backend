import { Router } from 'express';

import reviewController from '@/api/v1/controllers/review.controller';
import {
  createReviewSchema,
  updateReviewSchema,
  getProductReviewsSchema,
  getSupplierReviewsSchema,
  reviewIdSchema,
  reportReviewSchema,
  paginationSchema,
  createReviewResponseSchema,
  updateReviewResponseSchema,
  deleteReviewResponseSchema,
} from '@/api/v1/validators/review.validator';
import { authenticate, optionalAuth } from '@/middleware/auth.middleware';
import { supplierOnly } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get reviews for a product
router.get(
  '/product/:productId',
  validate(getProductReviewsSchema),
  reviewController.getProductReviews
);

// Get reviews for a supplier
router.get(
  '/supplier/:supplierId',
  validate(getSupplierReviewsSchema),
  reviewController.getSupplierReviews
);

// Get reviews for a deal
router.get(
  '/deal/:dealId',
  validate(getSupplierReviewsSchema),
  reviewController.getDealReviews
);

// Mark review as helpful (authenticated users only for tracking)
router.post(
  '/:id/helpful',
  authenticate,
  validate(reviewIdSchema),
  reviewController.markHelpful
);

// ==================== AUTHENTICATED ROUTES ====================

// Create a review
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview
);

// Get my reviews
router.get(
  '/my',
  authenticate,
  validate(paginationSchema),
  reviewController.getMyReviews
);

// Update a review
router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  reviewController.updateReview
);

// Delete a review
router.delete(
  '/:id',
  authenticate,
  validate(reviewIdSchema),
  reviewController.deleteReview
);

// Report a review
router.post(
  '/:id/report',
  authenticate,
  validate(reportReviewSchema),
  reviewController.reportReview
);

// ==================== SUPPLIER RESPONSE ROUTES ====================

// Create supplier response
router.post(
  '/:id/response',
  authenticate,
  supplierOnly,
  validate(createReviewResponseSchema),
  reviewController.createSupplierResponse
);

// Update supplier response
router.put(
  '/:id/response',
  authenticate,
  supplierOnly,
  validate(updateReviewResponseSchema),
  reviewController.updateSupplierResponse
);

// Delete supplier response
router.delete(
  '/:id/response',
  authenticate,
  supplierOnly,
  validate(deleteReviewResponseSchema),
  reviewController.deleteSupplierResponse
);

export default router;
