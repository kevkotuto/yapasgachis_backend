// @ts-nocheck - StoreHours model deprecated
import { Request, Response } from 'express';

import {
  CreateStoreHoursInput,
  UpdateStoreHoursInput,
  CreateSpecialClosureInput,
} from '../validators/store-hours.validator';

import {
  CreateStoreHoursDTO,
  SpecialClosureDTO,
} from '@/core/interfaces/dtos/store-hours.dto';
import storeHoursService from '@/core/services/store-hours.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Store Hours Controller
 * Handles store hours-related HTTP requests
 */
export class StoreHoursController {
  /**
   * Create store hours
   * POST /api/v1/store-hours
   */
  createStoreHours = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const body = req.body as CreateStoreHoursDTO;

    const storeHours = await storeHoursService.createStoreHours(
      supplierId,
      body
    );

    logger.info('Store hours created via API', {
      supplierId,
      storeId: body.storeId,
    });

    res.status(201).json({
      success: true,
      message: 'Horaires créés avec succès',
      data: { storeHours },
    });
  });

  /**
   * Get store hours
   * GET /api/v1/store-hours/:storeId
   */
  getStoreHours = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    const storeHours = await storeHoursService.getStoreHours(storeId);

    res.json({
      success: true,
      data: { storeHours },
    });
  });

  /**
   * Update store hours
   * PUT /api/v1/store-hours/:storeId
   */
  updateStoreHours = asyncHandler(
    async (
      req: Request<{ storeId: string }, {}, UpdateStoreHoursInput>,
      res: Response
    ) => {
      const supplierId = req.user.id;
      const { storeId } = req.params;

      // @ts-expect-error - Type mismatch entre validator et service, à corriger plus tard
      const storeHours = await storeHoursService.updateStoreHours(
        supplierId,
        storeId,
        req.body
      );

      logger.info('Store hours updated via API', {
        supplierId,
        storeId,
      });

      res.json({
        success: true,
        message: 'Horaires mis à jour avec succès',
        data: { storeHours },
      });
    }
  );

  /**
   * Delete store hours
   * DELETE /api/v1/store-hours/:storeId
   */
  deleteStoreHours = asyncHandler(
    async (req: Request<{ storeId: string }>, res: Response) => {
      const supplierId = req.user.id;
      const { storeId } = req.params;

      await storeHoursService.deleteStoreHours(supplierId, storeId);

      logger.info('Store hours deleted via API', {
        supplierId,
        storeId,
      });

      res.json({
        success: true,
        message: 'Horaires supprimés avec succès',
      });
    }
  );

  /**
   * Check if store is open
   * GET /api/v1/store-hours/:storeId/is-open
   */
  isStoreOpen = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    const isOpen = await storeHoursService.isStoreOpen(storeId);

    res.json({
      success: true,
      data: { isOpen },
    });
  });

  /**
   * Create special closure
   * POST /api/v1/store-hours/:storeId/special-closure
   */
  createSpecialClosure = asyncHandler(
    async (
      req: Request<{ storeId: string }, {}, CreateSpecialClosureInput>,
      res: Response
    ) => {
      const supplierId = req.user.id;
      const { storeId } = req.params;

      const closure = await storeHoursService.createSpecialClosure(supplierId, {
        storeId,
        ...req.body,
      } as SpecialClosureDTO);

      logger.info('Special closure created via API', {
        supplierId,
        storeId,
        closureId: closure.id,
      });

      res.status(201).json({
        success: true,
        message: 'Fermeture spéciale créée',
        data: { closure },
      });
    }
  );

  /**
   * Get special closures
   * GET /api/v1/store-hours/:storeId/special-closures
   */
  getSpecialClosures = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { futureOnly } = req.query as { futureOnly?: string };

    const closures = await storeHoursService.getSpecialClosures(
      storeId,
      futureOnly !== 'false'
    );

    res.json({
      success: true,
      data: { closures },
    });
  });

  /**
   * Delete special closure
   * DELETE /api/v1/store-hours/special-closure/:closureId
   */
  deleteSpecialClosure = asyncHandler(
    async (req: Request<{ closureId: string }>, res: Response) => {
      const supplierId = req.user.id;
      const { closureId } = req.params;

      await storeHoursService.deleteSpecialClosure(supplierId, closureId);

      logger.info('Special closure deleted via API', {
        supplierId,
        closureId,
      });

      res.json({
        success: true,
        message: 'Fermeture spéciale supprimée',
      });
    }
  );
}

export default new StoreHoursController();
