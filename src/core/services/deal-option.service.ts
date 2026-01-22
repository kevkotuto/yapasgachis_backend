import dealOptionRepository from '@/core/repositories/deal-option.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Deal Option Service
 * Business logic for deal options/variants
 */
export class DealOptionService {
  /**
   * Create a new deal option
   */
  async createDealOption(
    supplierId: string,
    data: {
      dealId: string;
      title: string;
      description?: string;
      price: number;
      capacity?: string;
      size?: string;
      floor?: string;
      features?: string[];
      imageUrl?: string;
      stock?: number;
      sortOrder?: number;
    }
  ) {
    // Verify deal exists and belongs to supplier
    const deal = await prisma.deal.findUnique({
      where: { id: data.dealId },
      select: { supplierId: true },
    });

    if (!deal) {
      throw new AppError(404, 'Deal non trouvé');
    }

    if (deal.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce deal");
    }

    // Validate price
    if (data.price < 0) {
      throw new AppError(400, 'Le prix doit être positif');
    }

    const option = await dealOptionRepository.create({
      ...data,
      features: data.features || [],
    });

    logger.info('Deal option created', {
      optionId: option.id,
      dealId: data.dealId,
      supplierId,
    });

    return option;
  }

  /**
   * Get all options for a deal
   */
  async getDealOptions(dealId: string, activeOnly = false) {
    // Verify deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new AppError(404, 'Deal non trouvé');
    }

    if (activeOnly) {
      return await dealOptionRepository.findActiveDealOptions(dealId);
    }

    return await dealOptionRepository.findByDealId(dealId);
  }

  /**
   * Get a single option by ID
   */
  async getDealOption(id: string) {
    const option = await dealOptionRepository.findById(id);

    if (!option) {
      throw new AppError(404, 'Option non trouvée');
    }

    return option;
  }

  /**
   * Update a deal option
   */
  async updateDealOption(
    supplierId: string,
    optionId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      capacity?: string;
      size?: string;
      floor?: string;
      features?: string[];
      imageUrl?: string;
      stock?: number;
      isActive?: boolean;
      sortOrder?: number;
    }
  ) {
    const option = await dealOptionRepository.findById(optionId);

    if (!option) {
      throw new AppError(404, 'Option non trouvée');
    }

    // Verify supplier owns the deal
    const deal = await prisma.deal.findUnique({
      where: { id: option.dealId },
      select: { supplierId: true },
    });

    if (!deal || deal.supplierId !== supplierId) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à modifier cette option"
      );
    }

    // Validate price if provided
    if (data.price !== undefined && data.price < 0) {
      throw new AppError(400, 'Le prix doit être positif');
    }

    const updatedOption = await dealOptionRepository.update(optionId, data);

    logger.info('Deal option updated', {
      optionId,
      supplierId,
    });

    return updatedOption;
  }

  /**
   * Delete a deal option
   */
  async deleteDealOption(supplierId: string, optionId: string) {
    const option = await dealOptionRepository.findById(optionId);

    if (!option) {
      throw new AppError(404, 'Option non trouvée');
    }

    // Verify supplier owns the deal
    const deal = await prisma.deal.findUnique({
      where: { id: option.dealId },
      select: { supplierId: true },
    });

    if (!deal || deal.supplierId !== supplierId) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à supprimer cette option"
      );
    }

    await dealOptionRepository.delete(optionId);

    logger.info('Deal option deleted', {
      optionId,
      supplierId,
    });

    return { success: true };
  }

  /**
   * Reorder deal options
   */
  async reorderDealOptions(
    supplierId: string,
    dealId: string,
    optionIds: string[]
  ) {
    // Verify deal exists and belongs to supplier
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { supplierId: true },
    });

    if (!deal) {
      throw new AppError(404, 'Deal non trouvé');
    }

    if (deal.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce deal");
    }

    // Verify all options belong to this deal
    const options = await dealOptionRepository.findByDealId(dealId);
    const optionIdsSet = new Set(options.map((o) => o.id));

    for (const id of optionIds) {
      if (!optionIdsSet.has(id)) {
        throw new AppError(400, `Option ${id} n'appartient pas à ce deal`);
      }
    }

    // Update sort order
    const updates = optionIds.map((id, index) => ({
      id,
      sortOrder: index,
    }));

    await dealOptionRepository.updateSortOrder(updates);

    logger.info('Deal options reordered', {
      dealId,
      supplierId,
    });

    return await dealOptionRepository.findByDealId(dealId);
  }

  /**
   * Check option availability
   */
  async checkAvailability(optionId: string, quantity: number) {
    const available = await dealOptionRepository.checkAvailability(
      optionId,
      quantity
    );

    if (!available) {
      throw new AppError(400, 'Option non disponible en quantité suffisante');
    }

    return { available: true };
  }

  /**
   * Update option stock (called after booking)
   */
  async updateStock(optionId: string, quantity: number) {
    // Check availability first
    const available = await dealOptionRepository.checkAvailability(
      optionId,
      quantity
    );

    if (!available) {
      throw new AppError(400, 'Stock insuffisant');
    }

    return await dealOptionRepository.updateStock(optionId, quantity);
  }
}

export default new DealOptionService();
