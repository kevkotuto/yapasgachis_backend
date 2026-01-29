import { SupplierProfile, SupplierStore } from '@prisma/client';

import {
  ConfigurePayoutMethodDTO,
  PayoutMethodResponseDTO,
} from '@/core/interfaces/dtos/payout.dto';
import paymentProviderRepository from '@/core/repositories/payment-provider.repository';
import supplierRepository from '@/core/repositories/supplier.repository';
import supplierStoreRepository from '@/core/repositories/supplier-store.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Payout Service
 * Business logic for supplier payout method configuration
 */
export class PayoutService {
  // ==================== SUPPLIER PAYOUT MANAGEMENT ====================

  /**
   * Configure payout method for supplier
   */
  async configureSupplierPayoutMethod(
    supplierId: string,
    data: ConfigurePayoutMethodDTO
  ): Promise<PayoutMethodResponseDTO> {
    try {
      // Check if supplier exists
      const supplier = await supplierRepository.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      // Check if payment provider exists and is active
      const paymentProvider = await paymentProviderRepository.findById(
        data.payoutProviderId
      );
      if (!paymentProvider) {
        throw new AppError(
          404,
          'Moyen de paiement non trouvé',
          'PAYMENT_PROVIDER_NOT_FOUND'
        );
      }

      if (!paymentProvider.isActive || paymentProvider.status !== 'ACTIVE') {
        throw new AppError(
          400,
          "Ce moyen de paiement n'est pas disponible",
          'PAYMENT_PROVIDER_UNAVAILABLE'
        );
      }

      // Validate account info
      this.validateAccountInfo(data.accountInfo, paymentProvider.slug);

      // Update supplier payout settings
      const updatedSupplier = await prisma.supplierProfile.update({
        where: { id: supplierId },
        data: {
          payoutProviderId: data.payoutProviderId,
          payoutAccountInfo: data.accountInfo,
          payoutAccountVerified: false, // Reset verification when changing account
        },
        include: {
          payoutProvider: true,
        },
      });

      logger.info('Supplier payout method configured', {
        supplierId,
        providerId: data.payoutProviderId,
        provider: paymentProvider.name,
      });

      return this.toPayoutMethodResponse(updatedSupplier);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error configuring supplier payout method', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la configuration du moyen de retrait'
      );
    }
  }

  /**
   * Get supplier payout method
   */
  async getSupplierPayoutMethod(
    supplierId: string
  ): Promise<PayoutMethodResponseDTO> {
    try {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: supplierId },
        include: {
          payoutProvider: true,
        },
      });

      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      return this.toPayoutMethodResponse(supplier);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching supplier payout method', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération du moyen de retrait'
      );
    }
  }

  /**
   * Remove payout method for supplier
   */
  async removeSupplierPayoutMethod(supplierId: string): Promise<void> {
    try {
      const supplier = await supplierRepository.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      await prisma.supplierProfile.update({
        where: { id: supplierId },
        data: {
          payoutProviderId: null,
          payoutAccountInfo: null,
          payoutAccountVerified: false,
        },
      });

      logger.info('Supplier payout method removed', { supplierId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing supplier payout method', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la suppression du moyen de retrait'
      );
    }
  }

  // ==================== STORE PAYOUT MANAGEMENT ====================

  /**
   * Configure payout method for store
   */
  async configureStorePayoutMethod(
    storeId: string,
    supplierId: string,
    data: ConfigurePayoutMethodDTO
  ): Promise<PayoutMethodResponseDTO> {
    try {
      // Check if store belongs to supplier
      const store = await supplierStoreRepository.findById(storeId);
      if (!store || store.supplierId !== supplierId) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      // Check if payment provider exists and is active
      const paymentProvider = await paymentProviderRepository.findById(
        data.payoutProviderId
      );
      if (!paymentProvider) {
        throw new AppError(
          404,
          'Moyen de paiement non trouvé',
          'PAYMENT_PROVIDER_NOT_FOUND'
        );
      }

      if (!paymentProvider.isActive || paymentProvider.status !== 'ACTIVE') {
        throw new AppError(
          400,
          "Ce moyen de paiement n'est pas disponible",
          'PAYMENT_PROVIDER_UNAVAILABLE'
        );
      }

      // Validate account info
      this.validateAccountInfo(data.accountInfo, paymentProvider.slug);

      // Update store payout settings
      const updatedStore = await prisma.supplierStore.update({
        where: { id: storeId },
        data: {
          payoutProviderId: data.payoutProviderId,
          payoutAccountInfo: data.accountInfo,
          payoutAccountVerified: false,
        },
        include: {
          payoutProvider: true,
        },
      });

      logger.info('Store payout method configured', {
        storeId,
        supplierId,
        providerId: data.payoutProviderId,
        provider: paymentProvider.name,
      });

      return this.toStorePayoutMethodResponse(updatedStore);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error configuring store payout method', {
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la configuration du moyen de retrait du magasin'
      );
    }
  }

  /**
   * Get store payout method
   */
  async getStorePayoutMethod(
    storeId: string,
    supplierId: string
  ): Promise<PayoutMethodResponseDTO> {
    try {
      const store = await prisma.supplierStore.findUnique({
        where: { id: storeId },
        include: {
          payoutProvider: true,
        },
      });

      if (!store || store.supplierId !== supplierId) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      return this.toStorePayoutMethodResponse(store);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching store payout method', {
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération du moyen de retrait du magasin'
      );
    }
  }

  /**
   * Remove payout method for store
   */
  async removeStorePayoutMethod(
    storeId: string,
    supplierId: string
  ): Promise<void> {
    try {
      const store = await supplierStoreRepository.findById(storeId);
      if (!store || store.supplierId !== supplierId) {
        throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
      }

      await prisma.supplierStore.update({
        where: { id: storeId },
        data: {
          payoutProviderId: null,
          payoutAccountInfo: null,
          payoutAccountVerified: false,
        },
      });

      logger.info('Store payout method removed', { storeId, supplierId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing store payout method', {
        storeId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la suppression du moyen de retrait du magasin'
      );
    }
  }

  // ==================== HELPERS ====================

  /**
   * Validate account info based on provider
   */
  private validateAccountInfo(accountInfo: any, providerSlug: string): void {
    // Wave, Orange Money, MTN, Moov - require phone number
    if (
      ['wave', 'orange-money', 'mtn-mobile-money', 'moov-money'].includes(
        providerSlug
      )
    ) {
      if (!accountInfo.phoneNumber) {
        throw new AppError(
          400,
          'Le numéro de téléphone est requis pour ce moyen de paiement',
          'PHONE_NUMBER_REQUIRED'
        );
      }

      // Validate phone number format (simple validation)
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!phoneRegex.test(accountInfo.phoneNumber.replace(/\s/g, ''))) {
        throw new AppError(
          400,
          'Format de numéro de téléphone invalide',
          'INVALID_PHONE_NUMBER'
        );
      }
    }

    // Add more provider-specific validations here
  }

  /**
   * Convert SupplierProfile to PayoutMethodResponseDTO
   */
  private toPayoutMethodResponse(
    supplier: SupplierProfile & { payoutProvider: any }
  ): PayoutMethodResponseDTO {
    return {
      id: supplier.id,
      payoutProvider: supplier.payoutProvider
        ? {
            id: supplier.payoutProvider.id,
            name: supplier.payoutProvider.name,
            slug: supplier.payoutProvider.slug,
            logoUrl: supplier.payoutProvider.logoUrl,
          }
        : null,
      payoutAccountInfo: supplier.payoutAccountInfo as any,
      payoutAccountVerified: supplier.payoutAccountVerified,
      updatedAt: supplier.updatedAt,
    };
  }

  /**
   * Convert SupplierStore to PayoutMethodResponseDTO
   */
  private toStorePayoutMethodResponse(
    store: SupplierStore & { payoutProvider: any }
  ): PayoutMethodResponseDTO {
    return {
      id: store.id,
      payoutProvider: store.payoutProvider
        ? {
            id: store.payoutProvider.id,
            name: store.payoutProvider.name,
            slug: store.payoutProvider.slug,
            logoUrl: store.payoutProvider.logoUrl,
          }
        : null,
      payoutAccountInfo: store.payoutAccountInfo as any,
      payoutAccountVerified: store.payoutAccountVerified,
      updatedAt: store.updatedAt,
    };
  }
}

export default new PayoutService();
