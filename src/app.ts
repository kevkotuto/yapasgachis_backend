import compression from 'compression';
import express, { Application } from 'express';
import helmet from 'helmet';
import path from 'path';

import adminAdvertisingRoutes from '@/api/v1/routes/admin-advertising.routes';
import adminAssociationRoutes from '@/api/v1/routes/admin-association.routes';
import adminDealRoutes from '@/api/v1/routes/admin-deal.routes';
import adminDonationRoutes from '@/api/v1/routes/admin-donation.routes';
import adminKycRoutes from '@/api/v1/routes/admin-kyc.routes';
import adminPaymentProviderRoutes from '@/api/v1/routes/admin-payment-provider.routes';
import adminSubscriptionRoutes from '@/api/v1/routes/admin-subscription.routes';
import adminRoutes from '@/api/v1/routes/admin.routes';
import adminSettingsRoutes from '@/api/v1/routes/admin-settings.routes';
import advertisingRoutes from '@/api/v1/routes/advertising.routes';
import kycRoutes from '@/api/v1/routes/kyc.routes';
import associationDonationRoutes from '@/api/v1/routes/association-donation.routes';
import associationRoutes from '@/api/v1/routes/association.routes';
import authRoutes from '@/api/v1/routes/auth.routes';
import categoryRoutes from '@/api/v1/routes/category.routes';
import dealRoutes from '@/api/v1/routes/deal.routes';
import donationRoutes from '@/api/v1/routes/donation.routes';
import mapRoutes from '@/api/v1/routes/map.routes';
import notificationRoutes from '@/api/v1/routes/notification.routes';
import orderRoutes from '@/api/v1/routes/order.routes';
import paymentProviderRoutes from '@/api/v1/routes/payment-provider.routes';
import payoutRoutes from '@/api/v1/routes/payout.routes';
import productRoutes from '@/api/v1/routes/product.routes';
import referralRoutes from '@/api/v1/routes/referral.routes';
import rewardRoutes from '@/api/v1/routes/reward.routes';
import reviewRoutes from '@/api/v1/routes/review.routes';
import savedLocationRoutes from '@/api/v1/routes/saved-location.routes';
import searchHistoryRoutes from '@/api/v1/routes/search-history.routes';
import favoriteStoreRoutes from '@/api/v1/routes/favorite-store.routes';
import storeRoutes from '@/api/v1/routes/store.routes';
import subscriptionRoutes from '@/api/v1/routes/subscription.routes';
import supplierDealRoutes from '@/api/v1/routes/supplier-deal.routes';
import supplierStoreRoutes from '@/api/v1/routes/supplier-store.routes';
import supplierRoutes from '@/api/v1/routes/supplier.routes';
import storeStaffRoutes from '@/api/v1/routes/store-staff.routes';
import stockMovementRoutes from '@/api/v1/routes/stock-movement.routes';
import userRoutes from '@/api/v1/routes/user.routes';
import waveRoutes from '@/api/v1/routes/wave.routes';
import whatsappRoutes from '@/api/v1/routes/whatsapp.routes';
import config from '@/config';
import { setupSwagger } from '@/infrastructure/docs/swagger';
import logger from '@/infrastructure/monitoring/logger';
import { initSentry } from '@/infrastructure/monitoring/sentry';
import { corsMiddleware } from '@/middleware/cors.middleware';
import {
  errorHandler,
  notFoundHandler,
} from '@/middleware/error-handler.middleware';
import { loggingMiddleware } from '@/middleware/logging.middleware';
import { smartLimiter } from '@/middleware/rate-limit.middleware';

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

// Static files - Serve images (payment provider logos, etc.)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Logging
app.use(loggingMiddleware);

// Smart rate limiting (adapte automatiquement selon GET vs POST/PUT/DELETE)
app.use(`/api/${config.app.apiVersion}`, smartLimiter);

// Swagger Documentation (only in development and staging)
if (config.app.env !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app as unknown as import('express').Express);
  logger.info('Swagger documentation available at /api-docs');
}

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const { PrismaService } = await import('@/infrastructure/database/prisma');
    const { RedisService } =
      await import('@/infrastructure/database/redis/client');

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
app.get(`/api/${config.app.apiVersion}`, (_req, res) => {
  res.json({
    success: true,
    message: 'YapaGachis API',
    version: config.app.apiVersion,
    timestamp: new Date().toISOString(),
  });
});

