import { PrismaClient, FavoriteStore } from '@prisma/client';
import { AddFavoriteStoreDTO } from '@/core/interfaces/dtos/favorite-store.dto';

export class FavoriteStoreRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Add a store to user's favorites
   */
  async addFavorite(data: AddFavoriteStoreDTO): Promise<FavoriteStore> {
    return this.prisma.favoriteStore.create({
      data: {
        userId: data.userId,
        supplierStoreId: data.supplierStoreId,
      },
    });
  }

  /**
   * Remove a store from user's favorites
   */
  async removeFavorite(userId: string, supplierStoreId: string): Promise<void> {
    await this.prisma.favoriteStore.delete({
      where: {
        userId_supplierStoreId: {
          userId,
          supplierStoreId,
        },
      },
    });
  }

  /**
   * Get all favorite stores for a user
   */
  async getUserFavorites(
    userId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<FavoriteStore[]> {
    return this.prisma.favoriteStore.findMany({
      where: { userId },
      include: {
        supplierStore: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            commune: true,
            latitude: true,
            longitude: true,
            images: true,
            averageRating: true,
            totalReviews: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  /**
   * Count total favorites for a user
   */
  async countUserFavorites(userId: string): Promise<number> {
    return this.prisma.favoriteStore.count({
      where: { userId },
    });
  }

  /**
   * Check if a store is in user's favorites
   */
  async isFavorite(userId: string, supplierStoreId: string): Promise<boolean> {
    const favorite = await this.prisma.favoriteStore.findUnique({
      where: {
        userId_supplierStoreId: {
          userId,
          supplierStoreId,
        },
      },
    });

    return favorite !== null;
  }

  /**
   * Toggle favorite (add if not exists, remove if exists)
   */
  async toggleFavorite(
    userId: string,
    supplierStoreId: string
  ): Promise<{ action: 'added' | 'removed' }> {
    const existing = await this.prisma.favoriteStore.findUnique({
      where: {
        userId_supplierStoreId: {
          userId,
          supplierStoreId,
        },
      },
    });

    if (existing) {
      await this.removeFavorite(userId, supplierStoreId);
      return { action: 'removed' };
    } else {
      await this.addFavorite({ userId, supplierStoreId });
      return { action: 'added' };
    }
  }
}

export default FavoriteStoreRepository;
