import config from '@config/index';
import logger from '@infrastructure/monitoring/logger';
import { PrismaClient, ProductStatus, DonationStatus } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

/**
 * Cron Job 1: Expire Products
 * Runs every 6 hours (configurable via CRON_EXPIRE_PRODUCTS)
 * Marks products as EXPIRED if their expiryDate has passed
 */
const expireProductsJob = () => {
  const schedule = config.cron?.schedules?.expireProducts || '0 */6 * * *';

  cron.schedule(schedule, async () => {
    const jobName = 'EXPIRE_PRODUCTS';
    logger.info(`[CRON] Starting job: ${jobName}`);

    try {
      const now = new Date();

      // Find and update expired products
      const result = await prisma.product.updateMany({
        where: {
          status: {
            in: [ProductStatus.ACTIVE, ProductStatus.DRAFT],
          },
          expiryDate: {
            lt: now,
          },
        },
        data: {
          status: ProductStatus.EXPIRED,
        },
      });

      logger.info(
        `[CRON] ${jobName} completed: ${result.count} products expired`
      );

      // Also mark products with availableUntil passed
      const result2 = await prisma.product.updateMany({
        where: {
          status: ProductStatus.ACTIVE,
          availableUntil: {
            lt: now,
          },
        },
        data: {
          status: ProductStatus.ARCHIVED,
        },
      });

      if (result2.count > 0) {
        logger.info(
          `[CRON] ${jobName}: ${result2.count} products archived (availability ended)`
        );
      }

      // Notify suppliers about expiring products (within next 24 hours)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const expiringProducts = await prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          expiryDate: {
            gte: now,
            lte: tomorrow,
          },
        },
        include: {
          supplier: {
            include: {
              user: true,
            },
          },
        },
      });

      // Create notifications for expiring products
      for (const product of expiringProducts) {
        await prisma.notification.create({
          data: {
            userId: product.supplier.userId,
            type: 'PRODUCT_EXPIRING_SOON',
            title: 'Produit bientot expire',
            message: `Votre produit "${product.title}" expire dans moins de 24 heures`,
            data: {
              productId: product.id,
              expiryDate: product.expiryDate,
            },
          },
        });
      }

      if (expiringProducts.length > 0) {
        logger.info(
          `[CRON] ${jobName}: Created ${expiringProducts.length} expiry notifications`
        );
      }
    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
    }
  });

  logger.info(`[CRON] Scheduled: EXPIRE_PRODUCTS (${schedule})`);
};

/**
 * Cron Job 2: Subscription Renewal Check
 * Runs daily at midnight (configurable via CRON_SUBSCRIPTION_RENEWAL)
 * Checks for expiring subscriptions and sends reminders
 */
const subscriptionRenewalJob = () => {
  const schedule = config.cron?.schedules?.subscriptionRenewal || '0 0 * * *';

  cron.schedule(schedule, async () => {
    const jobName = 'SUBSCRIPTION_RENEWAL';
    logger.info(`[CRON] Starting job: ${jobName}`);

    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find subscriptions expiring in 7 days (first reminder)
      const expiring7Days = await prisma.supplierProfile.findMany({
        where: {
          subscriptionActive: true,
          subscriptionEndDate: {
            gte: now,
            lte: in7Days,
          },
        },
        include: {
          user: true,
          subscriptionPlan: true,
        },
      });

      // Send 7-day reminder notifications
      for (const supplier of expiring7Days) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: supplier.userId,
            type: 'SUBSCRIPTION_EXPIRING',
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: supplier.userId,
              type: 'SUBSCRIPTION_EXPIRING',
              title: 'Abonnement bientot expire',
              message: `Votre abonnement ${supplier.subscriptionPlan?.name || supplier.subscriptionTier} expire dans 7 jours. Renouvelez pour continuer a profiter de nos services.`,
              data: {
                supplierId: supplier.id,
                tier: supplier.subscriptionTier,
                endDate: supplier.subscriptionEndDate,
              },
              priority: 'HIGH',
            },
          });
        }
      }

      // Find subscriptions expiring in 3 days (urgent reminder)
      const expiring3Days = await prisma.supplierProfile.findMany({
        where: {
          subscriptionActive: true,
          subscriptionEndDate: {
            gte: now,
            lte: in3Days,
          },
        },
        include: {
          user: true,
        },
      });

      for (const supplier of expiring3Days) {
        await prisma.notification.create({
          data: {
            userId: supplier.userId,
            type: 'SUBSCRIPTION_EXPIRING',
            title: 'Abonnement expire bientot!',
            message: `Attention: votre abonnement expire dans moins de 3 jours!`,
            data: {
              supplierId: supplier.id,
              tier: supplier.subscriptionTier,
              endDate: supplier.subscriptionEndDate,
              urgent: true,
            },
            priority: 'URGENT',
          },
        });
      }

      // Deactivate expired subscriptions
      const expiredResult = await prisma.supplierProfile.updateMany({
        where: {
          subscriptionActive: true,
          subscriptionEndDate: {
            lt: now,
          },
        },
        data: {
          subscriptionActive: false,
        },
      });

      logger.info(`[CRON] ${jobName} completed:`);
      logger.info(`  - 7-day reminders: ${expiring7Days.length}`);
      logger.info(`  - 3-day reminders: ${expiring3Days.length}`);
      logger.info(`  - Subscriptions deactivated: ${expiredResult.count}`);

      // Expire deals from suppliers with expired subscriptions
      const expiredDeals = await prisma.deal.updateMany({
        where: {
          status: 'ACTIVE',
          supplier: {
            subscriptionActive: false,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (expiredDeals.count > 0) {
        logger.info(
          `  - Deals expired (inactive subscription): ${expiredDeals.count}`
        );
      }
    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
    }
  });

  logger.info(`[CRON] Scheduled: SUBSCRIPTION_RENEWAL (${schedule})`);
};

