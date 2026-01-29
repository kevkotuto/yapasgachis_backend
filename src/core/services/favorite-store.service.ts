import { PrismaClient } from '@prisma/client';
import FavoriteStoreRepository from '@/core/repositories/favorite-store.repository';
import {
  AddFavoriteStoreDTO,
  RemoveFavoriteStoreDTO,
  GetUserFavoriteStoresDTO,
  CheckIsFavoriteDTO,
  FavoriteStoreResponseDTO,
} from '@/core/interfaces/dtos/favorite-store.dto';
import { AppError } from '@/middleware/error-handler.middleware';

export class FavoriteStoreService {
  private repository: FavoriteStoreRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new FavoriteStoreRepository(prisma);
  }

  /**
   * Add a store to favorites
   */
  async addFavorite(
    data: AddFavoriteStoreDTO
  ): Promise<FavoriteStoreResponseDTO> {
    // Verify store exists
    const store = await this.prisma.supplierStore.findUnique({
      where: { id: data.supplierStoreId },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    if (!store.isActive) {
      throw new AppError(400, "Ce magasin n'est pas actif");
    }

    try {
      const favorite = await this.repository.addFavorite(data);

      return {
        id: favorite.id,
        userId: favorite.userId,
        supplierStoreId: favorite.supplierStoreId,
        createdAt: favorite.createdAt,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError(409, 'Ce magasin est déjà dans vos favoris');
      }
      throw error;
    }
  }

  /**
   * Remove a store from favorites
   */
  async removeFavorite(data: RemoveFavoriteStoreDTO): Promise<{
    success: boolean;
  }> {
    try {
      await this.repository.removeFavorite(data.userId, data.supplierStoreId);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError(404, "Ce magasin n'est pas dans vos favoris");
      }
      throw error;
    }
  }

  /**
   * Get user's favorite stores
   */
  async getUserFavorites(data: GetUserFavoriteStoresDTO): Promise<{
    favorites: FavoriteStoreResponseDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = data.page || 1;
    const limit = data.limit || 20;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      this.repository.getUserFavorites(data.userId, skip, limit),
      this.repository.countUserFavorites(data.userId),
    ]);

    const favoritesDTO: FavoriteStoreResponseDTO[] = favorites.map((fav) => ({
      id: fav.id,
      userId: fav.userId,
      supplierStoreId: fav.supplierStoreId,
      store: (fav as any).supplierStore
        ? {
            id: (fav as any).supplierStore.id,
            name: (fav as any).supplierStore.name,
            description: (fav as any).supplierStore.description,
            address: (fav as any).supplierStore.address,
            city: (fav as any).supplierStore.city,
            commune: (fav as any).supplierStore.commune,
            latitude: (fav as any).supplierStore.latitude,
            longitude: (fav as any).supplierStore.longitude,
            images: (fav as any).supplierStore.images,
            averageRating: (fav as any).supplierStore.averageRating,
            totalReviews: (fav as any).supplierStore.totalReviews,
            isActive: (fav as any).supplierStore.isActive,
          }
        : undefined,
      createdAt: fav.createdAt,
    }));

    return {
      favorites: favoritesDTO,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if a store is in user's favorites
   */
  async checkIsFavorite(data: CheckIsFavoriteDTO): Promise<{
    isFavorite: boolean;
  }> {
    const isFavorite = await this.repository.isFavorite(
      data.userId,
      data.supplierStoreId
    );

    return { isFavorite };
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(
    userId: string,
    supplierStoreId: string
  ): Promise<{
    action: 'added' | 'removed';
    isFavorite: boolean;
  }> {
    // Verify store exists
    const store = await this.prisma.supplierStore.findUnique({
      where: { id: supplierStoreId },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    const result = await this.repository.toggleFavorite(
      userId,
      supplierStoreId
    );

    return {
      action: result.action,
      isFavorite: result.action === 'added',
    };
  }
}

export default FavoriteStoreService;
