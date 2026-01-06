import {
  Donation,
  DonationType,
  DonationStatus,
  UserRole,
  ProductStatus,
} from '@prisma/client';
import donationRepository, {
  DonationRepository,
} from '@/core/repositories/donation.repository';
import associationRepository, {
  AssociationRepository,
} from '@/core/repositories/association.repository';
import userRepository, {
  UserRepository,
} from '@/core/repositories/user.repository';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { prisma } from '@/infrastructure/database/prisma';
import eventService, { AppEvent } from '@/core/services/event.service';

/**
 * Donation Service
 * Business logic for donations (food and financial)
 */
export class DonationService {
  constructor(
    private donationRepo: DonationRepository,
    private associationRepo: AssociationRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Create a food donation
   */
  async createFoodDonation(
    donorId: string,
    data: {
      associationId: string;
      productId: string;
      quantity: number;
      unit: string;
      pickupScheduled?: Date;
    }
  ): Promise<Donation> {
    try {
      // Verify donor exists
      const donor = await this.userRepo.findById(donorId);
      if (!donor) {
        throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
      }

      // Verify association exists and is verified
      const association = await this.associationRepo.findById(data.associationId);
      if (!association) {
        throw new AppError(404, 'Association non trouvée', 'ASSOCIATION_NOT_FOUND');
      }
      if (!association.verified) {
        throw new AppError(
          400,
          "Cette association n'est pas encore vérifiée",
          'ASSOCIATION_NOT_VERIFIED'
        );
      }

      // Verify product exists and is available
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        include: {
          supplier: true,
        },
      });

      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      // Check if donor is the supplier of the product
      const supplierProfile = await prisma.supplierProfile.findUnique({
        where: { userId: donorId },
      });

      if (!supplierProfile || supplierProfile.id !== product.supplierId) {
        throw new AppError(
          403,
          'Vous ne pouvez donner que vos propres produits',
          'NOT_YOUR_PRODUCT'
        );
      }

      // Check if product has enough quantity
      if (product.quantityAvailable < data.quantity) {
        throw new AppError(
          400,
          'Quantité insuffisante pour ce produit',
          'INSUFFICIENT_QUANTITY'
        );
      }

      // Create donation
      const donation = await this.donationRepo.create({
        donorId,
        associationId: data.associationId,
        type: DonationType.FOOD,
        productId: data.productId,
        quantity: data.quantity,
        unit: data.unit,
        pickupScheduled: data.pickupScheduled,
      });

      // Update product quantity
      await prisma.product.update({
        where: { id: data.productId },
        data: {
          quantityAvailable: { decrement: data.quantity },
          status:
            product.quantityAvailable - data.quantity <= 0
              ? ProductStatus.SOLD_OUT
              : product.status,
        },
      });

      // Grant donor badge if first donation
      const donorStats = await this.donationRepo.getDonorStats(donorId);
      if (donorStats.totalDonations === 1) {
        await prisma.user.update({
          where: { id: donorId },
          data: { donorBadge: true },
        });
      }

      // Emit event for notifications
      eventService.emit(AppEvent.DONATION_CREATED, {
        donationId: donation.id,
        donorId,
        associationId: data.associationId,
        type: DonationType.FOOD,
      });

      logger.info('Food donation created', {
        donationId: donation.id,
        donorId,
        associationId: data.associationId,
        productId: data.productId,
        quantity: data.quantity,
      });

      return donation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating food donation', {
        donorId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du don');
    }
  }

  /**
   * Create a financial donation
   */
  async createFinancialDonation(
    donorId: string,
    data: {
      associationId: string;
      amount: number;
      currency?: string;
      paymentReference?: string;
    }
  ): Promise<Donation> {
    try {
      // Verify donor exists
      const donor = await this.userRepo.findById(donorId);
      if (!donor) {
        throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
      }

      // Verify association exists and is verified
      const association = await this.associationRepo.findById(data.associationId);
      if (!association) {
        throw new AppError(404, 'Association non trouvée', 'ASSOCIATION_NOT_FOUND');
      }
      if (!association.verified) {
        throw new AppError(
          400,
          "Cette association n'est pas encore vérifiée",
          'ASSOCIATION_NOT_VERIFIED'
        );
      }

      // Validate amount
      if (data.amount <= 0) {
        throw new AppError(400, 'Le montant doit être positif', 'INVALID_AMOUNT');
      }

      // Create donation
      const donation = await this.donationRepo.create({
        donorId,
        associationId: data.associationId,
        type: DonationType.FINANCIAL,
        amount: data.amount,
        currency: data.currency || 'XOF',
        paymentReference: data.paymentReference,
      });

      // Grant donor badge if first donation
      const donorStats = await this.donationRepo.getDonorStats(donorId);
      if (donorStats.totalDonations === 1) {
        await prisma.user.update({
          where: { id: donorId },
          data: { donorBadge: true },
        });
      }

      // Emit event for notifications
      eventService.emit(AppEvent.DONATION_CREATED, {
        donationId: donation.id,
        donorId,
        associationId: data.associationId,
        type: DonationType.FINANCIAL,
        amount: data.amount,
      });

      logger.info('Financial donation created', {
        donationId: donation.id,
        donorId,
        associationId: data.associationId,
        amount: data.amount,
        currency: data.currency,
      });

      return donation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating financial donation', {
        donorId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du don');
    }
  }

  /**
   * Get donation by ID
   */
  async getById(id: string): Promise<Donation> {
    const donation = await this.donationRepo.findById(id);

    if (!donation) {
      throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
    }

    return donation;
  }

  /**
   * Update donation status
   */
  async updateStatus(
    userId: string,
    donationId: string,
    status: DonationStatus
  ): Promise<Donation> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      // Verify user is authorized (donor or association)
      const associationProfile = await this.associationRepo.findByUserId(userId);
      const isAssociation = associationProfile?.id === donation.associationId;
      const isDonor = donation.donorId === userId;

      if (!isAssociation && !isDonor) {
        throw new AppError(
          403,
          "Vous n'êtes pas autorisé à modifier ce don",
          'FORBIDDEN'
        );
      }

      // Validate status transitions
      const validTransitions: Record<DonationStatus, DonationStatus[]> = {
        [DonationStatus.PENDING]: [
          DonationStatus.SCHEDULED,
          DonationStatus.CANCELLED,
        ],
        [DonationStatus.SCHEDULED]: [
          DonationStatus.COLLECTED,
          DonationStatus.CANCELLED,
        ],
        [DonationStatus.COLLECTED]: [DonationStatus.DISTRIBUTED],
        [DonationStatus.DISTRIBUTED]: [DonationStatus.COMPLETED],
        [DonationStatus.COMPLETED]: [],
        [DonationStatus.CANCELLED]: [],
      };

      if (!validTransitions[donation.status].includes(status)) {
        throw new AppError(
          400,
          `Transition de statut invalide: ${donation.status} -> ${status}`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      const updated = await this.donationRepo.updateStatus(donationId, status);

      // Update association stats when donation is completed
      if (status === DonationStatus.COMPLETED) {
        const value =
          donation.type === DonationType.FINANCIAL
            ? donation.amount || 0
            : (donation.quantity || 0) * 100; // Estimate value for food

        await this.associationRepo.updateStats(donation.associationId, 1, value);
      }

      // Emit event
      eventService.emit(AppEvent.DONATION_STATUS_UPDATED, {
        donationId,
        oldStatus: donation.status,
        newStatus: status,
        donorId: donation.donorId,
        associationId: donation.associationId,
      });

      logger.info('Donation status updated', {
        donationId,
        oldStatus: donation.status,
        newStatus: status,
        updatedBy: userId,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating donation status', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du don');
    }
  }

  /**
   * Schedule pickup for food donation
   */
  async schedulePickup(
    userId: string,
    donationId: string,
    pickupDate: Date
  ): Promise<Donation> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      if (donation.type !== DonationType.FOOD) {
        throw new AppError(
          400,
          'Seuls les dons alimentaires peuvent avoir une date de collecte',
          'NOT_FOOD_DONATION'
        );
      }

      // Verify user is the association
      const associationProfile = await this.associationRepo.findByUserId(userId);
      if (!associationProfile || associationProfile.id !== donation.associationId) {
        throw new AppError(
          403,
          "Seule l'association destinataire peut programmer la collecte",
          'FORBIDDEN'
        );
      }

      // Validate pickup date (must be in the future)
      if (pickupDate < new Date()) {
        throw new AppError(
          400,
          'La date de collecte doit être dans le futur',
          'INVALID_DATE'
        );
      }

      const updated = await this.donationRepo.update(donationId, {
        pickupScheduled: pickupDate,
        status: DonationStatus.SCHEDULED,
      });

      // Notify donor
      eventService.emit(AppEvent.DONATION_PICKUP_SCHEDULED, {
        donationId,
        donorId: donation.donorId,
        associationId: donation.associationId,
        pickupDate,
      });

      logger.info('Donation pickup scheduled', {
        donationId,
        pickupDate: pickupDate.toISOString(),
        scheduledBy: userId,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error scheduling donation pickup', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la programmation de la collecte');
    }
  }

  /**
   * Confirm donation pickup (association marks as collected)
   */
  async confirmPickup(userId: string, donationId: string): Promise<Donation> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      // Verify user is the association
      const associationProfile = await this.associationRepo.findByUserId(userId);
      if (!associationProfile || associationProfile.id !== donation.associationId) {
        throw new AppError(
          403,
          "Seule l'association destinataire peut confirmer la collecte",
          'FORBIDDEN'
        );
      }

      if (donation.status !== DonationStatus.SCHEDULED) {
        throw new AppError(
          400,
          'Le don doit être programmé avant de pouvoir être collecté',
          'NOT_SCHEDULED'
        );
      }

      return this.updateStatus(userId, donationId, DonationStatus.COLLECTED);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error confirming donation pickup', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la confirmation de la collecte');
    }
  }

  /**
   * Cancel donation
   */
  async cancel(
    userId: string,
    donationId: string,
    reason?: string
  ): Promise<Donation> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      // Verify user is donor or association
      const isAuthorized =
        donation.donorId === userId ||
        (await this.associationRepo.findByUserId(userId))?.id ===
          donation.associationId;

      if (!isAuthorized) {
        throw new AppError(
          403,
          "Vous n'êtes pas autorisé à annuler ce don",
          'FORBIDDEN'
        );
      }

      if (
        donation.status === DonationStatus.COMPLETED ||
        donation.status === DonationStatus.DISTRIBUTED
      ) {
        throw new AppError(
          400,
          'Un don complété ne peut pas être annulé',
          'CANNOT_CANCEL'
        );
      }

      // Restore product quantity if food donation
      if (donation.type === DonationType.FOOD && donation.productId) {
        await prisma.product.update({
          where: { id: donation.productId },
          data: {
            quantityAvailable: { increment: donation.quantity || 0 },
            status: ProductStatus.ACTIVE,
          },
        });
      }

      const cancelled = await this.donationRepo.updateStatus(
        donationId,
        DonationStatus.CANCELLED
      );

      // Emit event
      eventService.emit(AppEvent.DONATION_CANCELLED, {
        donationId,
        donorId: donation.donorId,
        associationId: donation.associationId,
        reason,
        cancelledBy: userId,
      });

      logger.info('Donation cancelled', {
        donationId,
        cancelledBy: userId,
        reason,
      });

      return cancelled;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error cancelling donation', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'annulation du don");
    }
  }

  /**
   * Get donations by donor
   */
  async getByDonor(
    donorId: string,
    params: {
      type?: DonationType;
      status?: DonationStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const result = await this.donationRepo.findByDonor(donorId, params);
    const limit = params.limit || 20;

    return {
      ...result,
      pages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get donations for an association
   */
  async getByAssociation(
    userId: string,
    params: {
      type?: DonationType;
      status?: DonationStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const profile = await this.associationRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil association non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    const result = await this.donationRepo.findByAssociation(profile.id, params);
    const limit = params.limit || 20;

    return {
      ...result,
      pages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get pending pickups for an association
   */
  async getPendingPickups(userId: string): Promise<Donation[]> {
    const profile = await this.associationRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil association non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return this.donationRepo.findPendingPickups(profile.id);
  }

  /**
   * Get donor statistics
   */
  async getDonorStats(donorId: string) {
    const user = await this.userRepo.findById(donorId);
    if (!user) {
      throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
    }

    return this.donationRepo.getDonorStats(donorId);
  }

  /**
   * Get association statistics
   */
  async getAssociationStats(userId: string) {
    const profile = await this.associationRepo.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        404,
        'Profil association non trouvé',
        'PROFILE_NOT_FOUND'
      );
    }

    return this.donationRepo.getAssociationStats(profile.id);
  }

  /**
   * Generate donation receipt
   */
  async generateReceipt(
    userId: string,
    donationId: string
  ): Promise<{ receiptUrl: string }> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      // Verify user is donor
      if (donation.donorId !== userId) {
        throw new AppError(
          403,
          "Seul le donateur peut demander un reçu",
          'FORBIDDEN'
        );
      }

      if (donation.status !== DonationStatus.COMPLETED) {
        throw new AppError(
          400,
          'Un reçu ne peut être généré que pour un don complété',
          'NOT_COMPLETED'
        );
      }

      // TODO: Generate actual PDF receipt
      // For now, return a placeholder
      const receiptUrl = `/receipts/donation-${donationId}.pdf`;

      await this.donationRepo.generateReceipt(donationId, receiptUrl);

      logger.info('Donation receipt generated', {
        donationId,
        donorId: userId,
      });

      return { receiptUrl };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error generating receipt', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la génération du reçu');
    }
  }

  /**
   * Generate donation certificate
   */
  async generateCertificate(
    userId: string,
    donationId: string
  ): Promise<{ certificateUrl: string }> {
    try {
      const donation = await this.donationRepo.findById(donationId);

      if (!donation) {
        throw new AppError(404, 'Don non trouvé', 'DONATION_NOT_FOUND');
      }

      // Verify user is donor
      if (donation.donorId !== userId) {
        throw new AppError(
          403,
          'Seul le donateur peut demander un certificat',
          'FORBIDDEN'
        );
      }

      if (donation.status !== DonationStatus.COMPLETED) {
        throw new AppError(
          400,
          'Un certificat ne peut être généré que pour un don complété',
          'NOT_COMPLETED'
        );
      }

      // TODO: Generate actual PDF certificate
      // For now, return a placeholder
      const certificateUrl = `/certificates/donation-${donationId}.pdf`;

      await this.donationRepo.generateCertificate(donationId, certificateUrl);

      logger.info('Donation certificate generated', {
        donationId,
        donorId: userId,
      });

      return { certificateUrl };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error generating certificate', {
        userId,
        donationId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la génération du certificat');
    }
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Search all donations (admin)
   */
  async searchAll(params: {
    type?: DonationType;
    status?: DonationStatus;
    associationId?: string;
    donorId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const result = await this.donationRepo.search(params);
    const limit = params.limit || 20;

    return {
      ...result,
      pages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get global donation statistics (admin)
   */
  async getGlobalStats(): Promise<{
    totalDonations: number;
    totalFoodDonations: number;
    totalFinancialDonations: number;
    totalAmountDonated: number;
    totalQuantityDonated: number;
    pendingDonations: number;
    completedDonations: number;
  }> {
    try {
      const [total, food, financial, completed, pending, aggregate] =
        await Promise.all([
          prisma.donation.count(),
          prisma.donation.count({ where: { type: DonationType.FOOD } }),
          prisma.donation.count({ where: { type: DonationType.FINANCIAL } }),
          prisma.donation.count({ where: { status: DonationStatus.COMPLETED } }),
          prisma.donation.count({
            where: {
              status: { in: [DonationStatus.PENDING, DonationStatus.SCHEDULED] },
            },
          }),
          prisma.donation.aggregate({
            _sum: {
              amount: true,
              quantity: true,
            },
            where: {
              status: { in: [DonationStatus.COMPLETED, DonationStatus.DISTRIBUTED] },
            },
          }),
        ]);

      return {
        totalDonations: total,
        totalFoodDonations: food,
        totalFinancialDonations: financial,
        totalAmountDonated: aggregate._sum.amount || 0,
        totalQuantityDonated: aggregate._sum.quantity || 0,
        pendingDonations: pending,
        completedDonations: completed,
      };
    } catch (error) {
      logger.error('Error getting global donation stats', {
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la récupération des statistiques');
    }
  }
}

export default new DonationService(
  donationRepository,
  associationRepository,
  userRepository
);