/**
 * Cron Job 3: Analytics Aggregation
 * Runs daily at 1 AM (configurable via CRON_ANALYTICS_AGGREGATION)
 * Aggregates daily analytics data for reporting
 */
const analyticsAggregationJob = () => {
  const schedule = config.cron?.schedules?.analyticsAggregation || '0 1 * * *';

  cron.schedule(schedule, async () => {
    const jobName = 'ANALYTICS_AGGREGATION';
    logger.info(`[CRON] Starting job: ${jobName}`);

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Aggregate order statistics
      const ordersStats = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lte: yesterdayEnd,
          },
          status: {
            in: ['COMPLETED', 'DELIVERED'],
          },
        },
        _count: true,
        _sum: {
          total: true,
          commission: true,
        },
      });

      // Aggregate new users
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: yesterday,
            lte: yesterdayEnd,
          },
        },
      });

      // Aggregate new suppliers
      const newSuppliers = await prisma.supplierProfile.count({
        where: {
          createdAt: {
            gte: yesterday,
            lte: yesterdayEnd,
          },
        },
      });

      // Aggregate donations
      const donationsStats = await prisma.donation.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lte: yesterdayEnd,
          },
          status: DonationStatus.COMPLETED,
        },
        _count: true,
        _sum: {
          amount: true,
          quantity: true,
        },
      });

      // Aggregate deal bookings
      const dealBookingsStats = await prisma.dealBooking.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lte: yesterdayEnd,
          },
          status: 'CONFIRMED',
        },
        _count: true,
        _sum: {
          totalPrice: true,
        },
      });

      // Store aggregated analytics
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'DAILY_AGGREGATION',
          eventData: {
            date: yesterday.toISOString().split('T')[0],
            orders: {
              count: ordersStats._count,
              totalRevenue: ordersStats._sum.total || 0,
              totalCommission: ordersStats._sum.commission || 0,
            },
            users: {
              newRegistrations: newUsers,
            },
            suppliers: {
              newRegistrations: newSuppliers,
            },
            donations: {
              count: donationsStats._count,
              totalAmount: donationsStats._sum.amount || 0,
              totalQuantity: donationsStats._sum.quantity || 0,
            },
            deals: {
              bookingsCount: dealBookingsStats._count,
              totalRevenue: dealBookingsStats._sum.totalPrice || 0,
            },
          },
        },
      });

      // Update supplier statistics
      const suppliers = await prisma.supplierProfile.findMany({
        select: { id: true },
      });

      for (const supplier of suppliers) {
        // Calculate total sales and revenue
        const supplierStats = await prisma.order.aggregate({
          where: {
            supplierId: supplier.id,
            status: {
              in: ['COMPLETED', 'DELIVERED'],
            },
          },
          _count: true,
          _sum: {
            supplierAmount: true,
          },
        });

        // Calculate average rating
        const reviewStats = await prisma.review.aggregate({
          where: {
            product: {
              supplierId: supplier.id,
            },
          },
          _avg: {
            rating: true,
          },
          _count: true,
        });

        await prisma.supplierProfile.update({
          where: { id: supplier.id },
          data: {
            totalSales: supplierStats._count,
            totalRevenue: supplierStats._sum.supplierAmount || 0,
            averageRating: reviewStats._avg.rating,
            totalReviews: reviewStats._count,
          },
        });
      }

      // Clean up old analytics events (keep last 90 days)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const deletedEvents = await prisma.analyticsEvent.deleteMany({
        where: {
          eventType: {
            not: 'DAILY_AGGREGATION',
          },
          timestamp: {
            lt: ninetyDaysAgo,
          },
        },
      });

      // Clean up old notifications (keep last 30 days for read, 90 for unread)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          OR: [
            {
              read: true,
              createdAt: { lt: thirtyDaysAgo },
            },
            {
              read: false,
              createdAt: { lt: ninetyDaysAgo },
            },
          ],
        },
      });

      logger.info(`[CRON] ${jobName} completed:`);
      logger.info(`  - Date: ${yesterday.toISOString().split('T')[0]}`);
      logger.info(
        `  - Orders: ${ordersStats._count} (${ordersStats._sum.total || 0} XOF)`
      );
      logger.info(`  - New users: ${newUsers}`);
      logger.info(`  - New suppliers: ${newSuppliers}`);
      logger.info(`  - Donations: ${donationsStats._count}`);
      logger.info(`  - Deal bookings: ${dealBookingsStats._count}`);
      logger.info(`  - Supplier stats updated: ${suppliers.length}`);
      logger.info(`  - Old events cleaned: ${deletedEvents.count}`);
      logger.info(
        `  - Old notifications cleaned: ${deletedNotifications.count}`
      );
    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
    }
  });

  logger.info(`[CRON] Scheduled: ANALYTICS_AGGREGATION (${schedule})`);
};

