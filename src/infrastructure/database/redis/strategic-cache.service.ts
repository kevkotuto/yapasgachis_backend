import { CacheService } from './cache.service';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Strategic Cache Service
 * Provides high-level caching strategies for business entities
 */

// Cache key prefixes
const CACHE_KEYS = {
  // Products
  PRODUCT: 'product:',
  PRODUCT_LIST: 'products:list:',
  PRODUCT_CATEGORY: 'products:category:',
  PRODUCT_NEARBY: 'products:nearby:',
  PRODUCT_SUPPLIER: 'products:supplier:',

  // Deals
  DEAL: 'deal:',
  DEAL_LIST: 'deals:list:',
  DEAL_CATEGORY: 'deals:category:',

  // Suppliers
  SUPPLIER: 'supplier:',
  SUPPLIER_LIST: 'suppliers:list:',

  // Stores
  STORE: 'store:',
  STORE_NEARBY: 'stores:nearby:',

  // Users
  USER: 'user:',
  USER_PROFILE: 'user:profile:',

  // Orders
  ORDER: 'order:',
  USER_ORDERS: 'user:orders:',

  // Analytics
  DASHBOARD_STATS: 'admin:dashboard:stats',
  IMPACT_METRICS: 'admin:dashboard:impact',

  // Search
  SEARCH_RESULTS: 'search:',
  POPULAR_SEARCHES: 'search:popular',

  // Notifications
  USER_UNREAD_COUNT: 'notifications:unread:',
};

// TTL configurations (in seconds)
const TTL = {
  SHORT: 60, // 1 minute - for frequently changing data
  MEDIUM: 300, // 5 minutes - for semi-dynamic data
  LONG: 900, // 15 minutes - for less frequently changing data
  VERY_LONG: 3600, // 1 hour - for stable data
  DAY: 86400, // 24 hours - for very stable data
};

export class StrategicCacheService {
  // ==================== PRODUCTS ====================

  /**
   * Cache single product
   */
  static async cacheProduct(
    productId: string,
    product: unknown
  ): Promise<void> {
    await CacheService.set(
      `${CACHE_KEYS.PRODUCT}${productId}`,
      product,
      TTL.MEDIUM
    );
  }

  /**
   * Get cached product
   */
  static async getProduct<T>(productId: string): Promise<T | null> {
    return CacheService.get<T>(`${CACHE_KEYS.PRODUCT}${productId}`);
  }

  /**
   * Cache product list with filters
   */
  static async cacheProductList(
    filters: Record<string, unknown>,
    products: unknown
  ): Promise<void> {
    const filterKey = this.hashFilters(filters);
    await CacheService.set(
      `${CACHE_KEYS.PRODUCT_LIST}${filterKey}`,
      products,
      TTL.SHORT
    );
  }

  /**
   * Get cached product list
   */
  static async getProductList<T>(
    filters: Record<string, unknown>
  ): Promise<T | null> {
    const filterKey = this.hashFilters(filters);
    return CacheService.get<T>(`${CACHE_KEYS.PRODUCT_LIST}${filterKey}`);
  }

  /**
   * Invalidate product caches
   */
  static async invalidateProduct(productId: string): Promise<void> {
    await Promise.all([
      CacheService.delete(`${CACHE_KEYS.PRODUCT}${productId}`),
      CacheService.deletePattern(`${CACHE_KEYS.PRODUCT_LIST}*`),
      CacheService.deletePattern(`${CACHE_KEYS.PRODUCT_CATEGORY}*`),
      CacheService.deletePattern(`${CACHE_KEYS.PRODUCT_NEARBY}*`),
    ]);
    logger.debug('Product cache invalidated', { productId });
  }

  /**
   * Invalidate all product caches for a supplier
   */
  static async invalidateSupplierProducts(supplierId: string): Promise<void> {
    await Promise.all([
      CacheService.deletePattern(
        `${CACHE_KEYS.PRODUCT_SUPPLIER}${supplierId}*`
      ),
      CacheService.deletePattern(`${CACHE_KEYS.PRODUCT_LIST}*`),
    ]);
    logger.debug('Supplier products cache invalidated', { supplierId });
  }