app.use(`/api/${config.app.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.app.apiVersion}/users`, userRoutes);
app.use(`/api/${config.app.apiVersion}/suppliers`, supplierRoutes);
app.use(`/api/${config.app.apiVersion}/products`, productRoutes);
app.use(`/api/${config.app.apiVersion}/categories`, categoryRoutes);
app.use(`/api/${config.app.apiVersion}/orders`, orderRoutes);
app.use(`/api/${config.app.apiVersion}/map`, mapRoutes);

// Phase 5: Subscriptions, Deals & Stores routes
app.use(`/api/${config.app.apiVersion}/subscriptions`, subscriptionRoutes);
app.use(`/api/${config.app.apiVersion}/deals`, dealRoutes);
app.use(`/api/${config.app.apiVersion}/stores`, storeRoutes);
app.use(`/api/${config.app.apiVersion}/supplier/deals`, supplierDealRoutes);
app.use(`/api/${config.app.apiVersion}/supplier/stores`, supplierStoreRoutes);
app.use(
  `/api/${config.app.apiVersion}/admin/subscriptions`,
  adminSubscriptionRoutes
);
app.use(`/api/${config.app.apiVersion}/admin/deals`, adminDealRoutes);

// Phase 4: Donations & Associations routes
app.use(`/api/${config.app.apiVersion}/associations`, associationRoutes);
app.use(`/api/${config.app.apiVersion}/donations`, donationRoutes);
app.use(
  `/api/${config.app.apiVersion}/associations/donations`,
  associationDonationRoutes
);
app.use(
  `/api/${config.app.apiVersion}/admin/associations`,
  adminAssociationRoutes
);
app.use(`/api/${config.app.apiVersion}/admin/donations`, adminDonationRoutes);

// Phase 6: Notifications
app.use(`/api/${config.app.apiVersion}/notifications`, notificationRoutes);

// Phase 7: Administration & Analytics
app.use(`/api/${config.app.apiVersion}/admin`, adminRoutes);
app.use(`/api/${config.app.apiVersion}/reviews`, reviewRoutes);

// Phase 11: Platform Settings
app.use(`/api/${config.app.apiVersion}/admin/settings`, adminSettingsRoutes);

// Phase 8: Advertising
app.use(`/api/${config.app.apiVersion}/advertising`, advertisingRoutes);
app.use(
  `/api/${config.app.apiVersion}/admin/advertising`,
  adminAdvertisingRoutes
);

// Phase 12: KYC AI Verification
app.use(`/api/${config.app.apiVersion}/kyc`, kycRoutes);
app.use(`/api/${config.app.apiVersion}/admin/kyc`, adminKycRoutes);

// Phase 13: Store Staff Management
app.use(`/api/${config.app.apiVersion}/staff`, storeStaffRoutes);

// Stock Movements
app.use(
  `/api/${config.app.apiVersion}/supplier/stock-movements`,
  stockMovementRoutes
);

// Phase 14: WhatsApp Integration
app.use(`/api/${config.app.apiVersion}/whatsapp`, whatsappRoutes);

// Payment Providers
app.use(
  `/api/${config.app.apiVersion}/payment-providers`,
  paymentProviderRoutes
);
app.use(
  `/api/${config.app.apiVersion}/admin/payment-providers`,
  adminPaymentProviderRoutes
);

// Wave Payment Integration
app.use(`/api/${config.app.apiVersion}/payments/wave`, waveRoutes);

// Payout Configuration (Supplier)
app.use(`/api/${config.app.apiVersion}/supplier/payout`, payoutRoutes);

// Saved Locations
app.use(`/api/${config.app.apiVersion}/saved-locations`, savedLocationRoutes);

// Search History
app.use(`/api/${config.app.apiVersion}/search`, searchHistoryRoutes);

// Favorite Stores
app.use(`/api/${config.app.apiVersion}/favorite-stores`, favoriteStoreRoutes);

// Referral System
app.use(`/api/${config.app.apiVersion}/referrals`, referralRoutes);

// Rewards System
app.use(`/api/${config.app.apiVersion}/rewards`, rewardRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
