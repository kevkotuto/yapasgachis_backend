/**
 * KYC Verification Queue Processor
 * Phase 12: AI-based identity verification
 *
 * BullMQ worker for processing KYC verification jobs
 */

import { Worker, Job } from 'bullmq';

import config from '@config/index';
import { kycService } from '@core/services/kyc.service';
import logger from '@infrastructure/monitoring/logger';
import {
  KycVerificationJobData,
  KycNotificationJobData,
} from '@/types/kyc.types';

// Redis connection for BullMQ
const connection = {
  host: config.queue.redis.host,
  port: config.queue.redis.port,
};

/**
 * Create KYC Verification Worker
 */
export function createKycVerificationWorker(): Worker {
  const worker = new Worker<KycVerificationJobData>(
    'kyc-verification',
    async (job: Job<KycVerificationJobData>) => {
      const { attemptId, supplierId } = job.data;

      logger.info('Processing KYC verification job', {
        jobId: job.id,
        attemptId,
        supplierId,
      });

      try {
        // Update job progress
        await job.updateProgress(10);

        // Process verification
        const result = await kycService.processVerification(attemptId);

        await job.updateProgress(100);

        logger.info('KYC verification job completed', {
          jobId: job.id,
          attemptId,
          status: result.status,
          overallScore: result.overallScore,
        });

        return {
          success: true,
          attemptId,
          status: result.status,
          overallScore: result.overallScore,
        };
      } catch (error) {
        logger.error('KYC verification job failed', {
          jobId: job.id,
          attemptId,
          error,
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: config.queue.concurrency || 5,
      limiter: {
        max: 10, // Max 10 jobs per second
        duration: 1000,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job, returnvalue) => {
    logger.info('KYC verification worker: job completed', {
      jobId: job.id,
      attemptId: job.data.attemptId,
      result: returnvalue,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error('KYC verification worker: job failed', {
      jobId: job?.id,
      attemptId: job?.data.attemptId,
      error: error.message,
    });
  });

  worker.on('error', (error) => {
    logger.error('KYC verification worker error', { error: error.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('KYC verification worker: job stalled', { jobId });
  });

  logger.info('KYC verification worker started', {
    concurrency: config.queue.concurrency || 5,
  });

  return worker;
}

/**
 * Create KYC Notification Worker
 */
export function createKycNotificationWorker(): Worker {
  const worker = new Worker<KycNotificationJobData>(
    'kyc-notification',
    async (job: Job<KycNotificationJobData>) => {
      const { supplierId, notificationType, title, message } = job.data;

      logger.debug('Processing KYC notification job', {
        jobId: job.id,
        supplierId,
        notificationType,
      });

      try {
        // TODO: Integrate with actual notification service
        // For now, just log the notification
        logger.info('KYC notification sent', {
          supplierId,
          notificationType,
          title,
          message,
        });

        // In production, you would:
        // 1. Send push notification via FCM/Expo
        // 2. Send email notification
        // 3. Send SMS if configured
        // Example:
        // await notificationService.sendToUser(supplierId, {
        //   type: notificationType,
        //   title,
        //   message,
        //   data: job.data.data,
        // });

        return {
          success: true,
          notificationType,
        };
      } catch (error) {
        logger.error('KYC notification job failed', {
          jobId: job.id,
          supplierId,
          error,
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: 10, // Notifications can be processed in parallel
    }
  );

  worker.on('completed', (job) => {
    logger.debug('KYC notification worker: job completed', {
      jobId: job.id,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error('KYC notification worker: job failed', {
      jobId: job?.id,
      error: error.message,
    });
  });

  worker.on('error', (error) => {
    logger.error('KYC notification worker error', { error: error.message });
  });

  logger.info('KYC notification worker started');

  return worker;
}

// Workers instances
let verificationWorker: Worker | null = null;
let notificationWorker: Worker | null = null;

/**
 * Start all KYC workers
 */
export function startKycWorkers(): void {
  if (!verificationWorker) {
    verificationWorker = createKycVerificationWorker();
  }

  if (!notificationWorker) {
    notificationWorker = createKycNotificationWorker();
  }

  logger.info('All KYC workers started');
}

/**
 * Stop all KYC workers
 */
export async function stopKycWorkers(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (verificationWorker) {
    closePromises.push(verificationWorker.close());
    verificationWorker = null;
  }

  if (notificationWorker) {
    closePromises.push(notificationWorker.close());
    notificationWorker = null;
  }

  await Promise.all(closePromises);
  logger.info('All KYC workers stopped');
}

/**
 * Get workers status
 */
export function getKycWorkersStatus(): {
  verification: boolean;
  notification: boolean;
} {
  return {
    verification: verificationWorker !== null && !verificationWorker.closing,
    notification: notificationWorker !== null && !notificationWorker.closing,
  };
}
