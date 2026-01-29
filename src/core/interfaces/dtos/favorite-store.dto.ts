/**
 * DTOs for Favorite Store
 */

export interface AddFavoriteStoreDTO {
  userId: string;
  supplierStoreId: string;
}

export interface RemoveFavoriteStoreDTO {
  userId: string;
  supplierStoreId: string;
}

export interface GetUserFavoriteStoresDTO {
  userId: string;
  page?: number;
  limit?: number;
}

export interface CheckIsFavoriteDTO {
  userId: string;
  supplierStoreId: string;
}

export interface FavoriteStoreResponseDTO {
  id: string;
  userId: string;
  supplierStoreId: string;
  store?: {
    id: string;
    name: string;
    description?: string;
    address: string;
    city: string;
    commune?: string;
    latitude: number;
    longitude: number;
    images?: any;
    averageRating?: number;
    totalReviews: number;
    isActive: boolean;
  };
  createdAt: Date;
}
