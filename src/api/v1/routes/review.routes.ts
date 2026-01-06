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
} from '@/api/v1/validators/review.validator';
import { authenticate, optionalAuth } from '@/middleware/auth.middleware';
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

// Mark review as helpful (no auth required)
router.post(
  '/:id/helpful',
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

export default router;
