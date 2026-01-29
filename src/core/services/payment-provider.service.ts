import { PaymentProvider, PaymentProviderStatus } from '@prisma/client';

import {
  CreatePaymentProviderDTO,
  UpdatePaymentProviderDTO,
  PaymentProviderResponseDTO,
  PublicPaymentProviderDTO,
  PaymentProviderListQueryDTO,
} from '@/core/interfaces/dtos/payment-provider.dto';
import paymentProviderRepository, {
  PaymentProviderRepository,
} from '@/core/repositories/payment-provider.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Payment Provider Service
 * Business logic for payment provider management
 */
export class PaymentProviderService {
  constructor(private providerRepo: PaymentProviderRepository) {}

  // ==================== ADMIN MANAGEMENT ====================

  /**
   * Create a new payment provider (admin only)
   */
  async createProvider(
    adminId: string,
    data: CreatePaymentProviderDTO
  ): Promise<PaymentProviderResponseDTO> {
    try {
      // Check if slug already exists
      const existingProvider = await this.providerRepo.findBySlug(data.slug);
      if (existingProvider) {
        throw new AppError(
          409,
          `Un moyen de paiement avec le slug "${data.slug}" existe déjà`,
          'PROVIDER_SLUG_EXISTS'
        );
      }

      const provider = await this.providerRepo.create({
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logoUrl,
        iconUrl: data.iconUrl,
        isActive: data.isActive ?? true,
        status: data.status ?? 'ACTIVE',
        paymentFeeRate: data.paymentFeeRate ?? 0,
        transferFeeRate: data.transferFeeRate ?? 0,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        supportedCountries: data.supportedCountries,
        supportedCurrencies: data.supportedCurrencies,
        config: data.config,
        displayOrder: data.displayOrder ?? 0,
        isFeatured: data.isFeatured ?? false,
        createdByAdminId: adminId,
      });

      logger.info('Payment provider created', {
        adminId,
        providerId: provider.id,
        slug: provider.slug,
      });

      return this.toResponseDTO(provider);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating payment provider', {
        adminId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la création du moyen de paiement'
      );
    }
  }

  /**
   * Update payment provider (admin only)
   */
  async updateProvider(
    adminId: string,
    providerId: string,
    data: UpdatePaymentProviderDTO
  ): Promise<PaymentProviderResponseDTO> {
    try {
      const provider = await this.providerRepo.findById(providerId);
      if (!provider) {
        throw new AppError(
          404,
          'Moyen de paiement non trouvé',
          'PROVIDER_NOT_FOUND'
        );
      }

      // Check if new slug conflicts with existing providers
      if (data.slug && data.slug !== provider.slug) {
        const slugExists = await this.providerRepo.existsBySlug(
          data.slug,
          providerId
        );
        if (slugExists) {
          throw new AppError(
            409,
            `Un moyen de paiement avec le slug "${data.slug}" existe déjà`,
            'PROVIDER_SLUG_EXISTS'
          );
        }
      }

      const updated = await this.providerRepo.update(providerId, {
        ...data,
        updatedByAdminId: adminId,
      });

      logger.info('Payment provider updated', {
        adminId,
        providerId,
        changes: Object.keys(data),
      });

      return this.toResponseDTO(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating payment provider', {
        adminId,
        providerId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la mise à jour du moyen de paiement'
      );
    }
  }

  /**
   * Delete payment provider (admin only)
   */
  async deleteProvider(adminId: string, providerId: string): Promise<void> {
    try {
      const provider = await this.providerRepo.findById(providerId);
      if (!provider) {
        throw new AppError(
          404,
          'Moyen de paiement non trouvé',
          'PROVIDER_NOT_FOUND'
        );
      }

      await this.providerRepo.delete(providerId);

      logger.info('Payment provider deleted', {
        adminId,
        providerId,
        slug: provider.slug,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting payment provider', {
        adminId,
        providerId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la suppression du moyen de paiement'
      );
    }
  }

  /**
   * Get all payment providers (admin only - includes inactive)
   */
  async getAllProviders(query: PaymentProviderListQueryDTO): Promise<{
    providers: PaymentProviderResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { providers, total } = await this.providerRepo.findAll({
        isActive: query.isActive,
        status: query.status,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      });

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const totalPages = Math.ceil(total / limit);

      return {
        providers: providers.map((p) => this.toResponseDTO(p)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error fetching all payment providers', {
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération des moyens de paiement'
      );
    }
  }

  /**
   * Get payment provider by ID (admin only)
   */
  async getProviderById(
    providerId: string
  ): Promise<PaymentProviderResponseDTO> {
    try {
      const provider = await this.providerRepo.findById(providerId);
      if (!provider) {
        throw new AppError(
          404,
          'Moyen de paiement non trouvé',
          'PROVIDER_NOT_FOUND'
        );
      }

      return this.toResponseDTO(provider);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching payment provider by ID', {
        providerId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération du moyen de paiement'
      );
    }
  }

  /**
   * Update display order of providers (admin only)
   */
  async updateDisplayOrder(
    adminId: string,
    updates: { id: string; displayOrder: number }[]
  ): Promise<void> {
    try {
      await this.providerRepo.updateDisplayOrder(updates);

      logger.info('Payment provider display order updated', {
        adminId,
        updatesCount: updates.length,
      });
    } catch (error) {
      logger.error('Error updating payment provider display order', {
        adminId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la mise à jour de l'ordre d'affichage"
      );
    }
  }

  // ==================== PUBLIC / CLIENT API ====================

  /**
   * Get active payment providers (for clients/suppliers)
   */
  async getActiveProviders(): Promise<PublicPaymentProviderDTO[]> {
    try {
      const providers = await this.providerRepo.findActiveProviders();
      return providers.map((p) => this.toPublicDTO(p));
    } catch (error) {
      logger.error('Error fetching active payment providers', {
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération des moyens de paiement'
      );
    }
  }

  /**
   * Get payment provider by slug (public)
   */
  async getProviderBySlug(slug: string): Promise<PublicPaymentProviderDTO> {
    try {
      const provider = await this.providerRepo.findBySlug(slug);
      if (!provider || !provider.isActive || provider.status !== 'ACTIVE') {
        throw new AppError(
          404,
          'Moyen de paiement non disponible',
          'PROVIDER_NOT_AVAILABLE'
        );
      }

      return this.toPublicDTO(provider);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching payment provider by slug', {
        slug,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération du moyen de paiement'
      );
    }
  }

  // ==================== HELPERS ====================

  /**
   * Convert PaymentProvider to ResponseDTO (admin)
   */
  private toResponseDTO(provider: PaymentProvider): PaymentProviderResponseDTO {
    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      description: provider.description ?? undefined,
      logoUrl: provider.logoUrl ?? undefined,
      iconUrl: provider.iconUrl ?? undefined,
      isActive: provider.isActive,
      status: provider.status,
      paymentFeeRate: provider.paymentFeeRate,
      transferFeeRate: provider.transferFeeRate,
      minAmount: provider.minAmount ?? undefined,
      maxAmount: provider.maxAmount ?? undefined,
      supportedCountries:
        (provider.supportedCountries as string[]) ?? undefined,
      supportedCurrencies:
        (provider.supportedCurrencies as string[]) ?? undefined,
      displayOrder: provider.displayOrder,
      isFeatured: provider.isFeatured,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  /**
   * Convert PaymentProvider to PublicDTO (clients)
   */
  private toPublicDTO(provider: PaymentProvider): PublicPaymentProviderDTO {
    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      description: provider.description ?? undefined,
      logoUrl: provider.logoUrl ?? undefined,
      iconUrl: provider.iconUrl ?? undefined,
      paymentFeeRate: provider.paymentFeeRate,
      minAmount: provider.minAmount ?? undefined,
      maxAmount: provider.maxAmount ?? undefined,
      supportedCurrencies:
        (provider.supportedCurrencies as string[]) ?? undefined,
      isFeatured: provider.isFeatured,
    };
  }
}

export default new PaymentProviderService(paymentProviderRepository);