  // ==================== DEALS ====================

  /**
   * Cache single deal
   */
  static async cacheDeal(dealId: string, deal: unknown): Promise<void> {
    await CacheService.set(`${CACHE_KEYS.DEAL}${dealId}`, deal, TTL.MEDIUM);
  }

  /**
   * Get cached deal
   */
  static async getDeal<T>(dealId: string): Promise<T | null> {
    return CacheService.get<T>(`${CACHE_KEYS.DEAL}${dealId}`);
  }

  /**
   * Cache deal list
   */
  static async cacheDealList(
    filters: Record<string, unknown>,
    deals: unknown
  ): Promise<void> {
    const filterKey = this.hashFilters(filters);
    await CacheService.set(
      `${CACHE_KEYS.DEAL_LIST}${filterKey}`,
      deals,
      TTL.SHORT
    );
  }

  /**
   * Get cached deal list
   */
  static async getDealList<T>(
    filters: Record<string, unknown>
  ): Promise<T | null> {
    const filterKey = this.hashFilters(filters);
    return CacheService.get<T>(`${CACHE_KEYS.DEAL_LIST}${filterKey}`);
  }

  /**
   * Invalidate deal caches
   */
  static async invalidateDeal(dealId: string): Promise<void> {
    await Promise.all([
      CacheService.delete(`${CACHE_KEYS.DEAL}${dealId}`),
      CacheService.deletePattern(`${CACHE_KEYS.DEAL_LIST}*`),
      CacheService.deletePattern(`${CACHE_KEYS.DEAL_CATEGORY}*`),
    ]);
    logger.debug('Deal cache invalidated', { dealId });
  }

  // ==================== STORES ====================

