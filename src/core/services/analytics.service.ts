import analyticsRepository from '@/core/repositories/analytics.repository';
import { prisma } from '@/infrastructure/database/prisma';
import CacheService from '@/infrastructure/database/redis/cache.service';
import logger from '@/infrastructure/monitoring/logger';
import { OrderStatus, ProductStatus } from '@prisma/client';

// Get cache service instance
const cacheService = new CacheService();

/**
 * Analytics Service
 * Business logic for analytics and reporting
 */
export class AnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Track an event
   */
  async trackEvent(data: {
    userId?: string;
    eventType: string;
    eventData: any;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return await analyticsRepository.trackEvent(data);
  }

  /**
   * Track product view
   */
  async trackProductView(
    productId: string,
    userId?: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ) {
    return await this.trackEvent({
      userId,
      eventType: 'product_view',
      eventData: { productId },
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    });
  }

  /**
   * Track search
   */
  async trackSearch(
    searchTerm: string,
    userId?: string,
    resultsCount?: number
  ) {
    return await this.trackEvent({
      userId,
      eventType: 'search',
      eventData: { searchTerm, resultsCount },
    });
  }

  /**
   * Track add to cart
   */
  async trackAddToCart(productId: string, quantity: number, userId?: string) {
    return await this.trackEvent({
      userId,
      eventType: 'add_to_cart',
      eventData: { productId, quantity },
    });
  }

  /**
   * Get dashboard statistics (admin)
   */
  async getDashboardStats() {
    const cacheKey = 'admin:dashboard:stats';

    // Try to get from cache
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get various counts in parallel
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      totalSuppliers,
      verifiedSuppliers,
      pendingSuppliers,
      totalProducts,
      activeProducts,
      totalOrders,
      ordersToday,
      ordersThisWeek,
      completedOrders,
      pendingOrders,
      totalRevenue,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      totalDonations,
      totalAssociations,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfWeek } },
      }),

      // Suppliers
      prisma.supplierProfile.count(),
      prisma.supplierProfile.count({ where: { isVerified: true } }),
      prisma.supplierProfile.count({ where: { isVerified: false } }),

      // Products
      prisma.product.count(),
      prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),

      // Orders
      prisma.order.count(),
      prisma.order.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PREPARING],
          },
        },
      }),

      // Revenue
      prisma.order.aggregate({
        where: { status: OrderStatus.COMPLETED },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startOfDay },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startOfWeek },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Donations
      prisma.donation.count({ where: { status: 'COMPLETED' } }),

      // Associations
      prisma.associationProfile.count({ where: { verified: true } }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
      },
      suppliers: {
        total: totalSuppliers,
        verified: verifiedSuppliers,
        pending: pendingSuppliers,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      orders: {
        total: totalOrders,
        today: ordersToday,
        thisWeek: ordersThisWeek,
        completed: completedOrders,
        pending: pendingOrders,
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
        today: revenueToday._sum.total || 0,
        thisWeek: revenueThisWeek._sum.total || 0,
        thisMonth: revenueThisMonth._sum.total || 0,
      },
      impact: {
        totalDonations,
        totalAssociations,
      },
      generatedAt: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, this.CACHE_TTL);

    return stats;
  }

  /**
   * Get impact metrics (waste reduced, etc.)
   */
  async getImpactMetrics(startDate?: Date, endDate?: Date) {
    const cacheKey = `admin:impact:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`;

    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // Get completed orders with products
    const [
      totalWasteReduced,
      totalMoneySaved,
      totalFoodDonations,
      totalFinancialDonations,
      totalBeneficiaries,
      topContributors,
    ] = await Promise.all([
      // Calculate waste reduced (sum of products sold that would have been wasted)
      prisma.supplierProfile.aggregate({
        _sum: { wasteReduced: true },
      }),

      // Money saved by customers (difference between original and discounted prices)
      prisma.$queryRaw<{ saved: number }[]>`
        SELECT COALESCE(SUM((oi."unitPrice" * 1.5 - oi."unitPrice") * oi.quantity), 0) as saved
        FROM "order_items" oi
        JOIN "orders" o ON o.id = oi."orderId"
        WHERE o.status = 'COMPLETED'
      `,

      // Food donations
      prisma.donation.aggregate({
        where: {
          type: 'FOOD',
          status: 'COMPLETED',
          ...dateFilter,
        },
        _count: true,
        _sum: { quantity: true },
      }),

      // Financial donations
      prisma.donation.aggregate({
        where: {
          type: 'FINANCIAL',
          status: 'COMPLETED',
          ...dateFilter,
        },
        _count: true,
        _sum: { amount: true },
      }),

      // Total beneficiaries from association reports
      prisma.associationReport.aggregate({
        _sum: { beneficiaries: true },
      }),

      // Top contributing suppliers
      prisma.supplierProfile.findMany({
        where: { wasteReduced: { gt: 0 } },
        select: {
          id: true,
          businessName: true,
          wasteReduced: true,
          totalSales: true,
        },
        orderBy: { wasteReduced: 'desc' },
        take: 10,
      }),
    ]);

    const metrics = {
      wasteReduced: {
        totalKg: totalWasteReduced._sum.wasteReduced || 0,
        co2Saved: (totalWasteReduced._sum.wasteReduced || 0) * 2.5, // Rough estimate: 2.5kg CO2 per kg food waste
      },
      moneySaved: {
        totalXOF: totalMoneySaved[0]?.saved || 0,
      },
      donations: {
        food: {
          count: totalFoodDonations._count,
          totalQuantity: totalFoodDonations._sum.quantity || 0,
        },
        financial: {
          count: totalFinancialDonations._count,
          totalAmount: totalFinancialDonations._sum.amount || 0,
        },
      },
      beneficiaries: totalBeneficiaries._sum.beneficiaries || 0,
      topContributors,
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, metrics, this.CACHE_TTL);

    return metrics;
  }

  /**
   * Get financial report
   */
  async getFinancialReport(startDate: Date, endDate: Date) {
    const [
      totalRevenue,
      totalCommissions,
      revenueByDay,
      revenueBySupplier,
      revenueByCategory,
      paymentMethodBreakdown,
    ] = await Promise.all([
      // Total revenue
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { total: true, commission: true },
        _count: true,
      }),

      // Commission earned
      prisma.escrowTransaction.aggregate({
        where: {
          status: 'RELEASED',
          releasedAt: { gte: startDate, lte: endDate },
        },
        _sum: { commission: true },
      }),

      // Revenue by day
      prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
        SELECT
          DATE(created_at) as date,
          SUM(total) as revenue,
          COUNT(*) as orders
        FROM "orders"
        WHERE status = 'COMPLETED'
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Revenue by supplier (top 10)
      prisma.$queryRaw<
        { supplierId: string; businessName: string; revenue: number }[]
      >`
        SELECT
          s.id as "supplierId",
          s."businessName",
          SUM(o.total) as revenue
        FROM "orders" o
        JOIN "supplier_profiles" s ON s.id = o."supplierId"
        WHERE o.status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY s.id, s."businessName"
        ORDER BY revenue DESC
        LIMIT 10
      `,

      // Revenue by product category
      prisma.$queryRaw<{ category: string; revenue: number }[]>`
        SELECT
          p.category,
          SUM(oi."totalPrice") as revenue
        FROM "order_items" oi
        JOIN "products" p ON p.id = oi."productId"
        JOIN "orders" o ON o.id = oi."orderId"
        WHERE o.status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY p.category
        ORDER BY revenue DESC
      `,

      // Payment method breakdown
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      period: { startDate, endDate },
      summary: {
        totalRevenue: totalRevenue._sum.total || 0,
        totalOrders: totalRevenue._count,
        totalCommissions: totalCommissions._sum.commission || 0,
        averageOrderValue:
          totalRevenue._count > 0
            ? (totalRevenue._sum.total || 0) / totalRevenue._count
            : 0,
      },
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
      revenueBySupplier: revenueBySupplier.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
      })),
      revenueByCategory: revenueByCategory.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
      })),
      paymentMethods: paymentMethodBreakdown.map((p) => ({
        method: p.paymentMethod,
        total: p._sum.total || 0,
        count: p._count,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get top products
   */
  async getTopProducts(
    startDate: Date,
    endDate: Date,
    limit = 10
  ): Promise<any[]> {
    const products = await prisma.$queryRaw<any[]>`
      SELECT
        p.id,
        p.title,
        p.category,
        COUNT(DISTINCT oi."orderId") as "orderCount",
        SUM(oi.quantity) as "quantitySold",
        SUM(oi."totalPrice") as revenue
      FROM "order_items" oi
      JOIN "products" p ON p.id = oi."productId"
      JOIN "orders" o ON o.id = oi."orderId"
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= ${startDate}
        AND o.created_at <= ${endDate}
      GROUP BY p.id, p.title, p.category
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return products.map((p) => ({
      ...p,
      orderCount: Number(p.orderCount),
      quantitySold: Number(p.quantitySold),
      revenue: Number(p.revenue),
    }));
  }

  /**
   * Get top search terms
   */
  async getTopSearchTerms(startDate: Date, endDate: Date, limit = 20) {
    return await analyticsRepository.getTopSearchTerms(
      startDate,
      endDate,
      limit
    );
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(startDate: Date, endDate: Date) {
    const usersByDay = await prisma.$queryRaw<
      { date: string; count: number }[]
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "users"
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    return {
      byDay: usersByDay.map((u) => ({
        date: u.date,
        count: Number(u.count),
      })),
      byRole: usersByRole.map((u) => ({
        role: u.role,
        count: u._count,
      })),
    };
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformanceMetrics(supplierId: string) {
    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue,
      averageRating,
      totalReviews,
    ] = await Promise.all([
      prisma.order.count({ where: { supplierId } }),
      prisma.order.count({
        where: { supplierId, status: OrderStatus.COMPLETED },
      }),
      prisma.order.count({
        where: { supplierId, status: OrderStatus.CANCELLED },
      }),
      prisma.order.aggregate({
        where: { supplierId, status: OrderStatus.COMPLETED },
        _sum: { supplierAmount: true },
      }),
      prisma.order.aggregate({
        where: { supplierId, status: OrderStatus.COMPLETED },
        _avg: { total: true },
      }),
      prisma.review.aggregate({
        where: { product: { supplierId } },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: { product: { supplierId } },
      }),
    ]);

    return {
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        completionRate:
          totalOrders > 0
            ? ((completedOrders / totalOrders) * 100).toFixed(2)
            : 0,
      },
      revenue: {
        total: totalRevenue._sum.supplierAmount || 0,
        averageOrderValue: averageOrderValue._avg.total || 0,
      },
      reviews: {
        averageRating: averageRating._avg.rating || 0,
        totalReviews,
      },
    };
  }

  /**
   * Cleanup old analytics events
   */
  async cleanupOldEvents(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await analyticsRepository.deleteOldEvents(cutoffDate);

    logger.info('Old analytics events cleaned up', {
      deletedCount,
      cutoffDate,
    });

    return deletedCount;
  }
}

export default new AnalyticsService();
