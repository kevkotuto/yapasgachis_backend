import { Product, ProductStatus, ProductCategory } from '@prisma/client';

import productRepository, {
  ProductRepository,
} from '@/core/repositories/product.repository';
import supplierRepository, {
  SupplierRepository,
} from '@/core/repositories/supplier.repository';
import logger from '@/infrastructure/monitoring/logger';
import mediaServerService from '@/infrastructure/storage/media-server.service';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Product Service
 * Business logic for product management
 */
export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private supplierRepo: SupplierRepository
  ) {}

  /**
   * Create a new product
   */
  async createProduct(
    userId: string,
    data: {
      name: string;
      description?: string;
      category: ProductCategory;
      originalPrice: number;
      price: number;
      quantity: number;
      unit?: string;
      expiresAt: Date;
      images?: string[];
      tags?: string[];
      pickupLocation?: string;
      pickupInstructions?: string;
    }
  ): Promise<Product> {
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

      // Validate prices
      if (data.price >= data.originalPrice) {
        throw new AppError(
          400,
          'Le prix réduit doit être inférieur au prix original',
          'INVALID_PRICE'
        );
      }

      if (data.quantity <= 0) {
        throw new AppError(
          400,
          'La quantité doit être supérieure à 0',
          'INVALID_QUANTITY'
        );
      }

      // Validate expiration date
      if (new Date(data.expiresAt) <= new Date()) {
        throw new AppError(
          400,
          "La date d'expiration doit être dans le futur",
          'INVALID_EXPIRY_DATE'
        );
      }

      // Create product
      const product = await this.productRepo.create({
        title: data.name,
        description: data.description,
        category: data.category,
        originalPrice: data.originalPrice,
        discountedPrice: data.price,
        quantity: data.quantity,
        quantityAvailable: data.quantity,
        unit: data.unit || 'piece',
        expiryDate: data.expiresAt,
        status: ProductStatus.ACTIVE,
        images: data.images || [],
        supplier: { connect: { id: supplier.id } },
      });

      logger.info('Product created', {
        userId,
        productId: product.id,
        title: product.title,
      });

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating product', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du produit');
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id);

    if (!product) {
      throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  /**
   * Update product
   */
  async updateProduct(
    userId: string,
    productId: string,
    data: {
      name?: string;
      description?: string;
      category?: ProductCategory;
      originalPrice?: number;
      price?: number;
      quantity?: number;
      unit?: string;
      expiresAt?: Date;
      status?: ProductStatus;
      images?: string[];
      tags?: string[];
      pickupLocation?: string;
      pickupInstructions?: string;
    }
  ): Promise<Product> {
    try {
      // Get product and verify ownership
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      // Validate prices if provided
      if (data.price || data.originalPrice) {
        const originalPrice =
          data.originalPrice || Number(product.originalPrice);
        const price = data.price || Number(product.discountedPrice);

        if (price >= originalPrice) {
          throw new AppError(
            400,
            'Le prix réduit doit être inférieur au prix original',
            'INVALID_PRICE'
          );
        }
      }

      // Prepare update data
      const updateData: any = { ...data };
      if (data.price) {
        updateData.discountedPrice = data.price;
        delete updateData.price;
      }
      if (data.name) {
        updateData.title = data.name;
        delete updateData.name;
      }
      if (data.expiresAt) {
        updateData.expiryDate = data.expiresAt;
        delete updateData.expiresAt;
      }

      // Update product
      const updated = await this.productRepo.update(productId, updateData);

      logger.info('Product updated', {
        userId,
        productId,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating product', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du produit');
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(userId: string, productId: string): Promise<void> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas supprimer ce produit',
          'FORBIDDEN'
        );
      }

      // Delete product images from Media Server
      const images = product.images as string[] | null;
      if (images && images.length > 0) {
        const fileInfos = images
          .map((url) => mediaServerService.extractFileInfo(url))
          .filter(
            (info): info is { folder: string; filename: string } =>
              info !== null
          );

        if (fileInfos.length > 0) {
          await mediaServerService.deleteMultipleFiles(fileInfos);
        }
      }

      await this.productRepo.delete(productId);

      logger.info('Product deleted', {
        userId,
        productId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting product', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du produit');
    }
  }

  /**
   * Search products
   * @param nearbyFirst - Si true avec lat/lng, affiche les produits proches en premier puis les autres
   */
  async searchProducts(params: {
    search?: string;
    category?: ProductCategory;
    status?: ProductStatus;
    supplierId?: string;
    minPrice?: number;
    maxPrice?: number;
    minDiscount?: number;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    nearbyFirst?: boolean;
    nearbyRadius?: number;
    expiresWithin?: number;
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'discount' | 'expiry' | 'createdAt' | 'distance';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ products: Product[]; total: number; pages: number }> {
    const { products, total } = await this.productRepo.search(params);
    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { products, total, pages };
  }

  /**
   * Get products expiring soon
   */
  async getExpiringSoon(hours: number = 24): Promise<Product[]> {
    return this.productRepo.getExpiringSoon(hours);
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10): Promise<Product[]> {
    return this.productRepo.getTrending(limit);
  }

  /**
   * Get supplier's products
   */
  async getSupplierProducts(
    userId: string,
    filters?: {
      storeId?: string;
      status?: ProductStatus;
      category?: ProductCategory;
      page?: number;
      limit?: number;
    }
  ): Promise<{ products: Product[]; total: number; pages: number }> {
    const supplier = await this.supplierRepo.findByUserId(userId);
    if (!supplier) {
      throw new AppError(
        404,
        'Profil fournisseur non trouvé',
        'SUPPLIER_NOT_FOUND'
      );
    }

    const { products, total } = await this.productRepo.findBySupplierId(
      supplier.id,
      filters
    );

    const limit = filters?.limit || 20;
    const pages = Math.ceil(total / limit);

    return { products, total, pages };
  }

  /**
   * Update product stock
   */
  async updateStock(
    userId: string,
    productId: string,
    quantityChange: number
  ): Promise<Product> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      const updated = await this.productRepo.updateStock(
        productId,
        quantityChange
      );

      if (!updated) {
        throw new AppError(500, 'Erreur lors de la mise à jour du stock');
      }

      logger.info('Product stock updated', {
        userId,
        productId,
        quantityChange,
        newQuantity: updated.quantity,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating product stock', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du stock');
    }
  }

  /**
   * Upload product images
   */
  async uploadImages(
    userId: string,
    productId: string,
    files: { buffer: Buffer; filename: string }[]
  ): Promise<string[]> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      // Upload images to Media Server
      const uploadResults = await mediaServerService.uploadMultipleFiles(
        files,
        'products'
      );

      const imageUrls = uploadResults.map((result) => result.url);

      // Update product with new images
      const existingImages = (product.images as string[] | null) || [];
      const updatedImages = [...existingImages, ...imageUrls];

      await this.productRepo.update(productId, {
        images: updatedImages,
      });

      logger.info('Product images uploaded', {
        userId,
        productId,
        count: imageUrls.length,
      });

      return imageUrls;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error uploading product images', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'upload des images");
    }
  }

  /**
   * Delete product image
   */
  async deleteImage(
    userId: string,
    productId: string,
    imageUrl: string
  ): Promise<void> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      // Remove image URL from product
      const currentImages = (product.images as string[] | null) || [];
      const updatedImages = currentImages.filter((url) => url !== imageUrl);
      await this.productRepo.update(productId, { images: updatedImages });

      // Delete from Media Server
      const fileInfo = mediaServerService.extractFileInfo(imageUrl);
      if (fileInfo) {
        await mediaServerService.deleteFile(fileInfo.folder, fileInfo.filename);
      }

      logger.info('Product image deleted', {
        userId,
        productId,
        imageUrl,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting product image', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de la suppression de l'image");
    }
  }

  /**
   * Update product stock settings (minStock/maxStock)
   */
  async updateSettings(
    userId: string,
    productId: string,
    settings: { minStock?: number; maxStock?: number }
  ): Promise<Product> {
    try {
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      // Valider cohérence min < max
      const min = settings.minStock ?? (product as any).minStock ?? 5;
      const max = settings.maxStock ?? (product as any).maxStock ?? 20;
      if (min >= max) {
        throw new AppError(
          400,
          'Le stock minimum doit être inférieur au maximum',
          'INVALID_STOCK_SETTINGS'
        );
      }

      const updated = await this.productRepo.update(productId, {
        ...(settings.minStock !== undefined && { minStock: settings.minStock }),
        ...(settings.maxStock !== undefined && { maxStock: settings.maxStock }),
      });

      logger.info('Product settings updated', {
        userId,
        productId,
        settings,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating product settings', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la mise à jour des paramètres de stock'
      );
    }
  }

  /**
   * Toggle product status between ACTIVE and DRAFT
   */
  async toggleProductStatus(
    userId: string,
    productId: string
  ): Promise<Product> {
    try {
      // Get product and verify ownership
      const product = await this.productRepo.findById(productId);
      if (!product) {
        throw new AppError(404, 'Produit non trouvé', 'PRODUCT_NOT_FOUND');
      }

      const supplier = await this.supplierRepo.findByUserId(userId);
      if (!supplier || product.supplierId !== supplier.id) {
        throw new AppError(
          403,
          'Vous ne pouvez pas modifier ce produit',
          'FORBIDDEN'
        );
      }

      // Toggle status logic:
      // - If DRAFT → ACTIVE
      // - If ACTIVE → DRAFT
      // - If SOLD_OUT or EXPIRED → ACTIVE (reactivate)
      // - If ARCHIVED → ACTIVE (reactivate)
      let newStatus: ProductStatus;

      if (product.status === ProductStatus.DRAFT) {
        newStatus = ProductStatus.ACTIVE;
      } else if (product.status === ProductStatus.ACTIVE) {
        newStatus = ProductStatus.DRAFT;
      } else {
        // For SOLD_OUT, EXPIRED, ARCHIVED → reactivate to ACTIVE
        newStatus = ProductStatus.ACTIVE;
      }

      // Update product status
      const updated = await this.productRepo.update(productId, {
        status: newStatus,
      });

      logger.info('Product status toggled', {
        userId,
        productId,
        oldStatus: product.status,
        newStatus,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error toggling product status', {
        userId,
        productId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du changement de statut du produit');
    }
  }

  /**
   * Mark expired products (cron job)
   */
  async markExpiredProducts(): Promise<number> {
    return this.productRepo.markExpired();
  }
}

export default new ProductService(productRepository, supplierRepository);
