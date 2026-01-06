import redis from './client';
import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

export class CacheService {
  /**
   * Set cache with TTL
   */
  static async set(
    key: string,
    value: any,
    ttl: number = config.cache.ttl.medium
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Delete cache
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = config.cache.ttl.medium
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetcher();

    // Set in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Increment counter
   */
  static async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, by);
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  static async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await redis.decrby(key, by);
    } catch (error) {
      logger.error('Cache decrement error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      logger.error('Cache expire error', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get remaining TTL
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', {
        key,
        error: (error as Error).message,
      });
      return -1;
    }
  }

  /**
   * Add to set
   */
  static async addToSet(key: string, ...members: string[]): Promise<void> {
    try {
      await redis.sadd(key, ...members);
    } catch (error) {
      logger.error('Cache addToSet error', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Remove from set
   */
  static async removeFromSet(key: string, ...members: string[]): Promise<void> {
    try {
      await redis.srem(key, ...members);
    } catch (error) {
      logger.error('Cache removeFromSet error', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get set members
   */
  static async getSetMembers(key: string): Promise<string[]> {
    try {
      return await redis.smembers(key);
    } catch (error) {
      logger.error('Cache getSetMembers error', {
        key,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Check if member in set
   */
  static async isInSet(key: string, member: string): Promise<boolean> {
    try {
      const result = await redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error('Cache isInSet error', {
        key,
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export default CacheService;