  /**
   * Cache nearby stores
   */
  static async cacheNearbyStores(
    lat: number,
    lng: number,
    radius: number,
    stores: unknown
  ): Promise<void> {
    const key = `${CACHE_KEYS.STORE_NEARBY}${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
    await CacheService.set(key, stores, TTL.MEDIUM);
  }

  /**
   * Get cached nearby stores
   */
  static async getNearbyStores<T>(
    lat: number,
    lng: number,
    radius: number
  ): Promise<T | null> {
    const key = `${CACHE_KEYS.STORE_NEARBY}${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
    return CacheService.get<T>(key);
  }

  // ==================== ANALYTICS ====================

  /**
   * Cache dashboard stats
   */
  static async cacheDashboardStats(stats: unknown): Promise<void> {
    await CacheService.set(CACHE_KEYS.DASHBOARD_STATS, stats, TTL.MEDIUM);
  }

  /**
   * Get cached dashboard stats
   */
  static async getDashboardStats<T>(): Promise<T | null> {
    return CacheService.get<T>(CACHE_KEYS.DASHBOARD_STATS);
  }

  /**
   * Cache impact metrics
   */
  static async cacheImpactMetrics(metrics: unknown): Promise<void> {
    await CacheService.set(CACHE_KEYS.IMPACT_METRICS, metrics, TTL.LONG);
  }

  /**
   * Get cached impact metrics
   */
  static async getImpactMetrics<T>(): Promise<T | null> {
    return CacheService.get<T>(CACHE_KEYS.IMPACT_METRICS);
  }

  /**
   * Invalidate analytics caches
   */
  static async invalidateAnalytics(): Promise<void> {
    await Promise.all([
      CacheService.delete(CACHE_KEYS.DASHBOARD_STATS),
      CacheService.delete(CACHE_KEYS.IMPACT_METRICS),
    ]);
    logger.debug('Analytics cache invalidated');
  }

  // ==================== USERS ====================

  /**
   * Cache user profile
   */
  static async cacheUserProfile(
    userId: string,
    profile: unknown
  ): Promise<void> {
    await CacheService.set(
      `${CACHE_KEYS.USER_PROFILE}${userId}`,
      profile,
      TTL.MEDIUM
    );
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile<T>(userId: string): Promise<T | null> {
    return CacheService.get<T>(`${CACHE_KEYS.USER_PROFILE}${userId}`);
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      CacheService.delete(`${CACHE_KEYS.USER}${userId}`),
      CacheService.delete(`${CACHE_KEYS.USER_PROFILE}${userId}`),
    ]);
    logger.debug('User cache invalidated', { userId });
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Cache user unread notification count
   */
  static async cacheUnreadCount(userId: string, count: number): Promise<void> {
    await CacheService.set(
      `${CACHE_KEYS.USER_UNREAD_COUNT}${userId}`,
      count,
      TTL.SHORT
    );
  }

  /**
   * Get cached unread count
   */
  static async getUnreadCount(userId: string): Promise<number | null> {
    return CacheService.get<number>(`${CACHE_KEYS.USER_UNREAD_COUNT}${userId}`);
  }

  /**
   * Increment unread count
   */
  static async incrementUnreadCount(userId: string): Promise<void> {
    await CacheService.increment(`${CACHE_KEYS.USER_UNREAD_COUNT}${userId}`);
  }

  /**
   * Reset unread count
   */
  static async resetUnreadCount(userId: string): Promise<void> {
    await CacheService.set(
      `${CACHE_KEYS.USER_UNREAD_COUNT}${userId}`,
      0,
      TTL.SHORT
    );
  }

  // ==================== SEARCH ====================

  /**
   * Cache search results
   */
  static async cacheSearchResults(
    query: string,
    filters: Record<string, unknown>,
    results: unknown
  ): Promise<void> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}${this.hashQuery(query, filters)}`;
    await CacheService.set(key, results, TTL.SHORT);
  }

  /**
   * Get cached search results
   */
  static async getSearchResults<T>(
    query: string,
    filters: Record<string, unknown>
  ): Promise<T | null> {
    const key = `${CACHE_KEYS.SEARCH_RESULTS}${this.hashQuery(query, filters)}`;
    return CacheService.get<T>(key);
  }

  /**
   * Record popular search
   */
  static async recordSearch(query: string): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim();
    await CacheService.increment(
      `${CACHE_KEYS.POPULAR_SEARCHES}:${normalizedQuery}`
    );
  }

  // ==================== HELPERS ====================

  /**
   * Hash filters for cache key
   */
  private static hashFilters(filters: Record<string, unknown>): string {
    const sorted = Object.keys(filters)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = filters[key];
          return acc;
        },
        {} as Record<string, unknown>
      );

    return Buffer.from(JSON.stringify(sorted)).toString('base64').slice(0, 32);
  }

  /**
   * Hash search query and filters
   */
  private static hashQuery(
    query: string,
    filters: Record<string, unknown>
  ): string {
    const data = { query: query.toLowerCase().trim(), ...filters };
    return this.hashFilters(data);
  }

  /**
   * Warm up cache with popular data
   */
  static async warmUpCache(): Promise<void> {
    logger.info('Starting cache warm-up...');

    try {
      // This would typically fetch and cache popular products, deals, etc.
      // Implementation depends on the application's specific needs

      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed', { error: (error as Error).message });
    }
  }

  /**
   * Clear all application caches (admin operation)
   */
  static async clearAllCaches(): Promise<void> {
    const patterns = Object.values(CACHE_KEYS).map((prefix) => `${prefix}*`);

    await Promise.all(
      patterns.map((pattern) => CacheService.deletePattern(pattern))
    );

    logger.info('All application caches cleared');
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    products: boolean;
    deals: boolean;
    analytics: boolean;
  }> {
    const [productsExists, dealsExists, analyticsExists] = await Promise.all([
      CacheService.exists(`${CACHE_KEYS.PRODUCT_LIST}*`),
      CacheService.exists(`${CACHE_KEYS.DEAL_LIST}*`),
      CacheService.exists(CACHE_KEYS.DASHBOARD_STATS),
    ]);

    return {
      products: productsExists,
      deals: dealsExists,
      analytics: analyticsExists,
    };
  }
}

export { CACHE_KEYS, TTL };
export default StrategicCacheService;
