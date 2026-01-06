import { Prisma } from '@prisma/client';
import { Worker, Job } from 'bullmq';

import config from '@/config';
import { prisma } from '@/infrastructure/database/prisma';
import emailService from '@/infrastructure/messaging/email/email.service';
import expoPushService from '@/infrastructure/messaging/push/expo-push.service';
import logger from '@/infrastructure/monitoring/logger';
import socketService from '@/infrastructure/websocket/socket.service';
import type {
  SendPushJobData,
  SendEmailJobData,
  BulkNotificationJobData,
  ScheduledNotificationJobData,
} from '@/types/notification.types';
import { NotificationType, NotificationPriority } from '@/utils/enums';

/**
 * Process send-push job: Send push notification to a user
 */
async function handleSendPush(data: SendPushJobData): Promise<void> {
  try {
    const tickets = await expoPushService.sendToUser(data.userId, {
      title: data.title,
      body: data.body,
      data: data.data,
      sound: 'default',
      priority:
        data.priority === NotificationPriority.HIGH ||
        data.priority === NotificationPriority.URGENT
          ? 'high'
          : 'default',
    });

    // Update notification record with push status
    if (data.notificationId) {
      await prisma.notification.update({
        where: { id: data.notificationId },
        data: {
          pushSent:
            tickets.length > 0 && tickets.some((t) => t.status === 'ok'),
          pushSentAt: new Date(),
          pushReceipts: tickets as unknown as Prisma.InputJsonValue,
        },
      });
    }

    logger.debug('Push notification processed', {
      notificationId: data.notificationId,
      ticketCount: tickets.length,
      successCount: tickets.filter((t) => t.status === 'ok').length,
    });
  } catch (error) {
    logger.error('Failed to process push notification', {
      notificationId: data.notificationId,
      userId: data.userId,
      error: (error as Error).message,
    });
    throw error; // Retry
  }
}

/**
 * Process send-email job: Send email notification
 */
async function handleSendEmail(data: SendEmailJobData): Promise<void> {
  try {
    await emailService.send({
      to: data.email,
      subject: data.subject,
      body: data.body,
      template: data.template,
      templateData: data.templateData,
    });

    // Update notification record with email status
    if (data.notificationId) {
      await prisma.notification.update({
        where: { id: data.notificationId },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
    }

    logger.debug('Email notification processed', {
      notificationId: data.notificationId,
      email: data.email,
    });
  } catch (error) {
    logger.error('Failed to process email notification', {
      notificationId: data.notificationId,
      error: (error as Error).message,
    });
    throw error; // Retry
  }
}

/**
 * Process bulk-notification job: Send notifications to multiple users
 */
async function handleBulkNotification(
  data: BulkNotificationJobData
): Promise<void> {
  const {
    userIds,
    sendPush = true,
    sendEmail = false,
    sendRealtime = true,
    ...notificationData
  } = data;

  try {
    // Create notifications in batch
    const notifications = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: notificationData.type as NotificationType,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data as Prisma.InputJsonValue,
            priority: NotificationPriority.NORMAL,
          },
        })
      )
    );

    // Send push notifications
    if (sendPush) {
      await expoPushService.sendToUsers(userIds, {
        title: notificationData.title,
        body: notificationData.message,
        data: notificationData.data,
      });
    }

    // Send real-time updates via WebSocket
    if (sendRealtime) {
      notifications.forEach((notification) => {
        socketService.sendToUser(notification.userId, 'notification:new', {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            createdAt: notification.createdAt,
          },
        });
      });
    }

    logger.info('Bulk notifications processed', {
      userCount: userIds.length,
      type: notificationData.type,
      pushSent: sendPush,
      realtimeSent: sendRealtime,
    });
  } catch (error) {
    logger.error('Failed to process bulk notifications', {
      userCount: userIds.length,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Process scheduled-notification job: Triggered when a scheduled notification is due
 */
async function handleScheduledNotification(
  data: ScheduledNotificationJobData
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scheduledFor, ...params } = data;

  // Import dynamically to avoid circular dependency
  const { notificationService } =
    await import('@/core/services/notification.service');

  await notificationService.create({
    ...params,
    scheduledFor: undefined, // Clear scheduled time since we're processing now
  });
}

/**
 * Process check-receipts job: Verify Expo push delivery
 */
async function handleCheckReceipts(data: {
  ticketIds: string[];
}): Promise<void> {
  const receipts = await expoPushService.getReceipts(data.ticketIds);

  let successCount = 0;
  let errorCount = 0;

  for (const [ticketId, receipt] of Object.entries(receipts)) {
    if (receipt.status === 'ok') {
      successCount++;
    } else {
      errorCount++;
      logger.warn('Push notification delivery failed', {
        ticketId,
        error: receipt.details?.error,
        message: receipt.message,
      });
    }
  }

  logger.info('Push receipts checked', {
    total: data.ticketIds.length,
    success: successCount,
    errors: errorCount,
  });
}

/**
 * Create and configure the notification worker
 */
export function createNotificationWorker(): Worker {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      switch (job.name) {
        case 'send-push':
          await handleSendPush(job.data as SendPushJobData);
          break;
        case 'send-email':
          await handleSendEmail(job.data as SendEmailJobData);
          break;
        case 'bulk-notification':
          await handleBulkNotification(job.data as BulkNotificationJobData);
          break;
        case 'scheduled-notification':
          await handleScheduledNotification(
            job.data as ScheduledNotificationJobData
          );
          break;
        case 'check-receipts':
          await handleCheckReceipts(job.data as { ticketIds: string[] });
          break;
        default:
          logger.warn('Unknown job type', { name: job.name });
      }
    },
    {
      connection: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
      },
      concurrency: config.queue.concurrency,
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    logger.debug('Job completed', { jobId: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  return worker;
}

export default createNotificationWorker;
