import pointOfSaleRepository from '@/core/repositories/point-of-sale.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Point of Sale Service
 * Business logic for points of sale
 */
export class PointOfSaleService {
  /**
   * Create a POS
   */
  async createPOS(supplierId: string, data: any) {
    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new AppError(400, 'Coordonnées GPS invalides');
    }

    const pos = await pointOfSaleRepository.create({
      supplierId,
      ...data,
    });

    logger.info('POS created', {
      supplierId,
      posId: pos.id,
    });

    return pos;
  }

  /**
   * Get POS by ID
   */
  async getPOS(id: string) {
    const pos = await pointOfSaleRepository.findById(id);

    if (!pos) {
      throw new AppError(404, 'Point de vente non trouvé');
    }

    return pos;
  }

  /**
   * Get supplier's POS
   */
  async getSupplierPOS(supplierId: string, activeOnly = false) {
    return await pointOfSaleRepository.findBySupplier(supplierId, activeOnly);
  }

  /**
   * Search POS
   */
  async searchPOS(filters: any) {
    const result = await pointOfSaleRepository.search(filters);

    return {
      ...result,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: Math.ceil(result.total / (filters.limit || 20)),
      },
    };
  }

  /**
   * Update POS
   */
  async updatePOS(supplierId: string, posId: string, data: any) {
    const pos = await pointOfSaleRepository.findById(posId);

    if (!pos) {
      throw new AppError(404, 'Point de vente non trouvé');
    }

    if (pos.supplierId !== supplierId) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à modifier ce point de vente"
      );
    }

    // Validate coordinates if provided
    if (data.latitude || data.longitude) {
      if (
        data.latitude < -90 ||
        data.latitude > 90 ||
        data.longitude < -180 ||
        data.longitude > 180
      ) {
        throw new AppError(400, 'Coordonnées GPS invalides');
      }
    }

    const updated = await pointOfSaleRepository.update(posId, data);

    logger.info('POS updated', {
      supplierId,
      posId,
    });

    return updated;
  }

  /**
   * Delete POS
   */
  async deletePOS(supplierId: string, posId: string) {
    const pos = await pointOfSaleRepository.findById(posId);

    if (!pos) {
      throw new AppError(404, 'Point de vente non trouvé');
    }

    if (pos.supplierId !== supplierId) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à supprimer ce point de vente"
      );
    }

    // Check if it's the main POS
    const count = await pointOfSaleRepository.countBySupplier(supplierId);
    if (count === 1) {
      throw new AppError(
        400,
        "Impossible de supprimer le dernier point de vente. Créez-en un autre d'abord."
      );
    }

    await pointOfSaleRepository.delete(posId);

    logger.info('POS deleted', {
      supplierId,
      posId,
    });

    return { success: true };
  }

  /**
   * Find nearest POS
   */
  async findNearestPOS(latitude: number, longitude: number, radius = 10) {
    const result = await pointOfSaleRepository.search({
      latitude,
      longitude,
      radius,
      page: 1,
      limit: 10,
    });

    return result.pos;
  }
}

export default new PointOfSaleService();
