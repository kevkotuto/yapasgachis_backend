import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';

import config from '@/config';
import { initSentry } from '@/infrastructure/monitoring/sentry';
import { corsMiddleware } from '@/middleware/cors.middleware';
import { loggingMiddleware } from '@/middleware/logging.middleware';
import { apiLimiter } from '@/middleware/rate-limit.middleware';
import {
  errorHandler,
  notFoundHandler,
} from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { setupSwagger } from '@/infrastructure/docs/swagger';

// Initialize Sentry
initSentry();

const app: Application = express();

// Trust proxy (for deployment behind reverse proxy like Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(loggingMiddleware);

// Rate limiting
app.use(`/api/${config.app.apiVersion}`, apiLimiter);

// Swagger Documentation (only in development and staging)
if (config.app.env !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
  logger.info('Swagger documentation available at /api-docs');
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { PrismaService } = await import('@/infrastructure/database/prisma');
    const { RedisService } = await import('@/infrastructure/database/redis/client');

    const [dbHealthy, redisHealthy] = await Promise.all([
      PrismaService.healthCheck(),
      RedisService.healthCheck(),
    ]);

    const isHealthy = dbHealthy && redisHealthy;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.env,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
    });
  }
});

// API routes
app.get(`/api/${config.app.apiVersion}`, (req, res) => {
  res.json({
    success: true,
    message: 'YapaGachis API',
    version: config.app.apiVersion,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
import authRoutes from '@/api/v1/routes/auth.routes';
import supplierRoutes from '@/api/v1/routes/supplier.routes';
import productRoutes from '@/api/v1/routes/product.routes';
import orderRoutes from '@/api/v1/routes/order.routes';

// Phase 5: Subscriptions, Deals & Stores
import subscriptionRoutes from '@/api/v1/routes/subscription.routes';
import dealRoutes from '@/api/v1/routes/deal.routes';
import storeRoutes from '@/api/v1/routes/store.routes';
import supplierDealRoutes from '@/api/v1/routes/supplier-deal.routes';
import supplierStoreRoutes from '@/api/v1/routes/supplier-store.routes';
import adminSubscriptionRoutes from '@/api/v1/routes/admin-subscription.routes';
import adminDealRoutes from '@/api/v1/routes/admin-deal.routes';

// Phase 4: Donations & Associations
import associationRoutes from '@/api/v1/routes/association.routes';
import donationRoutes from '@/api/v1/routes/donation.routes';
import associationDonationRoutes from '@/api/v1/routes/association-donation.routes';
import adminAssociationRoutes from '@/api/v1/routes/admin-association.routes';
import adminDonationRoutes from '@/api/v1/routes/admin-donation.routes';

// Phase 6: Notifications & Real-time
import notificationRoutes from '@/api/v1/routes/notification.routes';
import { initializeNotificationListeners } from '@/core/services/notification-listeners';

// Phase 7: Administration & Analytics
import adminRoutes from '@/api/v1/routes/admin.routes';
import reviewRoutes from '@/api/v1/routes/review.routes';

// Phase 8: Advertising
import advertisingRoutes from '@/api/v1/routes/advertising.routes';
import adminAdvertisingRoutes from '@/api/v1/routes/admin-advertising.routes';

// Initialize notification event listeners
if (config.features?.notifications !== false) {
  initializeNotificationListeners();
  logger.info('Notification event listeners initialized');
}

app.use(`/api/${config.app.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.app.apiVersion}/suppliers`, supplierRoutes);
app.use(`/api/${config.app.apiVersion}/products`, productRoutes);
app.use(`/api/${config.app.apiVersion}/orders`, orderRoutes);

// Phase 5: Subscriptions, Deals & Stores routes
app.use(`/api/${config.app.apiVersion}/subscriptions`, subscriptionRoutes);
app.use(`/api/${config.app.apiVersion}/deals`, dealRoutes);
app.use(`/api/${config.app.apiVersion}/stores`, storeRoutes);
app.use(`/api/${config.app.apiVersion}/supplier/deals`, supplierDealRoutes);
app.use(`/api/${config.app.apiVersion}/supplier/stores`, supplierStoreRoutes);
app.use(`/api/${config.app.apiVersion}/admin/subscriptions`, adminSubscriptionRoutes);
app.use(`/api/${config.app.apiVersion}/admin/deals`, adminDealRoutes);

// Phase 4: Donations & Associations routes
app.use(`/api/${config.app.apiVersion}/associations`, associationRoutes);
app.use(`/api/${config.app.apiVersion}/donations`, donationRoutes);
app.use(`/api/${config.app.apiVersion}/associations/donations`, associationDonationRoutes);
app.use(`/api/${config.app.apiVersion}/admin/associations`, adminAssociationRoutes);
app.use(`/api/${config.app.apiVersion}/admin/donations`, adminDonationRoutes);

// Phase 6: Notifications
app.use(`/api/${config.app.apiVersion}/notifications`, notificationRoutes);

// Phase 7: Administration & Analytics
app.use(`/api/${config.app.apiVersion}/admin`, adminRoutes);
app.use(`/api/${config.app.apiVersion}/reviews`, reviewRoutes);

// Phase 8: Advertising
app.use(`/api/${config.app.apiVersion}/advertising`, advertisingRoutes);
app.use(`/api/${config.app.apiVersion}/admin/advertising`, adminAdvertisingRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
