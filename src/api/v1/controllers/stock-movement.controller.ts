import { Request, Response } from 'express';

import {
  CreateStockMovementInput,
  ListStockMovementsInput,
  GetProductHistoryInput,
  GetStoreMovementsInput,
} from '../validators/stock-movement.validator';

import stockMovementService from '@/core/services/stock-movement.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Stock Movement Controller
 * Handles stock movement-related HTTP requests
 */
export class StockMovementController {
  /**
   * Create stock movement
   * POST /api/v1/supplier/stock-movements
   */
  createMovement = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateStockMovementInput;

    const movement = await stockMovementService.createMovement(
      userId,
      body as Required<CreateStockMovementInput>
    );

    logger.info('Stock movement created via API', {
      userId,
      movementId: movement.id,
      productId: body.productId,
      type: body.type,
    });

    res.status(201).json({
      success: true,
      message: 'Mouvement de stock créé avec succès',
      data: { movement },
    });
  });

  /**
   * List stock movements with filters
   * GET /api/v1/supplier/stock-movements
   */
  listMovements = asyncHandler(
    async (
      req: Request<{}, {}, {}, ListStockMovementsInput>,
      res: Response
    ) => {
      const userId = req.user.id;
      const filters = req.query as ListStockMovementsInput;

      const result = await stockMovementService.getMovements(userId, filters);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get product stock history
   * GET /api/v1/supplier/products/:productId/stock-movements
   */
  getProductHistory = asyncHandler(
    async (
      req: Request<
        GetProductHistoryInput['params'],
        {},
        {},
        GetProductHistoryInput['query']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { productId } = req.params;
      const { page, limit } = req.query;

      const result = await stockMovementService.getProductHistory(
        userId,
        productId,
        { page, limit }
      );

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get store stock movements
   * GET /api/v1/supplier/stores/:storeId/stock-movements
   */
  getStoreMovements = asyncHandler(
    async (
      req: Request<
        GetStoreMovementsInput['params'],
        {},
        {},
        GetStoreMovementsInput['query']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { storeId } = req.params;
      const filters = req.query as GetStoreMovementsInput['query'];

      const result = await stockMovementService.getStoreMovements(
        userId,
        storeId,
        filters
      );

      res.json({
        success: true,
        data: result,
      });
    }
  );
}

export default new StockMovementController();
