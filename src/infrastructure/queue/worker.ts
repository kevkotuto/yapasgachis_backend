import { createNotificationWorker } from './processors/notification.processor';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Queue Worker Entry Point
 *
 * This file bootstraps all queue workers for background job processing.
 * Run with: npm run queue:worker
 */

let notificationWorker: ReturnType<typeof createNotificationWorker>;

async function startWorkers(): Promise<void> {
  logger.info('Starting queue workers...');

  // Start notification worker
  notificationWorker = createNotificationWorker();

  logger.info('Queue workers started successfully', {
    workers: ['notifications'],
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down workers...`);

  try {
    if (notificationWorker) {
      await notificationWorker.close();
    }

    logger.info('Workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception in worker', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection in worker', {
    reason: reason instanceof Error ? reason.message : reason,
  });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start workers
startWorkers().catch((error) => {
  logger.error('Failed to start workers', { error: error.message });
  process.exit(1);
});