/**
 * Additional Job: Expire Deals
 * Runs every hour to check for expired deals
 */
const expireDealsJob = () => {
  const schedule = '0 * * * *'; // Every hour

  cron.schedule(schedule, async () => {
    const jobName = 'EXPIRE_DEALS';
    logger.info(`[CRON] Starting job: ${jobName}`);

    try {
      const now = new Date();

      const result = await prisma.deal.updateMany({
        where: {
          status: 'ACTIVE',
          availableUntil: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (result.count > 0) {
        logger.info(`[CRON] ${jobName}: ${result.count} deals expired`);
      }

      // Expire bookings that are past their date and still pending
      const expiredBookings = await prisma.dealBooking.updateMany({
        where: {
          status: 'PENDING',
          bookingDate: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (expiredBookings.count > 0) {
        logger.info(
          `[CRON] ${jobName}: ${expiredBookings.count} bookings expired`
        );
      }
    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
    }
  });

  logger.info(`[CRON] Scheduled: EXPIRE_DEALS (${schedule})`);
};

/**
 * Additional Job: Clean Expired OTPs and Tokens
 * Runs every 6 hours
 */
const cleanExpiredTokensJob = () => {
  const schedule = '0 */6 * * *';

  cron.schedule(schedule, async () => {
    const jobName = 'CLEAN_EXPIRED_TOKENS';
    logger.info(`[CRON] Starting job: ${jobName}`);

    try {
      const now = new Date();

      // Clean expired refresh tokens
      const deletedTokens = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      // Clean inactive device tokens (not used in 90 days)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const deletedDeviceTokens = await prisma.deviceToken.deleteMany({
        where: {
          lastUsedAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      logger.info(`[CRON] ${jobName} completed:`);
      logger.info(`  - Expired refresh tokens: ${deletedTokens.count}`);
      logger.info(`  - Inactive device tokens: ${deletedDeviceTokens.count}`);
    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
    }
  });

  logger.info(`[CRON] Scheduled: CLEAN_EXPIRED_TOKENS (${schedule})`);
};

/**
 * Initialize all cron jobs
 */
export const initCronJobs = () => {
  const enabled =
    config.cron?.enabled ?? process.env.ENABLE_CRON_JOBS === 'true';

  if (!enabled) {
    logger.warn('[CRON] Cron jobs are disabled');
    return;
  }

  logger.info('[CRON] Initializing cron jobs...');

  // Main scheduled jobs
  expireProductsJob();
  subscriptionRenewalJob();
  analyticsAggregationJob();

  // Additional maintenance jobs
  expireDealsJob();
  cleanExpiredTokensJob();

  logger.info('[CRON] All cron jobs initialized successfully');
};

/**
 * Graceful shutdown
 */
export const stopCronJobs = async () => {
  logger.info('[CRON] Stopping all cron jobs...');
  await prisma.$disconnect();
  logger.info('[CRON] Cron jobs stopped');
};

// If running as standalone script
if (require.main === module) {
  initCronJobs();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await stopCronJobs();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await stopCronJobs();
    process.exit(0);
  });
}
