import { PrismaClient } from '@prisma/client';
import {
  GlobalSearchDTO,
  GlobalSearchResultDTO,
} from '@/core/interfaces/dtos/search-history.dto';

export class GlobalSearchService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Normalise une chaîne en enlevant les accents pour la recherche
   */
  private normalizeString(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Search globally across products, deals, and donations
   */
  async searchAll(data: GlobalSearchDTO): Promise<GlobalSearchResultDTO> {
    const {
      query,
      types = ['product', 'deal', 'donation'],
      categories,
      latitude,
      longitude,
      radius,
      limit = 20,
    } = data;

    const results: GlobalSearchResultDTO = {
      products: [],
      deals: [],
      donations: [],
      total: 0,
    };

    const limitPerType = Math.ceil(limit / types.length);

    // Normaliser la requête pour recherche insensible aux accents
    const normalizedQuery = this.normalizeString(query);

    // Search Products
    if (types.includes('product')) {
      // Utiliser une requête SQL brute pour normaliser les accents
      // On utilise translate() pour remplacer les caractères accentués
      let productQuery = `
        SELECT p.*,
          s."businessName" as "supplierBusinessName",
          s."logo" as "supplierLogo",
          st."id" as "storeId",
          st."name" as "storeName",
          st."address" as "storeAddress",
          st."city" as "storeCity",
          st."commune" as "storeCommune",
          st."latitude" as "storeLatitude",
          st."longitude" as "storeLongitude"
        FROM "products" p
        LEFT JOIN "supplier_profiles" s ON p."supplierId" = s."id"
        LEFT JOIN "supplier_stores" st ON p."storeId" = st."id"
        WHERE p."status" = 'ACTIVE'
        AND (
          translate(lower(p."title"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
          OR translate(lower(p."description"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
        )
      `;

      const params: any[] = [`%${normalizedQuery.toLowerCase()}%`];

      if (categories && categories.length > 0) {
        productQuery += ` AND p."category" = ANY($${params.length + 1})`;
        params.push(categories);
      }

      if (latitude && longitude && radius) {
        const latDelta = radius / 111;
        const lngDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));
        productQuery += ` AND st."latitude" BETWEEN $${params.length + 1} AND $${params.length + 2}`;
        productQuery += ` AND st."longitude" BETWEEN $${params.length + 3} AND $${params.length + 4}`;
        params.push(
          latitude - latDelta,
          latitude + latDelta,
          longitude - lngDelta,
          longitude + lngDelta
        );
      }

      productQuery += ` ORDER BY p."createdAt" DESC LIMIT $${params.length + 1}`;
      params.push(limitPerType);

      const productsRaw: any[] = await this.prisma.$queryRawUnsafe(
        productQuery,
        ...params
      );

      // Transformer les résultats pour correspondre à la structure attendue
      const products = productsRaw.map((p: any) => ({
        ...p,
        supplier: {
          businessName: p.supplierBusinessName,
          logo: p.supplierLogo,
        },
        store: p.storeId
          ? {
              id: p.storeId,
              name: p.storeName,
              address: p.storeAddress,
              city: p.storeCity,
              commune: p.storeCommune,
              latitude: p.storeLatitude,
              longitude: p.storeLongitude,
            }
          : null,
      }));

      // Calculate distance if coordinates provided
      if (latitude && longitude) {
        results.products = products.map((p: any) => {
          if (p.store?.latitude && p.store?.longitude) {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              p.store.latitude,
              p.store.longitude
            );
            return { ...p, distance };
          }
          return p;
        });
      } else {
        results.products = products;
      }
    }

    // Search Deals
    if (types.includes('deal')) {
      let dealQuery = `
        SELECT d.*,
          s."businessName" as "supplierBusinessName",
          s."logo" as "supplierLogo",
          st."id" as "storeId",
          st."name" as "storeName",
          st."address" as "storeAddress",
          st."city" as "storeCity",
          st."commune" as "storeCommune",
          st."latitude" as "storeLatitude",
          st."longitude" as "storeLongitude"
        FROM "deals" d
        LEFT JOIN "supplier_profiles" s ON d."supplierId" = s."id"
        LEFT JOIN "supplier_stores" st ON d."storeId" = st."id"
        WHERE d."status" = 'ACTIVE'
        AND (
          translate(lower(d."title"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
          OR translate(lower(d."description"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
        )
      `;

      const params: any[] = [`%${normalizedQuery.toLowerCase()}%`];

      if (categories && categories.length > 0) {
        dealQuery += ` AND d."category" = ANY($${params.length + 1})`;
        params.push(categories);
      }

      if (latitude && longitude && radius) {
        const latDelta = radius / 111;
        const lngDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));
        dealQuery += ` AND st."latitude" BETWEEN $${params.length + 1} AND $${params.length + 2}`;
        dealQuery += ` AND st."longitude" BETWEEN $${params.length + 3} AND $${params.length + 4}`;
        params.push(
          latitude - latDelta,
          latitude + latDelta,
          longitude - lngDelta,
          longitude + lngDelta
        );
      }

      dealQuery += ` ORDER BY d."createdAt" DESC LIMIT $${params.length + 1}`;
      params.push(limitPerType);

      const dealsRaw: any[] = await this.prisma.$queryRawUnsafe(
        dealQuery,
        ...params
      );

      const deals = dealsRaw.map((d: any) => ({
        ...d,
        supplier: {
          businessName: d.supplierBusinessName,
          logo: d.supplierLogo,
        },
        store: d.storeId
          ? {
              id: d.storeId,
              name: d.storeName,
              address: d.storeAddress,
              city: d.storeCity,
              commune: d.storeCommune,
              latitude: d.storeLatitude,
              longitude: d.storeLongitude,
            }
          : null,
      }));

      // Calculate distance if coordinates provided
      if (latitude && longitude) {
        results.deals = deals.map((d: any) => {
          if (d.store?.latitude && d.store?.longitude) {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              d.store.latitude,
              d.store.longitude
            );
            return { ...d, distance };
          }
          return d;
        });
      } else {
        results.deals = deals;
      }
    }

    // Search Associations (donation opportunities)
    if (types.includes('donation')) {
      let associationQuery = `
        SELECT a.*
        FROM "association_profiles" a
        WHERE a."verified" = true
        AND (
          translate(lower(a."name"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
          OR translate(lower(a."description"), 'àâäéèêëïîôùûüÿæœç', 'aaaeeeeiioouuyaoc') LIKE $1
        )
      `;

      const params: any[] = [`%${normalizedQuery.toLowerCase()}%`];

      // Apply location filter to associations
      if (latitude && longitude && radius) {
        const latDelta = radius / 111;
        const lngDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));
        associationQuery += ` AND a."latitude" BETWEEN $${params.length + 1} AND $${params.length + 2}`;
        associationQuery += ` AND a."longitude" BETWEEN $${params.length + 3} AND $${params.length + 4}`;
        params.push(
          latitude - latDelta,
          latitude + latDelta,
          longitude - lngDelta,
          longitude + lngDelta
        );
      }

      associationQuery += ` ORDER BY a."totalDonationsReceived" DESC LIMIT $${params.length + 1}`;
      params.push(limitPerType);

      const associations: any[] = await this.prisma.$queryRawUnsafe(
        associationQuery,
        ...params
      );

      // Calculate distance if coordinates provided
      if (latitude && longitude) {
        results.donations = associations.map((a: any) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            a.latitude,
            a.longitude
          );
          return { ...a, distance };
        });
      } else {
        results.donations = associations;
      }
    }

    results.total =
      results.products.length + results.deals.length + results.donations.length;

    return results;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimals
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default GlobalSearchService;
