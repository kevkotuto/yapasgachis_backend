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
} from '../validators/product.validator';

import productService from '@/core/services/product.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { asyncHandler } from '@/utils/helpers';

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
      data: { product },
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
        data: { product },
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
        data: { product },
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
        data: result,
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
        data: { products, count: products.length },
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
        data: { products, count: products.length },
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
        data: result,
      });
    }
  );

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
        data: { product },
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
}

export default new ProductController();
