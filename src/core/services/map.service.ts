import { ProductCategory, ProductStatus } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Map Marker Type
 */
export type MapMarkerType = 'product' | 'deal' | 'donation' | 'store';

/**
 * Map Marker Interface
 */
export interface MapMarker {
  id: string;
  type: MapMarkerType;
  name: string;
  latitude: number;
  longitude: number;
  category?: ProductCategory | string;
  // Product/Deal-specific fields
  discountedPrice?: number;
  dealPrice?: number;
  originalPrice?: number;
  images?: string[];
  expiryDate?: Date;
  discountPercent?: number;
  // Store-specific fields
  storeAddress?: string;
  storeCity?: string;
  storeCommune?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  // Association-specific fields (for donations)
  organizationName?: string;
}

/**
 * Map Marker Filters
 */
export interface MapMarkerFilters {
  category?: string;
  type?: MapMarkerType | string; // Allow comma-separated types
  types?: MapMarkerType[]; // Array of types
  bounds?: {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
  };
}

/**
 * Map Service
 * Business logic for map markers aggregation from products and stores
 */
export class MapService {
  /**
   * Get all map markers from active products, deals, donations and stores
   */
  async getMapMarkers(filters?: MapMarkerFilters): Promise<MapMarker[]> {
    try {
      const markers: MapMarker[] = [];

      // Parse types if provided as string
      const types = filters?.types || this.parseTypes(filters?.type);

      // Fetch products if requested
      if (types.length === 0 || types.includes('product')) {
        const products = await this.getProductMarkers(filters);
        markers.push(...products);
      }

      // Fetch deals if requested
      if (types.length === 0 || types.includes('deal')) {
        const deals = await this.getDealMarkers(filters);
        markers.push(...deals);
      }

      // Fetch donations if requested
      if (types.length === 0 || types.includes('donation')) {
        const donations = await this.getDonationMarkers(filters);
        markers.push(...donations);
      }

      // Fetch stores if requested
      if (types.length === 0 || types.includes('store')) {
        const stores = await this.getStoreMarkers(filters);
        markers.push(...stores);
      }

      logger.info('Map markers retrieved', {
        totalMarkers: markers.length,
        filters,
      });

      return markers;
    } catch (error) {
      logger.error('Error retrieving map markers', {
        error: (error as Error).message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Parse type string to array of MapMarkerType
   */
  private parseTypes(typeString?: string): MapMarkerType[] {
    if (!typeString) return [];
    return typeString
      .split(',')
      .map((t) => t.trim() as MapMarkerType)
      .filter((t) => ['product', 'deal', 'donation', 'store'].includes(t));
  }

  /**
   * Get product markers with location data from their store or supplier
   */
  private async getProductMarkers(
    filters?: MapMarkerFilters
  ): Promise<MapMarker[]> {
    try {
      // Build where clause
      const where: any = {
        status: ProductStatus.ACTIVE,
        quantityAvailable: { gt: 0 },
        OR: [
          // Products with store location
          {
            store: {
              isActive: true,
            },
          },
          // Products with supplier location (fallback)
          {
            storeId: null,
            supplier: {
              isVerified: true,
            },
          },
        ],
      };

      // Apply category filter (exclude if STORE category)
      if (filters?.category && filters.category !== 'STORE') {
        where.category = filters.category;
      }

      // Apply bounds filter
      if (filters?.bounds) {
        const { ne_lat, ne_lng, sw_lat, sw_lng } = filters.bounds;
        where.OR = where.OR.map((condition: any) => ({
          ...condition,
          ...(condition.store
            ? {
                store: {
                  ...condition.store,
                  latitude: { gte: sw_lat, lte: ne_lat },
                  longitude: { gte: sw_lng, lte: ne_lng },
                },
              }
            : {
                supplier: {
                  ...condition.supplier,
                  latitude: { gte: sw_lat, lte: ne_lat },
                  longitude: { gte: sw_lng, lte: ne_lng },
                },
              }),
        }));
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              latitude: true,
              longitude: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              address: true,
              city: true,
              commune: true,
            },
          },
        },
        take: 500, // Limit results for performance
      });

      const markers: MapMarker[] = products
        .map((product) => {
          // Use store location if available, otherwise supplier location
          const latitude = product.store?.latitude || product.supplier.latitude;
          const longitude =
            product.store?.longitude || product.supplier.longitude;

          // Skip if no coordinates
          if (!latitude || !longitude) {
            return null;
          }

          return {
            id: product.id,
            type: 'product' as MapMarkerType,
            name: product.title,
            latitude,
            longitude,
            category: product.category,
            discountedPrice: product.discountedPrice,
            originalPrice: product.originalPrice,
            images: Array.isArray(product.images)
              ? (product.images as string[])
              : [],
            expiryDate: product.expiryDate || undefined,
          } as MapMarker;
        })
        .filter((marker) => marker !== null) as MapMarker[];

      return markers;
    } catch (error) {
      logger.error('Error retrieving product markers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get store markers
   */
  private async getStoreMarkers(
    filters?: MapMarkerFilters
  ): Promise<MapMarker[]> {
    try {
      // Build where clause
      const where: any = {
        isActive: true,
        supplier: {
          isVerified: true,
        },
      };

      // Apply bounds filter
      if (filters?.bounds) {
        const { ne_lat, ne_lng, sw_lat, sw_lng } = filters.bounds;
        where.latitude = { gte: sw_lat, lte: ne_lat };
        where.longitude = { gte: sw_lng, lte: ne_lng };
      }

      // Skip stores if category filter is not STORE
      if (filters?.category && filters.category !== 'STORE') {
        return [];
      }

      const stores = await prisma.supplierStore.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        take: 500, // Limit results for performance
      });

      const markers: MapMarker[] = stores.map((store) => ({
        id: store.id,
        type: 'store' as MapMarkerType,
        name: store.name,
        latitude: store.latitude,
        longitude: store.longitude,
        category: 'STORE',
        storeAddress: store.address,
        storeCity: store.city,
        storeCommune: store.commune || undefined,
        deliveryEnabled: store.deliveryEnabled,
        pickupEnabled: store.pickupEnabled,
        images: Array.isArray(store.images) ? (store.images as string[]) : [],
      }));

      return markers;
    } catch (error) {
      logger.error('Error retrieving store markers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get deal markers
   */
  private async getDealMarkers(
    filters?: MapMarkerFilters
  ): Promise<MapMarker[]> {
    try {
      // Build where clause
      const where: any = {
        status: 'ACTIVE',
        store: {
          isActive: true,
        },
      };

      // Apply category filter
      if (filters?.category && filters.category !== 'STORE') {
        where.category = filters.category;
      }

      // Apply bounds filter
      if (filters?.bounds) {
        const { ne_lat, ne_lng, sw_lat, sw_lng } = filters.bounds;
        where.store = {
          ...where.store,
          latitude: { gte: sw_lat, lte: ne_lat },
          longitude: { gte: sw_lng, lte: ne_lng },
        };
      }

      const deals = await prisma.deal.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              address: true,
              city: true,
              commune: true,
            },
          },
        },
        take: 500, // Limit results for performance
      });

      const markers: MapMarker[] = deals
        .filter((deal) => deal.store?.latitude && deal.store?.longitude)
        .map((deal) => ({
          id: deal.id,
          type: 'deal' as MapMarkerType,
          name: deal.title,
          latitude: deal.store!.latitude,
          longitude: deal.store!.longitude,
          category: deal.category,
          dealPrice: deal.dealPrice,
          originalPrice: deal.originalPrice,
          discountPercent: deal.discountPercent || undefined,
          images: Array.isArray(deal.images) ? (deal.images as string[]) : [],
          storeAddress: deal.store?.address,
          storeCity: deal.store?.city,
          storeCommune: deal.store?.commune || undefined,
        }));

      return markers;
    } catch (error) {
      logger.error('Error retrieving deal markers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get association markers (donation opportunities)
   */
  private async getDonationMarkers(
    filters?: MapMarkerFilters
  ): Promise<MapMarker[]> {
    try {
      // Build where clause
      const where: any = {
        verified: true,
      };

      // Apply bounds filter
      if (filters?.bounds) {
        const { ne_lat, ne_lng, sw_lat, sw_lng } = filters.bounds;
        where.latitude = { gte: sw_lat, lte: ne_lat };
        where.longitude = { gte: sw_lng, lte: ne_lng };
      }

      const associations = await prisma.associationProfile.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          latitude: true,
          longitude: true,
          address: true,
          acceptedFoodTypes: true,
          totalDonationsReceived: true,
        },
        take: 500, // Limit results for performance
      });

      const markers: MapMarker[] = associations.map((association) => ({
        id: association.id,
        type: 'donation' as MapMarkerType,
        name: association.name,
        latitude: association.latitude,
        longitude: association.longitude,
        category: 'ASSOCIATION',
        images: association.logo ? [association.logo] : [],
        storeAddress: association.address,
        organizationName: association.name,
      }));

      return markers;
    } catch (error) {
      logger.error('Error retrieving association/donation markers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

const mapService = new MapService();
export default mapService;
