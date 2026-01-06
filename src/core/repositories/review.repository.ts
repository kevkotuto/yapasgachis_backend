import { prisma } from '@/infrastructure/database/prisma';
import { Review, Prisma } from '@prisma/client';
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
    orderId?: string;
    rating: number;
    comment?: string;
    images?: any;
  }): Promise<Review> {
    try {
      return await prisma.review.create({
        data: {
          userId: data.userId,
          productId: data.productId,
          orderId: data.orderId,
          rating: data.rating,
          comment: data.comment,
          images: data.images,
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
}

export default new ReviewRepository();
