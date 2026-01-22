import reviewRepository from '@/core/repositories/review.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Review Service
 * Business logic for product reviews
 */
export class ReviewService {
  /**
   * Create a new review
   */
  async createReview(
    userId: string,
    data: {
      productId?: string;
      orderId?: string;
      rating: number;
      comment?: string;
      images?: string[];
    }
  ) {
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new AppError(400, 'La note doit être entre 1 et 5');
    }

    // Must have either productId or orderId
    if (!data.productId && !data.orderId) {
      throw new AppError(400, 'Un produit ou une commande est requis');
    }

    // Check if user has already reviewed this product
    if (data.productId) {
      const hasReviewed = await reviewRepository.hasUserReviewed(
        userId,
        data.productId
      );
      if (hasReviewed) {
        throw new AppError(400, 'Vous avez déjà donné un avis sur ce produit');
      }

      // If orderId is provided, verify the user actually ordered this product
      if (data.orderId) {
        const order = await prisma.order.findFirst({
          where: {
            id: data.orderId,
            clientId: userId,
            items: {
              some: { productId: data.productId },
            },
          },
        });

        if (!order) {
          throw new AppError(
            403,
            'Vous devez avoir commandé ce produit pour laisser un avis'
          );
        }
      }
    }

    const review = await reviewRepository.create({
      userId,
      productId: data.productId,
      orderId: data.orderId,
      rating: data.rating,
      comment: data.comment,
      images: data.images,
    });

    // Update product average rating if applicable
    if (data.productId) {
      await this.updateProductRating(data.productId);
    }

    logger.info('Review created', {
      reviewId: review.id,
      userId,
      productId: data.productId,
      rating: data.rating,
    });

    return review;
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      minRating?: number;
      sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    } = {}
  ) {
    const result = await reviewRepository.findByProductId(productId, options);

    // Get rating distribution
    const distribution =
      await reviewRepository.getRatingDistribution(productId);

    return {
      ...result,
      distribution,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 10,
        totalPages: Math.ceil(result.total / (options.limit || 10)),
      },
    };
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string, page = 1, limit = 10) {
    const result = await reviewRepository.findByUserId(userId, page, limit);

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update a review
   */
  async updateReview(
    userId: string,
    reviewId: string,
    data: {
      rating?: number;
      comment?: string;
      images?: string[];
    }
  ) {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, 'Avis non trouvé');
    }

    if (review.userId !== userId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier cet avis");
    }

    if (data.rating && (data.rating < 1 || data.rating > 5)) {
      throw new AppError(400, 'La note doit être entre 1 et 5');
    }

    const updatedReview = await reviewRepository.update(reviewId, data);

    // Update product average rating if applicable
    if (review.productId) {
      await this.updateProductRating(review.productId);
    }

    logger.info('Review updated', {
      reviewId,
      userId,
    });

    return updatedReview;
  }

  /**
   * Delete a review
   */
  async deleteReview(userId: string, reviewId: string, isAdmin = false) {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, 'Avis non trouvé');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à supprimer cet avis");
    }

    const productId = review.productId;

    await reviewRepository.delete(reviewId);

    // Update product average rating if applicable
    if (productId) {
      await this.updateProductRating(productId);
    }

    logger.info('Review deleted', {
      reviewId,
      userId,
      isAdmin,
    });

    return { success: true };
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string) {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, 'Avis non trouvé');
    }

    return await reviewRepository.markHelpful(reviewId);
  }

  /**
   * Report a review
   */
  async reportReview(userId: string, reviewId: string, reason?: string) {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, 'Avis non trouvé');
    }

    if (review.userId === userId) {
      throw new AppError(400, 'Vous ne pouvez pas signaler votre propre avis');
    }

    await reviewRepository.report(reviewId);

    logger.info('Review reported', {
      reviewId,
      reportedBy: userId,
      reason,
    });

    return { success: true };
  }

  /**
   * Get reported reviews (admin)
   */
  async getReportedReviews(page = 1, limit = 20) {
    const result = await reviewRepository.getReportedReviews(page, limit);

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Clear review report (admin)
   */
  async clearReviewReport(reviewId: string) {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, 'Avis non trouvé');
    }

    return await reviewRepository.clearReport(reviewId);
  }

  /**
   * Get supplier reviews
   */
  async getSupplierReviews(supplierId: string, page = 1, limit = 10) {
    const result = await reviewRepository.getSupplierReviews(
      supplierId,
      page,
      limit
    );

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Get deal reviews
   */
  async getDealReviews(dealId: string, page = 1, limit = 10) {
    const result = await reviewRepository.getDealReviews(dealId, page, limit);

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update product average rating (internal)
   */
  private async updateProductRating(productId: string) {
    try {
      const result = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // Update the supplier profile stats if product has a supplier
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { supplierId: true },
      });

      if (product?.supplierId) {
        // Recalculate supplier average rating from all their products' reviews
        const supplierAvg = await prisma.review.aggregate({
          where: {
            product: { supplierId: product.supplierId },
          },
          _avg: { rating: true },
          _count: { rating: true },
        });

        await prisma.supplierProfile.update({
          where: { id: product.supplierId },
          data: {
            averageRating: supplierAvg._avg.rating,
            totalReviews: supplierAvg._count.rating,
          },
        });
      }
    } catch (error) {
      logger.error('Error updating product rating', {
        productId,
        error: (error as Error).message,
      });
    }
  }
}

export default new ReviewService();
