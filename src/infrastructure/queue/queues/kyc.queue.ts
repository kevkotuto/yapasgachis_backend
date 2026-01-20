/**
 * KYC Verification Queue
 * Phase 12: AI-based identity verification
 *
 * BullMQ queue for background KYC verification processing
 */

import { Queue, QueueEvents } from 'bullmq';

import config from '@config/index';
import logger from '@infrastructure/monitoring/logger';
import { KycVerificationJobData, KycNotificationJobData } from '@/types/kyc.types';

// Redis connection for BullMQ
const connection = {
  host: config.queue.redis.host,
  port: config.queue.redis.port,
  password: config.redis.password,
};

// KYC Verification Queue
export const kycVerificationQueue = new Queue<KycVerificationJobData>(
  'kyc-verification',
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
        count: 5000,
      },
    },
  }
);

// KYC Notification Queue
export const kycNotificationQueue = new Queue<KycNotificationJobData>(
  'kyc-notification',
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep for 1 hour
        count: 500,
      },
      removeOnFail: {
        age: 86400, // Keep failed for 24 hours
        count: 1000,
      },
    },
  }
);

// Queue Events for monitoring
export const kycVerificationQueueEvents = new QueueEvents('kyc-verification', {
  connection,
});

export const kycNotificationQueueEvents = new QueueEvents('kyc-notification', {
  connection,
});

// Set up event listeners
kycVerificationQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info('KYC verification job completed', { jobId, returnvalue });
});

kycVerificationQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('KYC verification job failed', { jobId, failedReason });
});

kycNotificationQueueEvents.on('completed', ({ jobId }) => {
  logger.debug('KYC notification job completed', { jobId });
});

kycNotificationQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('KYC notification job failed', { jobId, failedReason });
});

/**
 * Add a KYC verification job to the queue
 */
export async function addKycVerificationJob(
  data: KycVerificationJobData,
  priority?: number
): Promise<string> {
  const job = await kycVerificationQueue.add('verify-kyc', data, {
    priority: priority || 0,
    jobId: `kyc-${data.attemptId}`,
  });

  logger.info('KYC verification job added to queue', {
    jobId: job.id,
    attemptId: data.attemptId,
    supplierId: data.supplierId,
  });

  return job.id || data.attemptId;
}

/**
 * Add a KYC notification job to the queue
 */
export async function addKycNotificationJob(
  data: KycNotificationJobData
): Promise<string> {
  const job = await kycNotificationQueue.add('send-notification', data, {
    delay: 0, // Send immediately
  });

  logger.debug('KYC notification job added to queue', {
    jobId: job.id,
    notificationType: data.notificationType,
  });

  return job.id || data.attemptId;
}

/**
 * Get queue statistics
 */
export async function getKycQueueStats() {
  const [
    verificationWaiting,
    verificationActive,
    verificationCompleted,
    verificationFailed,
    notificationWaiting,
    notificationActive,
  ] = await Promise.all([
    kycVerificationQueue.getWaitingCount(),
    kycVerificationQueue.getActiveCount(),
    kycVerificationQueue.getCompletedCount(),
    kycVerificationQueue.getFailedCount(),
    kycNotificationQueue.getWaitingCount(),
    kycNotificationQueue.getActiveCount(),
  ]);

  return {
    verification: {
      waiting: verificationWaiting,
      active: verificationActive,
      completed: verificationCompleted,
      failed: verificationFailed,
    },
    notification: {
      waiting: notificationWaiting,
      active: notificationActive,
    },
  };
}

/**
 * Clean old jobs from queues
 */
export async function cleanKycQueues(gracePeriodMs: number = 86400000) {
  await Promise.all([
    kycVerificationQueue.clean(gracePeriodMs, 1000, 'completed'),
    kycVerificationQueue.clean(gracePeriodMs * 7, 1000, 'failed'),
    kycNotificationQueue.clean(gracePeriodMs / 24, 500, 'completed'),
    kycNotificationQueue.clean(gracePeriodMs, 500, 'failed'),
  ]);

  logger.info('KYC queues cleaned');
}

/**
 * Gracefully close queues
 */
export async function closeKycQueues() {
  await Promise.all([
    kycVerificationQueue.close(),
    kycNotificationQueue.close(),
    kycVerificationQueueEvents.close(),
    kycNotificationQueueEvents.close(),
  ]);

  logger.info('KYC queues closed');
}
