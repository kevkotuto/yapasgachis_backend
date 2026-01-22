import { Request, Response } from 'express';

import {
  CreateReviewInput,
  UpdateReviewInput,
  GetProductReviewsQuery,
  GetSupplierReviewsQuery,
} from '../validators/review.validator';

import reviewService from '@/core/services/review.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Review Controller
 * Handles review-related HTTP requests
 */
export class ReviewController {
  /**
   * Create a review
   * POST /api/v1/reviews
   */
  createReview = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateReviewInput;

    const review = await reviewService.createReview(
      userId,
      body as Required<CreateReviewInput>
    );

    logger.info('Review created via API', {
      userId,
      reviewId: review.id,
    });

    res.status(201).json({
      success: true,
      message: 'Avis créé avec succès',
      data: { review },
    });
  });

  /**
   * Get reviews for a product
   * GET /api/v1/reviews/product/:productId
   */
  getProductReviews = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const query = req.query as unknown as GetProductReviewsQuery;
    const result = await reviewService.getProductReviews(productId, query);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get reviews for a supplier
   * GET /api/v1/reviews/supplier/:supplierId
   */
  getSupplierReviews = asyncHandler(async (req: Request, res: Response) => {
    const { supplierId } = req.params;
    const query = req.query as unknown as GetSupplierReviewsQuery;
    const { page, limit } = query;
    const result = await reviewService.getSupplierReviews(
      supplierId,
      page,
      limit
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get reviews for a deal
   * GET /api/v1/reviews/deal/:dealId
   */
  getDealReviews = asyncHandler(async (req: Request, res: Response) => {
    const { dealId } = req.params;
    const query = req.query as unknown as GetSupplierReviewsQuery;
    const { page, limit } = query;
    const result = await reviewService.getDealReviews(dealId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get my reviews
   * GET /api/v1/reviews/my
   */
  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { page, limit } = req.query as { page?: number; limit?: number };

    const result = await reviewService.getUserReviews(
      userId,
      page || 1,
      limit || 10
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Update a review
   * PUT /api/v1/reviews/:id
   */
  updateReview = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateReviewInput>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;

      const review = await reviewService.updateReview(userId, id, req.body);

      logger.info('Review updated via API', {
        userId,
        reviewId: id,
      });

      res.json({
        success: true,
        message: 'Avis mis à jour avec succès',
        data: { review },
      });
    }
  );

  /**
   * Delete a review
   * DELETE /api/v1/reviews/:id
   */
  deleteReview = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      await reviewService.deleteReview(userId, id);

      logger.info('Review deleted via API', {
        userId,
        reviewId: id,
      });

      res.json({
        success: true,
        message: 'Avis supprimé avec succès',
      });
    }
  );

  /**
   * Mark review as helpful
   * POST /api/v1/reviews/:id/helpful
   */
  markHelpful = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;

      const review = await reviewService.markHelpful(id);

      res.json({
        success: true,
        message: 'Avis marqué comme utile',
        data: { review },
      });
    }
  );

  /**
   * Report a review
   * POST /api/v1/reviews/:id/report
   */
  reportReview = asyncHandler(
    async (
      req: Request<{ id: string }, {}, { reason?: string }>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      await reviewService.reportReview(userId, id, reason);

      logger.info('Review reported via API', {
        userId,
        reviewId: id,
        reason,
      });

      res.json({
        success: true,
        message: 'Avis signalé avec succès',
      });
    }
  );

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get reported reviews (admin)
   * GET /api/v1/admin/reviews/reported
   */
  getReportedReviews = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page?: number; limit?: number };

    const result = await reviewService.getReportedReviews(
      page || 1,
      limit || 20
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Clear review report (admin)
   * PATCH /api/v1/admin/reviews/:id/clear-report
   */
  clearReport = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;

      const review = await reviewService.clearReviewReport(id);

      logger.info('Review report cleared by admin', {
        reviewId: id,
        adminId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Signalement effacé',
        data: { review },
      });
    }
  );

  /**
   * Delete review (admin)
   * DELETE /api/v1/admin/reviews/:id
   */
  adminDeleteReview = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const adminId = req.user.id;
      const { id } = req.params;

      await reviewService.deleteReview(adminId, id, true);

      logger.info('Review deleted by admin', {
        reviewId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Avis supprimé avec succès',
      });
    }
  );
}

export default new ReviewController();
