import axios from 'axios';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import CacheService from '@/infrastructure/database/redis/cache.service';

/**
 * Geocoding Service
 * Converts addresses to coordinates and vice versa
 */
export class GeocodingService {
  private static instance: GeocodingService;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly CACHE_PREFIX = 'geocode:';

  private constructor() {}

  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Get coordinates from address
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  async geocodeAddress(address: string): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null> {
    const cacheKey = `${this.CACHE_PREFIX}forward:${address.toLowerCase()}`;

    try {
      // Check cache first
      const cached = await CacheService.get<{
        latitude: number;
        longitude: number;
        formattedAddress: string;
      }>(cacheKey);

      if (cached) {
        logger.debug('Geocoding result from cache', { address });
        return cached;
      }

      // Call Nominatim API
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'YapaGachis/1.0',
          },
          timeout: 5000,
        }
      );

      if (!response.data || response.data.length === 0) {
        logger.warn('No geocoding results found', { address });
        return null;
      }

      const result = response.data[0];
      const data = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };

      // Cache the result
      await CacheService.set(cacheKey, data, this.CACHE_TTL);

      logger.info('Address geocoded successfully', {
        address,
        coordinates: `${data.latitude},${data.longitude}`,
      });

      return data;
    } catch (error) {
      logger.error('Geocoding failed', {
        address,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{
    address: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } | null> {
    const cacheKey = `${this.CACHE_PREFIX}reverse:${latitude},${longitude}`;

    try {
      // Check cache first
      const cached = await CacheService.get<{
        address: string;
        city?: string;
        country?: string;
        postalCode?: string;
      }>(cacheKey);

      if (cached) {
        logger.debug('Reverse geocoding result from cache', {
          latitude,
          longitude,
        });
        return cached;
      }

      // Call Nominatim API
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'YapaGachis/1.0',
          },
          timeout: 5000,
        }
      );

      if (!response.data || !response.data.address) {
        logger.warn('No reverse geocoding results found', {
          latitude,
          longitude,
        });
        return null;
      }

      const data = {
        address: response.data.display_name,
        city:
          response.data.address.city ||
          response.data.address.town ||
          response.data.address.village,
        country: response.data.address.country,
        postalCode: response.data.address.postcode,
      };

      // Cache the result
      await CacheService.set(cacheKey, data, this.CACHE_TTL);

      logger.info('Coordinates reverse geocoded successfully', {
        latitude,
        longitude,
        city: data.city,
      });

      return data;
    } catch (error) {
      logger.error('Reverse geocoding failed', {
        latitude,
        longitude,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns distance in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get bounding box coordinates for a given point and radius
   * Useful for database queries to filter by location
   */
  getBoundingBox(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    const latChange = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
    const lonChange =
      radiusKm / (111.32 * Math.cos(this.toRadians(latitude)));

    return {
      minLat: latitude - latChange,
      maxLat: latitude + latChange,
      minLon: longitude - lonChange,
      maxLon: longitude + lonChange,
    };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Get nearest city to coordinates
   */
  async getNearestCity(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    const result = await this.reverseGeocode(latitude, longitude);
    return result?.city || null;
  }

  /**
   * Batch geocode multiple addresses
   * Note: Be mindful of rate limits (max 1 request/second for Nominatim)
   */
  async batchGeocode(
    addresses: string[]
  ): Promise<
    Array<{
      address: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      error?: string;
    }>
  > {
    const results: Array<{
      address: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      error?: string;
    }> = [];

    for (const address of addresses) {
      try {
        const result = await this.geocodeAddress(address);

        if (result) {
          results.push({
            address,
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: result.formattedAddress,
          });
        } else {
          results.push({
            address,
            error: 'No results found',
          });
        }

        // Respect rate limit: 1 request per second
        await this.delay(1000);
      } catch (error) {
        results.push({
          address,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Parse address string to components
   */
  parseAddress(address: string): {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } {
    // Basic parsing - can be enhanced with more sophisticated logic
    const parts = address.split(',').map((part) => part.trim());

    return {
      street: parts[0] || undefined,
      city: parts[1] || undefined,
      country: parts[parts.length - 1] || undefined,
    };
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(
    latitude: number,
    longitude: number,
    precision: number = 6
  ): string {
    return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default GeocodingService.getInstance();
