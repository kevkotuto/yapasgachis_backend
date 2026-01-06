import { PrismaClient } from '@prisma/client';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

// Singleton pattern for Prisma Client
class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log:
          config.app.env === 'development'
            ? [
                { level: 'query', emit: 'event' },
                { level: 'error', emit: 'stdout' },
                { level: 'warn', emit: 'stdout' },
              ]
            : [{ level: 'error', emit: 'stdout' }],
      });

      // Log queries in development
      if (config.app.env === 'development') {
        PrismaService.instance.$on('query' as never, (e: any) => {
          logger.debug('Prisma Query', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
          });
        });
      }

      // Connection event handlers
      PrismaService.instance
        .$connect()
        .then(() => {
          logger.info('✅ Database connected successfully');
        })
        .catch((error: Error) => {
          logger.error('❌ Database connection failed', {
            error: error.message,
          });
          process.exit(1);
        });
    }

    return PrismaService.instance;
  }

  static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
      logger.info('Database disconnected');
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await PrismaService.instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export const prisma = PrismaService.getInstance();
export { PrismaService };
export default prisma;
