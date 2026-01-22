import { Request, Response } from 'express';

import {
  CreateDealOptionInput,
  UpdateDealOptionInput,
  ReorderDealOptionsInput,
} from '../validators/deal-option.validator';

import dealOptionService from '@/core/services/deal-option.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Deal Option Controller
 * Handles deal option-related HTTP requests
 */
export class DealOptionController {
  /**
   * Create a deal option
   * POST /api/v1/deal-options
   */
  createDealOption = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const body = req.body as CreateDealOptionInput;

    const option = await dealOptionService.createDealOption(supplierId, body);

    logger.info('Deal option created via API', {
      supplierId,
      optionId: option.id,
      dealId: body.dealId,
    });

    res.status(201).json({
      success: true,
      message: 'Option créée avec succès',
      data: { option },
    });
  });

  /**
   * Get all options for a deal
   * GET /api/v1/deal-options/deal/:dealId
   */
  getDealOptions = asyncHandler(async (req: Request, res: Response) => {
    const { dealId } = req.params;
    const { activeOnly } = req.query as { activeOnly?: string };

    const options = await dealOptionService.getDealOptions(
      dealId,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: { options },
    });
  });

  /**
   * Get a single option
   * GET /api/v1/deal-options/:id
   */
  getDealOption = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const option = await dealOptionService.getDealOption(id);

    res.json({
      success: true,
      data: { option },
    });
  });

  /**
   * Update a deal option
   * PUT /api/v1/deal-options/:id
   */
  updateDealOption = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateDealOptionInput>,
      res: Response
    ) => {
      const supplierId = req.user.id;
      const { id } = req.params;

      const option = await dealOptionService.updateDealOption(
        supplierId,
        id,
        req.body
      );

      logger.info('Deal option updated via API', {
        supplierId,
        optionId: id,
      });

      res.json({
        success: true,
        message: 'Option mise à jour avec succès',
        data: { option },
      });
    }
  );

  /**
   * Delete a deal option
   * DELETE /api/v1/deal-options/:id
   */
  deleteDealOption = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const supplierId = req.user.id;
      const { id } = req.params;

      await dealOptionService.deleteDealOption(supplierId, id);

      logger.info('Deal option deleted via API', {
        supplierId,
        optionId: id,
      });

      res.json({
        success: true,
        message: 'Option supprimée avec succès',
      });
    }
  );

  /**
   * Reorder deal options
   * PATCH /api/v1/deal-options/deal/:dealId/reorder
   */
  reorderDealOptions = asyncHandler(
    async (
      req: Request<{ dealId: string }, {}, ReorderDealOptionsInput>,
      res: Response
    ) => {
      const supplierId = req.user.id;
      const { dealId } = req.params;
      const { optionIds } = req.body;

      const options = await dealOptionService.reorderDealOptions(
        supplierId,
        dealId,
        optionIds
      );

      logger.info('Deal options reordered via API', {
        supplierId,
        dealId,
      });

      res.json({
        success: true,
        message: 'Options réordonnées avec succès',
        data: { options },
      });
    }
  );

  /**
   * Check option availability
   * GET /api/v1/deal-options/:id/availability
   */
  checkAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity } = req.query as { quantity?: string };

    const result = await dealOptionService.checkAvailability(
      id,
      parseInt(quantity || '1', 10)
    );

    res.json({
      success: true,
      data: result,
    });
  });
}

export default new DealOptionController();
