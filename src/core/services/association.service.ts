import { AssociationProfile, UserRole } from '@prisma/client';
import associationRepository, {
  AssociationRepository,
} from '@/core/repositories/association.repository';
import userRepository, {
  UserRepository,
} from '@/core/repositories/user.repository';
import geocodingService from '@/infrastructure/geolocation/geocoding.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * Association Service
 * Business logic for association management
 */
export class AssociationService {
  constructor(
    private associationRepo: AssociationRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Register a new association
   */
  async register(
    userId: string,
    data: {
      name: string;
      description: string;
      logo?: string;
      registrationNumber: string;
      legalDocuments?: any;
      address: string;
      serviceArea: string[];
      acceptedFoodTypes: string[];
      collectionSchedule: any;
      collectionPoints?: any;
      mobileMoney?: string;
      bankAccount?: any;
    }
  ): Promise<AssociationProfile> {
    try {
      // Verify user exists and has the right role
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
      }

      if (user.role !== UserRole.ASSOCIATION) {
        throw new AppError(
          403,
          'Seules les associations peuvent créer un profil association',
          'FORBIDDEN'
        );
      }

      // Check if association profile already exists
      const existingProfile = await this.associationRepo.findByUserId(userId);
      if (existingProfile) {
        throw new AppError(
          409,
          'Un profil association existe déjà pour cet utilisateur',
          'PROFILE_EXISTS'
        );
      }

      // Geocode address
      let latitude = 0;
      let longitude = 0;

      if (data.address) {
        const geocoded = await geocodingService.geocodeAddress(data.address);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          logger.info('Address geocoded for association', {
            userId,
            coordinates: `${latitude},${longitude}`,
          });
        } else {
          throw new AppError(
            400,
            'Impossible de géolocaliser cette adresse',
            'GEOCODING_FAILED'
          );
        }
      }

      // Create association profile
      const profile = await this.associationRepo.create(userId, {
        name: data.name,
        description: data.description,
        logo: data.logo,
        registrationNumber: data.registrationNumber,
        legalDocuments: data.legalDocuments,
        address: data.address,
        latitude,
        longitude,
        serviceArea: data.serviceArea,
        acceptedFoodTypes: data.acceptedFoodTypes,
        collectionSchedule: data.collectionSchedule,
        collectionPoints: data.collectionPoints,
        mobileMoney: data.mobileMoney,
        bankAccount: data.bankAccount,
      });

      logger.info('Association profile created', {
        userId,
        profileId: profile.id,
        name: profile.name,
      });

      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating association profile', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de la création du profil association");
    }
  }

  /**
   * Get association profile by user ID
   */
  async getProfile(userId: string): Promise<AssociationProfile> {
    const profile = await this.associationRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil association non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return profile;
  }

  /**
   * Get association profile by ID (public)
   */
  async getById(id: string): Promise<AssociationProfile> {
    const profile = await this.associationRepo.findById(id);

    if (!profile) {
      throw new AppError(
        404,
        'Association non trouvée',
        'ASSOCIATION_NOT_FOUND'
      );
    }

    return profile;
  }

  /**
   * Update association profile
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      description?: string;
      logo?: string;
      address?: string;
      serviceArea?: string[];
      acceptedFoodTypes?: string[];
      collectionSchedule?: any;
      collectionPoints?: any;
      mobileMoney?: string;
      bankAccount?: any;
    }
  ): Promise<AssociationProfile> {
    try {
      const profile = await this.associationRepo.findByUserId(userId);

      if (!profile) {
        throw new AppError(
          404,
          'Profil association non trouvé',
          'PROFILE_NOT_FOUND'
        );
      }

      // Update geocoding if address changed
      let latitude = profile.latitude;
      let longitude = profile.longitude;

      if (data.address && data.address !== profile.address) {
        const geocoded = await geocodingService.geocodeAddress(data.address);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      }

      const updated = await this.associationRepo.update(profile.id, {
        ...data,
        latitude,
        longitude,
      });

      logger.info('Association profile updated', {
        userId,
        profileId: profile.id,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating association profile', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du profil');
    }
  }

  /**
   * Search associations
   */
  async search(params: {
    search?: string;
    verified?: boolean;
    acceptedFoodType?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ associations: AssociationProfile[]; total: number; pages: number }> {
    const { associations, total } = await this.associationRepo.search(params);
    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { associations, total, pages };
  }

  /**
   * Get all verified associations
   */
  async getAllVerified(): Promise<AssociationProfile[]> {
    return this.associationRepo.findAllVerified();
  }

  /**
   * Get nearby associations
   */
  async getNearby(
    latitude: number,
    longitude: number,
    radius: number = 20,
    limit: number = 20
  ): Promise<AssociationProfile[]> {
    if (!geocodingService.validateCoordinates(latitude, longitude)) {
      throw new AppError(400, 'Coordonnées invalides', 'INVALID_COORDINATES');
    }

    const { associations } = await this.associationRepo.search({
      latitude,
      longitude,
      radius,
      limit,
      verified: true,
    });

    return associations;
  }

  /**
   * Create association report
   */
  async createReport(
    userId: string,
    data: {
      title: string;
      description: string;
      images?: string[];
      donationsUsed?: string[];
      beneficiaries?: number;
      impactMetrics?: any;
    }
  ) {
    try {
      const profile = await this.associationRepo.findByUserId(userId);

      if (!profile) {
        throw new AppError(
          404,
          'Profil association non trouvé',
          'PROFILE_NOT_FOUND'
        );
      }

      const report = await this.associationRepo.createReport(profile.id, data);

      logger.info('Association report created', {
        userId,
        reportId: report.id,
        title: data.title,
      });

      return report;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating association report', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du rapport');
    }
  }

  /**
   * Get association reports
   */
  async getReports(associationId: string, page = 1, limit = 10) {
    const association = await this.associationRepo.findById(associationId);

    if (!association) {
      throw new AppError(
        404,
        'Association non trouvée',
        'ASSOCIATION_NOT_FOUND'
      );
    }

    return this.associationRepo.getReports(associationId, page, limit);
  }

  /**
   * Get my reports (for association user)
   */
  async getMyReports(userId: string, page = 1, limit = 10) {
    const profile = await this.associationRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil association non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return this.associationRepo.getReports(profile.id, page, limit);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get pending verification associations (admin)
   */
  async getPendingVerification(): Promise<AssociationProfile[]> {
    return this.associationRepo.findPendingVerification();
  }

  /**
   * Verify an association (admin)
   */
  async verify(adminId: string, associationId: string): Promise<AssociationProfile> {
    try {
      const association = await this.associationRepo.findById(associationId);

      if (!association) {
        throw new AppError(
          404,
          'Association non trouvée',
          'ASSOCIATION_NOT_FOUND'
        );
      }

      if (association.verified) {
        throw new AppError(
          400,
          'Association déjà vérifiée',
          'ALREADY_VERIFIED'
        );
      }

      const verified = await this.associationRepo.verify(associationId);

      // Update user status
      await prisma.user.update({
        where: { id: association.userId },
        data: { kycVerified: true },
      });

      logger.info('Association verified', {
        adminId,
        associationId,
        name: association.name,
      });

      return verified;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error verifying association', {
        adminId,
        associationId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de la vérification de l'association");
    }
  }

  /**
   * Reject association verification (admin)
   */
  async reject(
    adminId: string,
    associationId: string,
    reason: string
  ): Promise<AssociationProfile> {
    try {
      const association = await this.associationRepo.findById(associationId);

      if (!association) {
        throw new AppError(
          404,
          'Association non trouvée',
          'ASSOCIATION_NOT_FOUND'
        );
      }

      // For now, we just log the rejection - could add a rejection reason field
      logger.warn('Association verification rejected', {
        adminId,
        associationId,
        name: association.name,
        reason,
      });

      // Delete the association profile
      await this.associationRepo.delete(associationId);

      return association;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error rejecting association', {
        adminId,
        associationId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors du rejet de l'association");
    }
  }

  /**
   * Get all associations (admin)
   */
  async getAll(params: {
    search?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ associations: AssociationProfile[]; total: number; pages: number }> {
    const { associations, total } = await this.associationRepo.search(params);
    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { associations, total, pages };
  }

  /**
   * Get association statistics (admin dashboard)
   */
  async getGlobalStats(): Promise<{
    totalAssociations: number;
    verifiedAssociations: number;
    pendingAssociations: number;
    totalDonationsDistributed: number;
    totalValueDistributed: number;
  }> {
    try {
      const [total, verified, pending, donations] = await Promise.all([
        prisma.associationProfile.count(),
        prisma.associationProfile.count({ where: { verified: true } }),
        prisma.associationProfile.count({ where: { verified: false } }),
        prisma.associationProfile.aggregate({
          _sum: {
            totalDonationsReceived: true,
            totalValueReceived: true,
          },
        }),
      ]);

      return {
        totalAssociations: total,
        verifiedAssociations: verified,
        pendingAssociations: pending,
        totalDonationsDistributed: donations._sum.totalDonationsReceived || 0,
        totalValueDistributed: donations._sum.totalValueReceived || 0,
      };
    } catch (error) {
      logger.error('Error getting global association stats', {
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la récupération des statistiques');
    }
  }
}

export default new AssociationService(associationRepository, userRepository);
