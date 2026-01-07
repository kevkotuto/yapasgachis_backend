import {
  Product,
  ProductStatus,
  ProductCategory,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Product Repository
 * Data access layer for products
 */
export class ProductRepository {
  /**
   * Create a new product
   */
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    try {
      return await prisma.product.create({
        data,
        include: {
          supplier: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating product', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { id },
        include: {
          supplier: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  city: true,
                  commune: true,
                },
              },
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      logger.error('Error finding product by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    try {
      return await prisma.product.update({
        where: { id },
        data,
        include: {
          supplier: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating product', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete product
   */
  async delete(id: string): Promise<Product> {
    try {
      return await prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting product', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(
    id: string,
    quantityChange: number
  ): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) return null;

      const newQuantity = product.quantityAvailable + quantityChange;

      // Automatically update status based on quantity
      let status = product.status;
      if (newQuantity <= 0) {
        status = ProductStatus.SOLD_OUT;
      } else if (status === ProductStatus.SOLD_OUT && newQuantity > 0) {
        status = ProductStatus.ACTIVE;
      }

      return await prisma.product.update({
        where: { id },
        data: {
          quantityAvailable: Math.max(0, newQuantity),
          status,
        },
      });
    } catch (error) {
      logger.error('Error updating product stock', {
        id,
        quantityChange,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search products with filters
   * @param nearbyFirst - Si true avec lat/lng, affiche d'abord les produits proches puis les autres
   */
  async search(params: {
    search?: string;
    category?: ProductCategory;
    status?: ProductStatus;
    supplierId?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // in km (ignored if nearbyFirst is true)
    nearbyFirst?: boolean; // Show nearby products first, then others
    nearbyRadius?: number; // Radius for "nearby" products (default 10km)
    expiresWithin?: number; // hours
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'discount' | 'expiry' | 'createdAt' | 'distance';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ products: Product[]; total: number }> {
    const {
      search,
      category,
      status,
      supplierId,
      minPrice,
      maxPrice,
      city,
      latitude,
      longitude,
      radius = 10,
      nearbyFirst = false,
      nearbyRadius = 10,
      expiresWithin,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: any = {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(category && { category }),
        ...(status && { status }),
        ...(supplierId && { supplierId }),
        ...(minPrice !== undefined && { discountedPrice: { gte: minPrice } }),
        ...(maxPrice !== undefined && { discountedPrice: { lte: maxPrice } }),
        ...(city && {
          supplier: { user: { city: { equals: city, mode: 'insensitive' } } },
        }),
        ...(expiresWithin && {
          expiryDate: {
            lte: new Date(Date.now() + expiresWithin * 60 * 60 * 1000),
            gte: new Date(),
          },
        }),
      };

      // Build orderBy clause
      let orderBy: Prisma.ProductOrderByWithRelationInput = {};
      switch (sortBy) {
        case 'price':
          orderBy = { discountedPrice: sortOrder };
          break;
        case 'discount':
          orderBy = { discountedPrice: sortOrder };
          break;
        case 'expiry':
          orderBy = { expiryDate: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      // If geolocation provided, calculate distances
      let products: Product[];
      let total: number;

      if (latitude && longitude) {
        // Fetch all matching products with supplier and store location
        const allProducts = await prisma.product.findMany({
          where,
          include: {
            supplier: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    city: true,
                    commune: true,
                    latitude: true,
                    longitude: true,
                  },
                },
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
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        });

        // Calculate distance using store coordinates if available, otherwise supplier user coordinates
        const productsWithDistance = allProducts
          .map((product) => {
            // Priorité: coordonnées du store > coordonnées de l'utilisateur du supplier
            let productLat: number | null = null;
            let productLng: number | null = null;

            // D'abord essayer les coordonnées du store
            if (product.store?.latitude && product.store?.longitude) {
              productLat = product.store.latitude;
              productLng = product.store.longitude;
            }
            // Sinon utiliser les coordonnées de l'utilisateur du supplier
            else if (product.supplier?.user?.latitude && product.supplier?.user?.longitude) {
              productLat = product.supplier.user.latitude;
              productLng = product.supplier.user.longitude;
            }

            // Si pas de coordonnées, distance = Infinity (sera affiché en dernier)
            const distance =
              productLat && productLng
                ? this.calculateDistance(latitude, longitude, productLat, productLng)
                : Infinity;

            return { ...product, distance };
          });

        // Mode nearbyFirst: affiche les proches d'abord, puis les autres
        // Mode normal (radius): filtre uniquement les produits dans le rayon
        let sortedProducts: typeof productsWithDistance;

        if (nearbyFirst) {
          // Séparer produits proches et éloignés
          const nearby = productsWithDistance.filter((p) => p.distance <= nearbyRadius);
          const faraway = productsWithDistance.filter((p) => p.distance > nearbyRadius);

          // Trier chaque groupe
          const sortProducts = (arr: typeof productsWithDistance) => {
            return arr.sort((a, b) => {
              if (sortBy === 'distance') {
                return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
              }
              if (sortBy === 'price') {
                return sortOrder === 'asc'
                  ? a.discountedPrice - b.discountedPrice
                  : b.discountedPrice - a.discountedPrice;
              }
              if (sortBy === 'discount') {
                const aDiscount = ((a.originalPrice - a.discountedPrice) / a.originalPrice) * 100;
                const bDiscount = ((b.originalPrice - b.discountedPrice) / b.originalPrice) * 100;
                return sortOrder === 'asc' ? aDiscount - bDiscount : bDiscount - aDiscount;
              }
              // Default: par distance pour les proches
              return a.distance - b.distance;
            });
          };

          // Proches triés par distance, puis éloignés triés par le critère demandé
          sortedProducts = [...sortProducts(nearby), ...sortProducts(faraway)];
          total = sortedProducts.length;
        } else {
          // Mode radius: filtrer uniquement les produits dans le rayon
          sortedProducts = productsWithDistance
            .filter((product) => product.distance <= radius)
            .sort((a, b) => {
              if (sortBy === 'distance') {
                return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
              }
              if (sortBy === 'price') {
                return sortOrder === 'asc'
                  ? a.discountedPrice - b.discountedPrice
                  : b.discountedPrice - a.discountedPrice;
              }
              if (sortBy === 'discount') {
                const aDiscount = ((a.originalPrice - a.discountedPrice) / a.originalPrice) * 100;
                const bDiscount = ((b.originalPrice - b.discountedPrice) / b.originalPrice) * 100;
                return sortOrder === 'asc' ? aDiscount - bDiscount : bDiscount - aDiscount;
              }
              return a.distance - b.distance;
            });
          total = sortedProducts.length;
        }

        products = sortedProducts.slice(skip, skip + limit);
      } else {
        // No geolocation, use standard pagination
        [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            include: {
              supplier: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      phoneNumber: true,
                      city: true,
                      commune: true,
                    },
                  },
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
              reviews: {
                select: {
                  rating: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy,
          }),
          prisma.product.count({ where }),
        ]);
      }

      return { products, total };
    } catch (error) {
      logger.error('Error searching products', {
        params,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Get products expiring soon
   */
  async getExpiringSoon(hours: number = 24): Promise<Product[]> {
    try {
      const expiryDate = new Date(Date.now() + hours * 60 * 60 * 1000);

      return await prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          expiryDate: {
            lte: expiryDate,
            gte: new Date(),
          },
        },
        include: {
          supplier: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { expiryDate: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting expiring products', {
        hours,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get trending products (most ordered in last 7 days)
   */
  async getTrending(limit: number = 10): Promise<Product[]> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get products with order count
      const products = await prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          orderItems: {
            some: {
              order: {
                createdAt: { gte: sevenDaysAgo },
                status: {
                  in: [
                    'PAID',
                    'PREPARING',
                    'READY_FOR_PICKUP',
                    'IN_DELIVERY',
                    'DELIVERED',
                    'COMPLETED',
                  ],
                },
              },
            },
          },
        },
        include: {
          supplier: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  city: true,
                },
              },
            },
          },
          orderItems: {
            where: {
              order: {
                createdAt: { gte: sevenDaysAgo },
              },
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        take: limit * 2, // Get more to sort by order count
      });

      // Sort by order count
      const sorted = products
        .map((product) => ({
          ...product,
          orderCount: product.orderItems.length,
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, limit);

      return sorted;
    } catch (error) {
      logger.error('Error getting trending products', {
        limit,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get products by supplier
   */
  async findBySupplierId(
    supplierId: string,
    filters?: {
      status?: ProductStatus;
      category?: ProductCategory;
      page?: number;
      limit?: number;
    }
  ): Promise<{ products: Product[]; total: number }> {
    const { status, category, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        supplierId,
        ...(status && { status }),
        ...(category && { category }),
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            reviews: {
              select: {
                rating: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      return { products, total };
    } catch (error) {
      logger.error('Error finding products by supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark expired products
   */
  async markExpired(): Promise<number> {
    try {
      const result = await prisma.product.updateMany({
        where: {
          status: ProductStatus.ACTIVE,
          expiryDate: {
            lte: new Date(),
          },
        },
        data: {
          status: ProductStatus.EXPIRED,
        },
      });

      logger.info('Marked expired products', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Error marking expired products', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns distance in kilometers
   */
  private calculateDistance(
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
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new ProductRepository();
