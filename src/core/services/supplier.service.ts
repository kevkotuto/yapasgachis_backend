import {
  SupplierProfile,
  SubscriptionTier,
  SupplierType,
  UserRole,
} from '@prisma/client';

import supplierRepository, {
  SupplierRepository,
} from '@/core/repositories/supplier.repository';
import UserRepository from '@/core/repositories/user.repository';
import geocodingService from '@/infrastructure/geolocation/geocoding.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Supplier Service
 * Business logic for supplier management
 */
export class SupplierService {
  constructor(
    private supplierRepo: SupplierRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Create supplier profile
   */
  async createProfile(
    userId: string,
    data: {
      businessName: string;
      type: SupplierType;
      description?: string;
      address?: string;
      city?: string;
      phoneNumber?: string;
      email?: string;
      registrationNumber?: string;
      taxId?: string;
      bankAccountNumber?: string;
      subscriptionTier?: SubscriptionTier;
    }
  ): Promise<SupplierProfile> {
    try {
      // Verify user exists and is a supplier
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
      }

      if (
        user.role !== UserRole.SUPPLIER_FOOD &&
        user.role !== UserRole.SUPPLIER_DEALS
      ) {
        throw new AppError(
          403,
          'Seuls les fournisseurs peuvent créer un profil fournisseur',
          'FORBIDDEN'
        );
      }

      // Check if supplier profile already exists
      const existingProfile = await this.supplierRepo.findByUserId(userId);
      if (existingProfile) {
        throw new AppError(
          409,
          'Un profil fournisseur existe déjà pour cet utilisateur',
          'PROFILE_EXISTS'
        );
      }

      // Geocode address if provided
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (data.address) {
        const fullAddress = `${data.address}, ${data.city || user.city || ''}`;
        const geocoded = await geocodingService.geocodeAddress(fullAddress);

        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          logger.info('Address geocoded for supplier', {
            userId,
            coordinates: `${latitude},${longitude}`,
          });
        }
      }

      // Create supplier profile
      // Note: phoneNumber, email are on User, not SupplierProfile
      // registrationNumber -> rccm, taxId -> niu in Prisma schema
      const profile = await this.supplierRepo.create(userId, {
        businessName: data.businessName,
        supplierType: data.type,
        description: data.description,
        address: data.address,
        rccm: data.registrationNumber,
        niu: data.taxId,
        subscriptionTier: data.subscriptionTier || SubscriptionTier.BASIC,
        latitude,
        longitude,
        user: { connect: { id: userId } },
      });

      logger.info('Supplier profile created', {
        userId,
        profileId: profile.id,
        businessName: profile.businessName,
      });

      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating supplier profile', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la création du profil fournisseur'
      );
    }
  }

  /**
   * Get supplier profile
   */
  async getProfile(userId: string): Promise<SupplierProfile> {
    const profile = await this.supplierRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil fournisseur non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return profile;
  }

  /**
   * Get supplier profile by ID
   */
  async getProfileById(id: string): Promise<SupplierProfile> {
    const profile = await this.supplierRepo.findById(id);

    if (!profile) {
      throw new AppError(
        404,
        'Profil fournisseur non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return profile;
  }

  /**
   * Update supplier profile
   */
  async updateProfile(
    userId: string,
    data: {
      businessName?: string;
      type?: SupplierType;
      description?: string;
      address?: string;
      city?: string;
      phoneNumber?: string;
      email?: string;
      registrationNumber?: string;
      taxId?: string;
      bankAccountNumber?: string;
      logoUrl?: string;
      bannerUrl?: string;
    }
  ): Promise<SupplierProfile> {
    try {
      const profile = await this.supplierRepo.findByUserId(userId);

      if (!profile) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'PROFILE_NOT_FOUND'
        );
      }

      // Update geocoding if address changed
      let latitude = profile.latitude;
      let longitude = profile.longitude;

      if (data.address && data.address !== profile.address) {
        const fullAddress = `${data.address}, ${data.city || ''}`;
        const geocoded = await geocodingService.geocodeAddress(fullAddress);

        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      }

      const updated = await this.supplierRepo.update(profile.id, {
        ...data,
        latitude,
        longitude,
      });

      logger.info('Supplier profile updated', {
        userId,
        profileId: profile.id,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating supplier profile', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du profil');
    }
  }

  /**
   * Search suppliers
   */
  async searchSuppliers(params: {
    search?: string;
    type?: SupplierType;
    subscriptionTier?: SubscriptionTier;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ suppliers: SupplierProfile[]; total: number; pages: number }> {
    const { suppliers, total } = await this.supplierRepo.search(params);
    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { suppliers, total, pages };
  }

  /**
   * Get supplier statistics
   */
  async getStatistics(userId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    avgRating: number;
    totalReviews: number;
  }> {
    return this.supplierRepo.getStatistics(userId);
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    userId: string,
    tier: SubscriptionTier,
    durationMonths: number = 1
  ): Promise<SupplierProfile> {
    try {
      const profile = await this.supplierRepo.findByUserId(userId);

      if (!profile) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'PROFILE_NOT_FOUND'
        );
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      const updated = await this.supplierRepo.updateSubscription(
        profile.id,
        tier,
        expiresAt
      );

      logger.info('Supplier subscription updated', {
        userId,
        tier,
        expiresAt: expiresAt.toISOString(),
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating subscription', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de la mise à jour de l'abonnement");
    }
  }

  /**
   * Get nearby suppliers
   */
  async getNearbySuppliers(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20
  ): Promise<SupplierProfile[]> {
    if (!geocodingService.validateCoordinates(latitude, longitude)) {
      throw new AppError(400, 'Coordonnées invalides', 'INVALID_COORDINATES');
    }

    const { suppliers } = await this.supplierRepo.search({
      latitude,
      longitude,
      radius,
      limit,
    });

    return suppliers;
  }

  /**
   * Delete supplier profile (soft delete - mark as inactive)
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const profile = await this.supplierRepo.findByUserId(userId);

      if (!profile) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'PROFILE_NOT_FOUND'
        );
      }

      // Check if supplier has active orders
      // TODO: Implement check once Order service is ready
      // For now, just delete the profile

      await this.supplierRepo.delete(profile.id);

      logger.info('Supplier profile deleted', {
        userId,
        profileId: profile.id,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting supplier profile', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du profil');
    }
  }

  /**
   * Verify if user can create products (based on subscription)
   */
  async canCreateProducts(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    maxProducts?: number;
    currentProducts?: number;
  }> {
    const profile = await this.supplierRepo.findByUserId(userId);

    if (!profile) {
      return {
        allowed: false,
        reason: 'Profil fournisseur non trouvé',
      };
    }

    // Check subscription status
    if (
      profile.subscriptionEndDate &&
      profile.subscriptionEndDate < new Date()
    ) {
      return {
        allowed: false,
        reason: 'Abonnement expiré',
      };
    }

    // Get product limits based on subscription tier
    const limits: Record<SubscriptionTier, number> = {
      BASIC: 20,
      PRO: 50,
      PREMIUM: 100,
    };

    const maxProducts = limits[profile.subscriptionTier];
    const stats = await this.supplierRepo.getStatistics(userId);
    const currentProducts = stats.totalProducts;

    const allowed = currentProducts < maxProducts;

    return {
      allowed,
      reason: allowed ? undefined : 'Limite de produits atteinte',
      maxProducts: maxProducts === Infinity ? undefined : maxProducts,
      currentProducts,
    };
  }
}

export default new SupplierService(supplierRepository, new UserRepository());
