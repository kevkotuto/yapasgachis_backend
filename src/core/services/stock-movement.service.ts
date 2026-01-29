import { StockMovement, StockMovementType } from '@prisma/client';

import stockMovementRepository, {
  StockMovementRepository,
} from '@/core/repositories/stock-movement.repository';
import productRepository, {
  ProductRepository,
} from '@/core/repositories/product.repository';
import supplierRepository, {
  SupplierRepository,
} from '@/core/repositories/supplier.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * Stock Movement Service
 * Business logic for stock movement management
 */
export class StockMovementService {
  constructor(
    private stockMovementRepo: StockMovementRepository,
    private productRepo: ProductRepository,
    private supplierRepo: SupplierRepository
  ) {}

  /**
   * Create a stock movement and update product stock automatically
   */
  async createMovement(
    userId: string,
    data: {
      productId: string;
      type: StockMovementType;
      quantity: number;
      orderId?: string;
      storeId?: string;
      reason?: string;
      notes?: string;
    }
  ): Promise<StockMovement> {
    try {
      // Get supplier profile
      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'SUPPLIER_NOT_FOUND'
        );
      }

      // Get product and verify ownership
      const product = await this.productRepo.findById(data.productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      if (product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas gérer le stock de ce produit',
          'FORBIDDEN'
        );
      }

      // Validate quantity
      if (data.quantity === 0) {
        throw new AppError(
          400,
          'La quantité ne peut pas être zéro',
          'INVALID_QUANTITY'
        );
      }

      // Calculate stock change based on movement type
      let quantityChange = 0;
      switch (data.type) {
        case StockMovementType.PURCHASE:
        case StockMovementType.RETURN:
          quantityChange = Math.abs(data.quantity); // Always positive for these types
          break;
        case StockMovementType.SALE:
        case StockMovementType.LOSS:
          quantityChange = -Math.abs(data.quantity); // Always negative for these types
          break;
        case StockMovementType.ADJUSTMENT:
          quantityChange = data.quantity; // Can be positive or negative
          break;
        case StockMovementType.TRANSFER:
          // For transfers, quantity change depends on the sign
          quantityChange = data.quantity;
          break;
        default:
          throw new AppError(
            400,
            'Type de mouvement invalide',
            'INVALID_MOVEMENT_TYPE'
          );
      }

      // Check if resulting stock would be negative
      const newQuantity = product.quantityAvailable + quantityChange;
      if (newQuantity < 0) {
        throw new AppError(
          400,
          'Stock insuffisant pour cette opération',
          'INSUFFICIENT_STOCK'
        );
      }

      // Use a transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create stock movement
        const movement = await tx.stockMovement.create({
          data: {
            productId: data.productId,
            type: data.type,
            quantity: quantityChange,
            previousStock: product.quantityAvailable,
            newStock: newQuantity,
            orderId: data.orderId,
            supplierId: supplier.id,
            storeId: data.storeId,
            reason: data.reason,
            notes: data.notes,
            performedById: userId,
          },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                quantityAvailable: true,
              },
            },
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: data.productId },
          data: {
            quantityAvailable: newQuantity,
            quantity: newQuantity,
            // Update status based on new quantity
            status:
              newQuantity <= 0
                ? 'SOLD_OUT'
                : product.status === 'SOLD_OUT'
                  ? 'ACTIVE'
                  : product.status,
          },
        });

        return movement;
      });

      logger.info('Stock movement created', {
        userId,
        productId: data.productId,
        type: data.type,
        quantity: quantityChange,
        previousStock: product.quantityAvailable,
        newStock: newQuantity,
      });

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating stock movement', {
        userId,
        data,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la création du mouvement de stock'
      );
    }
  }

  /**
   * Get stock movement history for a product
   */
  async getProductHistory(
    userId: string,
    productId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    movements: StockMovement[];
    total: number;
    pages: number;
  }> {
    try {
      // Get supplier profile
      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'SUPPLIER_NOT_FOUND'
        );
      }

      // Get product and verify ownership
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      if (product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          "Vous ne pouvez pas voir l'historique de ce produit",
          'FORBIDDEN'
        );
      }

      const { movements, total } = await this.stockMovementRepo.findByProductId(
        productId,
        options
      );

      const limit = options?.limit || 20;
      const pages = Math.ceil(total / limit);

      return { movements, total, pages };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting product stock history', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la récupération de l'historique du stock"
      );
    }
  }

  /**
   * Get stock movements for a supplier with filters
   */
  async getMovements(
    userId: string,
    filters?: {
      type?: StockMovementType;
      productId?: string;
      storeId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    movements: StockMovement[];
    total: number;
    pages: number;
  }> {
    try {
      // Get supplier profile
      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'SUPPLIER_NOT_FOUND'
        );
      }

      const { movements, total } =
        await this.stockMovementRepo.findBySupplierId(supplier.id, filters);

      const limit = filters?.limit || 20;
      const pages = Math.ceil(total / limit);

      return { movements, total, pages };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting stock movements', {
        userId,
        filters,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération des mouvements de stock'
      );
    }
  }

  /**
   * Get stock movements for a store
   */
  async getStoreMovements(
    userId: string,
    storeId: string,
    filters?: {
      type?: StockMovementType;
      productId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    movements: StockMovement[];
    total: number;
    pages: number;
  }> {
    try {
      // Get supplier profile
      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier) {
        throw new AppError(
          404,
          'Profil fournisseur non trouvé',
          'SUPPLIER_NOT_FOUND'
        );
      }

      // TODO: Verify that the store belongs to this supplier
      // For now, we'll trust that the storeId is valid

      const { movements, total } = await this.stockMovementRepo.findByStoreId(
        storeId,
        filters
      );

      const limit = filters?.limit || 20;
      const pages = Math.ceil(total / limit);

      return { movements, total, pages };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting store stock movements', {
        userId,
        storeId,
        filters,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la récupération des mouvements de stock du magasin'
      );
    }
  }
}

export default new StockMovementService(
  stockMovementRepository,
  productRepository,
  supplierRepository
);
