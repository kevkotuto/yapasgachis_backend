import { Queue, QueueOptions } from 'bullmq';

import config from '@/config';

/**
 * Queue options shared across all notification queues
 */
const queueOptions: QueueOptions = {
  connection: {
    host: config.queue.redis.host,
    port: config.queue.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
};

/**
 * Main notification queue for push notifications, emails, and bulk notifications
 *
 * Job types:
 * - send-push: Send push notification to a user
 * - send-email: Send email notification
 * - bulk-notification: Send notifications to multiple users
 * - scheduled-notification: Process scheduled notifications
 * - check-receipts: Check Expo push receipts
 */
export const notificationQueue = new Queue('notifications', queueOptions);

/**
 * Scheduled jobs queue for cron-like tasks
 *
 * Job types:
 * - expiring-products: Check for products expiring soon
 * - expiring-subscriptions: Check for subscriptions expiring soon
 * - deal-reminders: Send deal booking reminders
 */
export const scheduledQueue = new Queue('scheduled', queueOptions);

export default notificationQueue;
