import http from 'http';

import app from './app';

import config from '@/config';
import { initializeNotificationListeners } from '@/core/services/notification-listeners';
import { PrismaService } from '@/infrastructure/database/prisma';
import { RedisService } from '@/infrastructure/database/redis/client';
import logger from '@/infrastructure/monitoring/logger';
import socketService from '@/infrastructure/websocket/socket.service';

// Create HTTP server
const server = http.createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} signal received: closing HTTP server`);

  // Close server (stop accepting new connections)
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close WebSocket server
      await socketService.close();

      // Close database connections
      await Promise.all([
        PrismaService.disconnect(),
        RedisService.disconnect(),
      ]);

      logger.info('All connections closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: (error as Error).message,
      });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
  });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Test database connections
    const [dbHealthy, redisHealthy] = await Promise.all([
      PrismaService.healthCheck(),
      RedisService.healthCheck(),
    ]);

    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }

    // Initialize WebSocket server
    if (config.features?.websocket !== false) {
      socketService.initialize(server);
      logger.info('WebSocket server initialized');
    }

    // Initialize notification event listeners (after WebSocket initialization)
    if (config.features?.notifications !== false) {
      initializeNotificationListeners();
      logger.info('Notification event listeners initialized');
    }

    // Start listening
    server.listen(config.app.port, () => {
      logger.info(`
        ╔═══════════════════════════════════════════════╗
        ║                                               ║
        ║   🚀 YapaGachis API Server                    ║
        ║                                               ║
        ║   Environment: ${config.app.env.padEnd(33)}║
        ║   Port: ${config.app.port.toString().padEnd(38)}║
        ║   URL: ${config.app.url.padEnd(39)}║
        ║   WebSocket: ${(config.features?.websocket !== false ? 'Enabled' : 'Disabled').padEnd(33)}║
        ║                                               ║
        ║   Health: http://localhost:${config.app.port}/health    ║
        ║   API: http://localhost:${config.app.port}/api/${config.app.apiVersion}      ║
        ║                                               ║
        ╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
};

// Start the server
startServer();

export default server;
