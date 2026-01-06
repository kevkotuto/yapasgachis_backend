import { SupplierStore } from '@prisma/client';

import supplierStoreRepository, {
  SupplierStoreRepository,
} from '@/core/repositories/supplier-store.repository';
import supplierRepository from '@/core/repositories/supplier.repository';
import subscriptionService from '@/core/services/subscription.service';
import geocodingService from '@/infrastructure/geolocation/geocoding.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Supplier Store Service
 * Business logic for supplier stores/branches (multi-location support)
 */
export class SupplierStoreService {
  constructor(private storeRepo: SupplierStoreRepository) {}

  /**
   * Create a new store for a supplier
   */
  async createStore(
    supplierId: string,
    data: {
      name: string;
      description?: string;
      images?: string[];
      address: string;
      city: string;
      commune?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
      phoneNumber?: string;
      email?: string;
      operatingHours: Record<string, { open: string; close: string }>;
      deliveryEnabled?: boolean;
      pickupEnabled?: boolean;
      deliveryRadius?: number;
      acceptCashPayment?: boolean;
      waveAccountId?: string;
    }
  ): Promise<SupplierStore> {
    try {
      // Verify supplier exists
      const supplier = await supplierRepository.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      // Check subscription limits
      const limits = await subscriptionService.checkSupplierLimits(supplierId);
      if (!limits.canAddStore) {
        throw new AppError(
          403,
          `Votre abonnement permet ${limits.maxStores} magasin(s). Passez à un plan supérieur pour en ajouter plus.`,
          'STORE_LIMIT_REACHED'
        );
      }

      // Geocode address if coordinates not provided
      let latitude = data.latitude;
      let longitude = data.longitude;

      if (!latitude || !longitude) {
        const fullAddress = `${data.address}, ${data.commune || ''} ${data.city}`;
        const geocoded = await geocodingService.geocodeAddress(fullAddress);

        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          logger.info('Store address geocoded', {
            supplierId,
            address: fullAddress,
            coordinates: `${latitude},${longitude}`,
          });
        } else {
          throw new AppError(
            400,
            'Impossible de géolocaliser cette adresse. Veuillez vérifier ou fournir les coordonnées.',
            'GEOCODING_FAILED'
          );
        }
      }

      const store = await this.storeRepo.create({
        supplier: { connect: { id: supplierId } },
        name: data.name,
        description: data.description,
        images: data.images || [],
        address: data.address,
        city: data.city,
        commune: data.commune,
        neighborhood: data.neighborhood,
        latitude,
        longitude,
        phoneNumber: data.phoneNumber,
        email: data.email,
        operatingHours: data.operatingHours,
        deliveryEnabled: data.deliveryEnabled || false,
        pickupEnabled: data.pickupEnabled !== false,
        deliveryRadius: data.deliveryRadius,
        acceptCashPayment: data.acceptCashPayment || false,
        waveAccountId: data.waveAccountId,
      });

      logger.info('Store created', {
        supplierId,
        storeId: store.id,
        name: store.name,
        city: store.city,
      });

      return store;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating store', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du magasin');
    }
  }

  /**
   * Update store
   */
  async updateStore(
    supplierId: string,
    storeId: string,
    data: {
      name?: string;
      description?: string;
      images?: string[];
      address?: string;
      city?: string;
      commune?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
      phoneNumber?: string;
      email?: string;
      operatingHours?: Record<string, { open: string; close: string }>;
      deliveryEnabled?: boolean;
      pickupEnabled?: boolean;
      deliveryRadius?: number;
      acceptCashPayment?: boolean;
      waveAccountId?: string;
    }
  ): Promise<SupplierStore> {
    try {
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      if (store.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      // Re-geocode if address changed
      const updateData: any = { ...data };
      if (data.address && data.address !== store.address) {
        const fullAddress = `${data.address}, ${data.commune || store.commune || ''} ${data.city || store.city}`;
        const geocoded = await geocodingService.geocodeAddress(fullAddress);

        if (geocoded) {
          updateData.latitude = geocoded.latitude;
          updateData.longitude = geocoded.longitude;
        }
      }

      const updated = await this.storeRepo.update(storeId, updateData);

      logger.info('Store updated', {
        supplierId,
        storeId,
        changes: Object.keys(data),
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating store', {
        supplierId,
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du magasin');
    }
  }

  /**
   * Delete store
   */
  async deleteStore(supplierId: string, storeId: string): Promise<void> {
    try {
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      if (store.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      // Check if store has active products or deals
      const stats = await this.storeRepo.getStatistics(storeId);
      if (stats.activeProducts > 0 || stats.activeDeals > 0) {
        throw new AppError(
          400,
          "Ce magasin a des produits ou deals actifs. Désactivez-les d'abord.",
          'STORE_HAS_ACTIVE_ITEMS'
        );
      }

      // Check if store has pending orders
      if (stats.totalOrders > 0) {
        // Deactivate instead of delete
        await this.storeRepo.update(storeId, { isActive: false });
        logger.info('Store deactivated (had orders)', { supplierId, storeId });
        return;
      }

      await this.storeRepo.delete(storeId);

      logger.info('Store deleted', {
        supplierId,
        storeId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting store', {
        supplierId,
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du magasin');
    }
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<SupplierStore> {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
    }
    return store;
  }

  /**
   * Get all stores for a supplier
   */
  async getSupplierStores(supplierId: string): Promise<SupplierStore[]> {
    return this.storeRepo.findBySupplierId(supplierId);
  }

  /**
   * Search stores (public)
   */
  async searchStores(params: {
    search?: string;
    city?: string;
    commune?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ stores: SupplierStore[]; total: number; pages: number }> {
    const { stores, total } = await this.storeRepo.search({
      ...params,
      isActive: true,
    });

    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { stores, total, pages };
  }

  /**
   * Get store statistics
   */
  async getStoreStatistics(
    supplierId: string,
    storeId: string
  ): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalDeals: number;
    activeDeals: number;
  }> {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
    }

    if (store.supplierId !== supplierId) {
      throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
    }

    return this.storeRepo.getStatistics(storeId);
  }

  /**
   * Set temporary closure
   */
  async setTemporaryClosure(
    supplierId: string,
    storeId: string,
    isClosed: boolean,
    reason?: string
  ): Promise<SupplierStore> {
    try {
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      if (store.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      const updated = await this.storeRepo.setTemporaryClosure(
        storeId,
        isClosed,
        reason
      );

      logger.info('Store temporary closure updated', {
        supplierId,
        storeId,
        isClosed,
        reason,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error setting store temporary closure', {
        supplierId,
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour');
    }
  }

  /**
   * Toggle store active status
   */
  async toggleStoreActive(
    supplierId: string,
    storeId: string
  ): Promise<SupplierStore> {
    try {
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      if (store.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      const updated = await this.storeRepo.update(storeId, {
        isActive: !store.isActive,
      });

      logger.info('Store active status toggled', {
        supplierId,
        storeId,
        isActive: updated.isActive,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error toggling store active status', {
        supplierId,
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour');
    }
  }

  /**
   * Check if store is currently open based on operating hours
   */
  isStoreOpen(store: SupplierStore): {
    isOpen: boolean;
    opensAt?: string;
    closesAt?: string;
  } {
    if (store.isTemporarilyClosed) {
      return { isOpen: false };
    }

    const now = new Date();
    const dayName = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    const operatingHours = store.operatingHours as Record<
      string,
      { open: string; close: string }
    >;

    const todayHours = operatingHours[dayName];
    if (!todayHours) {
      return { isOpen: false };
    }

    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    const isOpen =
      currentTime >= todayHours.open && currentTime < todayHours.close;

    return {
      isOpen,
      opensAt: todayHours.open,
      closesAt: todayHours.close,
    };
  }

  /**
   * Get nearby stores
   */
  async getNearbyStores(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20
  ): Promise<SupplierStore[]> {
    if (!geocodingService.validateCoordinates(latitude, longitude)) {
      throw new AppError(400, 'Coordonnées invalides', 'INVALID_COORDINATES');
    }

    const { stores } = await this.storeRepo.search({
      latitude,
      longitude,
      radius,
      limit,
      isActive: true,
    });

    return stores;
  }
}

export default new SupplierStoreService(supplierStoreRepository);
