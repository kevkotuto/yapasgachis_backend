import { Request, Response } from 'express';

import {
  CreateProductInput,
  UpdateProductInput,
  GetProductByIdInput,
  DeleteProductInput,
  SearchProductsInput,
  GetExpiringSoonInput,
  GetTrendingInput,
  UpdateStockInput,
  UploadImagesInput,
  DeleteImageInput,
  GetSupplierProductsInput,
  ToggleProductStatusInput,
  UpdateProductSettingsInput,
  PublishProductInput,
} from '../validators/product.validator';

import productService from '@/core/services/product.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { asyncHandler } from '@/utils/helpers';
import { normalizeImages, normalizeImagesList } from '@/utils/normalize.utils';

/**
 * Product Controller
 * Handles product-related HTTP requests
 */
export class ProductController {
  /**
   * Create product
   * POST /api/v1/products
   */
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateProductInput;

    const product = await productService.createProduct(
      userId,
      body as Required<CreateProductInput>
    );

    logger.info('Product created via API', {
      userId,
      productId: product.id,
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: normalizeImages(product),
    });
  });

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  getProduct = asyncHandler(
    async (req: Request<GetProductByIdInput>, res: Response) => {
      const { id } = req.params;

      const product = await productService.getProduct(id);

      res.json({
        success: true,
        data: normalizeImages(product),
      });
    }
  );

  /**
   * Publish product (assign to one/several/no store and set ACTIVE)
   * POST /api/v1/products/:id/publish
   */
  publishProduct = asyncHandler(
    async (
      req: Request<
        PublishProductInput['params'],
        {},
        PublishProductInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const storeIds = req.body?.storeIds ?? [];

      const products = await productService.publishProduct(
        userId,
        id,
        storeIds
      );

      logger.info('Product published via API', {
        userId,
        productId: id,
        storeIdsCount: storeIds.length,
      });

      res.json({
        success: true,
        message: 'Produit publié avec succès',
        data: normalizeImagesList(products),
      });
    }
  );

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  updateProduct = asyncHandler(
    async (
      req: Request<
        UpdateProductInput['params'],
        {},
        UpdateProductInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;

      const product = await productService.updateProduct(userId, id, req.body);

      logger.info('Product updated via API', {
        userId,
        productId: id,
      });

      res.json({
        success: true,
        message: 'Produit mis à jour avec succès',
        data: normalizeImages(product),
      });
    }
  );

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  deleteProduct = asyncHandler(
    async (req: Request<DeleteProductInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      await productService.deleteProduct(userId, id);

      logger.info('Product deleted via API', {
        userId,
        productId: id,
      });

      res.json({
        success: true,
        message: 'Produit supprimé avec succès',
      });
    }
  );

  /**
   * Search products
   * GET /api/v1/products/search
   */
  searchProducts = asyncHandler(
    async (req: Request<{}, {}, {}, SearchProductsInput>, res: Response) => {
      const result = await productService.searchProducts(req.query);

      res.json({
        success: true,
        data: {
          ...result,
          products: normalizeImagesList(result.products),
        },
      });
    }
  );

  /**
   * Get products expiring soon
   * GET /api/v1/products/expiring-soon
   */
  getExpiringSoon = asyncHandler(
    async (req: Request<{}, {}, {}, GetExpiringSoonInput>, res: Response) => {
      const { hours } = req.query;

      const products = await productService.getExpiringSoon(hours);

      res.json({
        success: true,
        data: {
          products: normalizeImagesList(products),
          count: products.length,
        },
      });
    }
  );

  /**
   * Get trending products
   * GET /api/v1/products/trending
   */
  getTrending = asyncHandler(
    async (req: Request<{}, {}, {}, GetTrendingInput>, res: Response) => {
      const { limit } = req.query;

      const products = await productService.getTrendingProducts(limit);

      res.json({
        success: true,
        data: {
          products: normalizeImagesList(products),
          count: products.length,
        },
      });
    }
  );

  /**
   * Get supplier's products
   * GET /api/v1/products/my-products
   */
  getMyProducts = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetSupplierProductsInput>,
      res: Response
    ) => {
      const userId = req.user.id;

      const result = await productService.getSupplierProducts(
        userId,
        req.query
      );

      res.json({
        success: true,
        data: {
          ...result,
          products: normalizeImagesList(result.products),
        },
      });
    }
  );

  /**
   * Get supplier's low stock products
   * GET /api/v1/products/low-stock?threshold=10&storeId=...
   */
  getLowStock = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const threshold = req.query.threshold
      ? parseInt(req.query.threshold as string, 10)
      : 10;
    const storeId = (req.query.storeId as string | undefined) || undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const products = await productService.getLowStockProducts(userId, {
      threshold: Number.isFinite(threshold) ? threshold : 10,
      storeId,
      limit: Number.isFinite(limit as number) ? (limit as number) : undefined,
    });

    res.json({
      success: true,
      data: normalizeImagesList(products),
    });
  });

  /**
   * Update product stock
   * PATCH /api/v1/products/:id/stock
   */
  updateStock = asyncHandler(
    async (
      req: Request<UpdateStockInput['params'], {}, UpdateStockInput['body']>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { quantityChange } = req.body;

      const product = await productService.updateStock(
        userId,
        id,
        quantityChange
      );

      logger.info('Product stock updated via API', {
        userId,
        productId: id,
        quantityChange,
      });

      res.json({
        success: true,
        message: 'Stock mis à jour avec succès',
        data: normalizeImages(product),
      });
    }
  );

  /**
   * Upload product images
   * POST /api/v1/products/:id/images
   */
  uploadImages = asyncHandler(
    async (req: Request<UploadImagesInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        throw new AppError(400, 'Aucune image fournie', 'NO_FILES');
      }

      const filesData = files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
      }));

      const imageUrls = await productService.uploadImages(
        userId,
        id,
        filesData
      );

      logger.info('Product images uploaded via API', {
        userId,
        productId: id,
        count: imageUrls.length,
      });

      res.json({
        success: true,
        message: 'Images téléchargées avec succès',
        data: { imageUrls, count: imageUrls.length },
      });
    }
  );

  /**
   * Delete product image
   * DELETE /api/v1/products/:id/images
   */
  deleteImage = asyncHandler(
    async (
      req: Request<DeleteImageInput['params'], {}, DeleteImageInput['body']>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { imageUrl } = req.body;

      await productService.deleteImage(userId, id, imageUrl);

      logger.info('Product image deleted via API', {
        userId,
        productId: id,
        imageUrl,
      });

      res.json({
        success: true,
        message: 'Image supprimée avec succès',
      });
    }
  );

  /**
   * Update product stock settings (minStock/maxStock)
   * PUT /api/v1/products/:id/settings
   */
  updateProductSettings = asyncHandler(
    async (
      req: Request<
        UpdateProductSettingsInput['params'],
        {},
        UpdateProductSettingsInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { minStock, maxStock } = req.body;

      const product = await productService.updateSettings(userId, id, {
        minStock,
        maxStock,
      });

      logger.info('Product settings updated via API', {
        userId,
        productId: id,
      });

      res.json({
        success: true,
        message: 'Paramètres de stock mis à jour',
        data: normalizeImages(product),
      });
    }
  );

  /**
   * Toggle product status
   * PATCH /api/v1/products/:id/toggle-status
   */
  toggleStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    const product = await productService.toggleProductStatus(userId, id);

    logger.info('Product status toggled via API', {
      userId,
      productId: id,
      newStatus: product.status,
    });

    res.json({
      success: true,
      message: 'Statut du produit modifié avec succès',
      data: normalizeImages(product),
    });
  });
}

export default new ProductController();
