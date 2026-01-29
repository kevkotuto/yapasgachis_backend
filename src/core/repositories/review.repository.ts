import { Review, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Review Repository
 * Data access layer for product/order reviews
 */
export class ReviewRepository {
  /**
   * Create a new review
   */
  async create(data: {
    userId: string;
    productId?: string;
    dealId?: string;
    orderId?: string;
    rating: number;
    comment?: string;
    images?: any;
    isVerified?: boolean;
  }): Promise<Review> {
    try {
      return await prisma.review.create({
        data: {
          userId: data.userId,
          productId: data.productId,
          dealId: data.dealId,
          orderId: data.orderId,
          rating: data.rating,
          comment: data.comment,
          images: data.images,
          isVerified: data.isVerified ?? false,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating review', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find review by ID
   */
  async findById(id: string): Promise<Review | null> {
    try {
      return await prisma.review.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding review by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find reviews by product ID
   */
  async findByProductId(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      minRating?: number;
      sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    } = {}
  ): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const { page = 1, limit = 10, minRating, sortBy = 'recent' } = options;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.ReviewWhereInput = {
        productId,
        ...(minRating && { rating: { gte: minRating } }),
      };

      let orderBy: Prisma.ReviewOrderByWithRelationInput;
      switch (sortBy) {
        case 'helpful':
          orderBy = { helpful: 'desc' };
          break;
        case 'rating_high':
          orderBy = { rating: 'desc' };
          break;
        case 'rating_low':
          orderBy = { rating: 'asc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }

      const [reviews, total, avgResult] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.review.count({ where }),
        prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true },
        }),
      ]);

      return {
        reviews,
        total,
        averageRating: avgResult._avg.rating || 0,
      };
    } catch (error) {
      logger.error('Error finding reviews by product ID', {
        productId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find reviews by user ID
   */
  async findByUserId(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { userId },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where: { userId } }),
      ]);

      return { reviews, total };
    } catch (error) {
      logger.error('Error finding reviews by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update a review
   */
  async update(
    id: string,
    data: {
      rating?: number;
      comment?: string;
      images?: any;
    }
  ): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating review', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async delete(id: string): Promise<Review> {
    try {
      return await prisma.review.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting review', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(id: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data: {
          helpful: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error marking review as helpful', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Toggle helpful for a review (with user tracking)
   */
  async toggleHelpful(
    reviewId: string,
    userId: string
  ): Promise<{ isHelpful: boolean; count: number }> {
    try {
      // Check if user already marked this review as helpful
      const existing = await prisma.reviewHelpful.findUnique({
        where: {
          reviewId_userId: {
            reviewId,
            userId,
          },
        },
      });

      if (existing) {
        // Remove helpful
        await prisma.reviewHelpful.delete({
          where: {
            reviewId_userId: {
              reviewId,
              userId,
            },
          },
        });

        await prisma.review.update({
          where: { id: reviewId },
          data: {
            helpful: { decrement: 1 },
          },
        });

        const updated = await prisma.review.findUnique({
          where: { id: reviewId },
        });

        return {
          isHelpful: false,
          count: updated?.helpful || 0,
        };
      } else {
        // Add helpful
        await prisma.reviewHelpful.create({
          data: {
            reviewId,
            userId,
          },
        });

        await prisma.review.update({
          where: { id: reviewId },
          data: {
            helpful: { increment: 1 },
          },
        });

        const updated = await prisma.review.findUnique({
          where: { id: reviewId },
        });

        return {
          isHelpful: true,
          count: updated?.helpful || 0,
        };
      }
    } catch (error) {
      logger.error('Error toggling review helpful', {
        reviewId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if user marked review as helpful
   */
  async hasUserMarkedHelpful(
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const helpful = await prisma.reviewHelpful.findUnique({
        where: {
          reviewId_userId: {
            reviewId,
            userId,
          },
        },
      });
      return helpful !== null;
    } catch (error) {
      logger.error('Error checking if user marked review as helpful', {
        reviewId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Report a review
   */
  async report(id: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data: { reported: true },
      });
    } catch (error) {
      logger.error('Error reporting review', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get reported reviews (admin)
   */
  async getReportedReviews(
    page = 1,
    limit = 20
  ): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { reported: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                supplierId: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where: { reported: true } }),
      ]);

      return { reviews, total };
    } catch (error) {
      logger.error('Error getting reported reviews', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Clear report flag on a review
   */
  async clearReport(id: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data: { reported: false },
      });
    } catch (error) {
      logger.error('Error clearing review report', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if user has reviewed a product
   */
  async hasUserReviewed(userId: string, productId: string): Promise<boolean> {
    try {
      const count = await prisma.review.count({
        where: { userId, productId },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking if user reviewed product', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get rating distribution for a product
   */
  async getRatingDistribution(
    productId: string
  ): Promise<{ rating: number; count: number }[]> {
    try {
      const distribution = await prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
        orderBy: { rating: 'desc' },
      });

      return distribution.map((d) => ({
        rating: d.rating,
        count: d._count.rating,
      }));
    } catch (error) {
      logger.error('Error getting rating distribution', {
        productId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get complete review stats for a product
   */
  async getProductReviewStats(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const [total, avgResult, distribution] = await Promise.all([
        prisma.review.count({ where: { productId } }),
        prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true },
        }),
        prisma.review.groupBy({
          by: ['rating'],
          where: { productId },
          _count: { rating: true },
        }),
      ]);

      // Initialize all ratings to 0
      const ratingDistribution: { [key: number]: number } = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      // Fill in actual counts
      distribution.forEach((d) => {
        ratingDistribution[d.rating] = d._count.rating;
      });

      return {
        averageRating: avgResult._avg.rating || 0,
        totalReviews: total,
        ratingDistribution,
      };
    } catch (error) {
      logger.error('Error getting product review stats', {
        productId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get complete review stats for a deal
   */
  async getDealReviewStats(dealId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const [total, avgResult, distribution] = await Promise.all([
        prisma.review.count({ where: { dealId } }),
        prisma.review.aggregate({
          where: { dealId },
          _avg: { rating: true },
        }),
        prisma.review.groupBy({
          by: ['rating'],
          where: { dealId },
          _count: { rating: true },
        }),
      ]);

      // Initialize all ratings to 0
      const ratingDistribution: { [key: number]: number } = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      // Fill in actual counts
      distribution.forEach((d) => {
        ratingDistribution[d.rating] = d._count.rating;
      });

      return {
        averageRating: avgResult._avg.rating || 0,
        totalReviews: total,
        ratingDistribution,
      };
    } catch (error) {
      logger.error('Error getting deal review stats', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get supplier reviews (all reviews for supplier's products)
   */
  async getSupplierReviews(
    supplierId: string,
    page = 1,
    limit = 10
  ): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const skip = (page - 1) * limit;

    try {
      const [reviews, total, avgResult] = await Promise.all([
        prisma.review.findMany({
          where: {
            product: { supplierId },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({
          where: { product: { supplierId } },
        }),
        prisma.review.aggregate({
          where: { product: { supplierId } },
          _avg: { rating: true },
        }),
      ]);

      return {
        reviews,
        total,
        averageRating: avgResult._avg.rating || 0,
      };
    } catch (error) {
      logger.error('Error getting supplier reviews', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get deal reviews (all reviews for a deal)
   */
  async getDealReviews(
    dealId: string,
    page = 1,
    limit = 10
  ): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const skip = (page - 1) * limit;

    try {
      const [reviews, total, avgResult] = await Promise.all([
        prisma.review.findMany({
          where: { dealId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            deal: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where: { dealId } }),
        prisma.review.aggregate({
          where: { dealId },
          _avg: { rating: true },
        }),
      ]);

      return {
        reviews,
        total,
        averageRating: avgResult._avg.rating || 0,
      };
    } catch (error) {
      logger.error('Error getting deal reviews', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update supplier response for a review
   */
  async updateSupplierResponse(
    reviewId: string,
    response: string,
    userId: string
  ): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id: reviewId },
        data: {
          supplierResponse: response,
          supplierRespondedAt: new Date(),
          supplierRespondedBy: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
              supplierId: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
              images: true,
              supplierId: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating supplier response', {
        reviewId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete supplier response from a review
   */
  async deleteSupplierResponse(reviewId: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id: reviewId },
        data: {
          supplierResponse: null,
          supplierRespondedAt: null,
          supplierRespondedBy: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting supplier response', {
        reviewId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new ReviewRepository();
