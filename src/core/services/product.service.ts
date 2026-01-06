import { Product, ProductStatus, ProductCategory } from '@prisma/client';
import productRepository, {
  ProductRepository,
} from '@/core/repositories/product.repository';
import supplierRepository, {
  SupplierRepository,
} from '@/core/repositories/supplier.repository';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

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

      // Calculate discount percentage
      const discountPercentage = Math.round(
        ((data.originalPrice - data.price) / data.originalPrice) * 100
      );

      // Create product
      const product = await this.productRepo.create({
        name: data.name,
        description: data.description,
        category: data.category,
        originalPrice: data.originalPrice,
        price: data.price,
        discountPercentage,
        quantity: data.quantity,
        unit: data.unit || 'unité',
        expiresAt: data.expiresAt,
        status: ProductStatus.AVAILABLE,
        images: data.images || [],
        tags: data.tags || [],
        pickupLocation: data.pickupLocation,
        pickupInstructions: data.pickupInstructions,
        supplier: { connect: { id: supplier.id } },
      });

      logger.info('Product created', {
        userId,
        productId: product.id,
        name: product.name,
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
        const originalPrice = data.originalPrice || product.originalPrice;
        const price = data.price || product.price;

        if (price >= originalPrice) {
          throw new AppError(
            400,
            'Le prix réduit doit être inférieur au prix original',
            'INVALID_PRICE'
          );
        }
      }

      // Recalculate discount if prices changed
      let discountPercentage = product.discountPercentage;
      if (data.originalPrice || data.price) {
        const originalPrice = data.originalPrice || product.originalPrice;
        const price = data.price || product.price;
        discountPercentage = Math.round(
          ((originalPrice - price) / originalPrice) * 100
        );
      }

      // Update product
      const updated = await this.productRepo.update(productId, {
        ...data,
        discountPercentage,
      });

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

      // Delete product images from Cloudinary
      if (product.images && product.images.length > 0) {
        const publicIds = product.images
          .map((url) => cloudinaryService.extractPublicId(url))
          .filter((id): id is string => id !== null);

        if (publicIds.length > 0) {
          await cloudinaryService.deleteMultipleFiles(publicIds);
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
    expiresWithin?: number;
    page?: number;
    limit?: number;
    sortBy?: 'price' | 'discount' | 'expiry' | 'createdAt';
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

      // Upload images to Cloudinary
      const uploadResults = await cloudinaryService.uploadMultipleImages(
        files,
        {
          folder: `yapasgachis/products/${productId}`,
          width: 1200,
          height: 1200,
          quality: 80,
        }
      );

      const imageUrls = uploadResults.map((result) => result.secureUrl);

      // Update product with new images
      const existingImages = product.images || [];
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
      const images = (product.images || []).filter((url) => url !== imageUrl);
      await this.productRepo.update(productId, { images });

      // Delete from Cloudinary
      const publicId = cloudinaryService.extractPublicId(imageUrl);
      if (publicId) {
        await cloudinaryService.deleteFile(publicId);
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
   * Mark expired products (cron job)
   */
  async markExpiredProducts(): Promise<number> {
    return this.productRepo.markExpired();
  }
}

export default new ProductService(productRepository, supplierRepository);
