import Redis from 'ioredis';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

// Singleton pattern for Redis Client
class RedisService {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisService.instance) {
      RedisService.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis reconnecting... Attempt ${times}`, { delay });
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // Event handlers
      RedisService.instance.on('connect', () => {
        logger.info('✅ Redis connected successfully');
      });

      RedisService.instance.on('ready', () => {
        logger.info('Redis client is ready');
      });

      RedisService.instance.on('error', (error: Error) => {
        logger.error('❌ Redis connection error', {
          error: error.message,
        });
      });

      RedisService.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });

      RedisService.instance.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });
    }

    return RedisService.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisService.instance) {
      await RedisService.instance.quit();
      logger.info('Redis disconnected');
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const pong = await RedisService.instance.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  static async flushAll(): Promise<void> {
    if (config.app.env !== 'production') {
      await RedisService.instance.flushall();
      logger.info('Redis cache cleared');
    }
  }
}

export const redis = RedisService.getInstance();
export { RedisService };
export default redis;
