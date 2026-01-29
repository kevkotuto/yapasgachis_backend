import { Request, Response } from 'express';

import {
  CreateSavedLocationInput,
  UpdateSavedLocationInput,
  GetSavedLocationByIdInput,
  DeleteSavedLocationInput,
  SetDefaultLocationInput,
} from '../validators/saved-location.validator';

import savedLocationService from '@/core/services/saved-location.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * SavedLocation Controller
 * Handles saved location-related HTTP requests
 */
export class SavedLocationController {
  /**
   * Create saved location
   * POST /api/v1/saved-locations
   */
  createSavedLocation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateSavedLocationInput;

    const location = await savedLocationService.createSavedLocation(
      userId,
      body as Required<CreateSavedLocationInput>
    );

    logger.info('Saved location created via API', {
      userId,
      locationId: location.id,
    });

    res.status(201).json({
      success: true,
      message: 'Adresse enregistrée avec succès',
      data: { location },
    });
  });

  /**
   * Get all saved locations for the authenticated user
   * GET /api/v1/saved-locations
   */
  getSavedLocations = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const locations = await savedLocationService.getUserSavedLocations(userId);

    res.json({
      success: true,
      data: {
        locations,
        count: locations.length,
      },
    });
  });

  /**
   * Get saved location by ID
   * GET /api/v1/saved-locations/:id
   */
  getSavedLocation = asyncHandler(
    async (req: Request<GetSavedLocationByIdInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      const location = await savedLocationService.getSavedLocation(userId, id);

      res.json({
        success: true,
        data: { location },
      });
    }
  );

  /**
   * Update saved location
   * PATCH /api/v1/saved-locations/:id
   */
  updateSavedLocation = asyncHandler(
    async (
      req: Request<
        UpdateSavedLocationInput['params'],
        {},
        UpdateSavedLocationInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;

      const location = await savedLocationService.updateSavedLocation(
        userId,
        id,
        req.body
      );

      logger.info('Saved location updated via API', {
        userId,
        locationId: id,
      });

      res.json({
        success: true,
        message: 'Adresse mise à jour avec succès',
        data: { location },
      });
    }
  );

  /**
   * Delete saved location
   * DELETE /api/v1/saved-locations/:id
   */
  deleteSavedLocation = asyncHandler(
    async (req: Request<DeleteSavedLocationInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      await savedLocationService.deleteSavedLocation(userId, id);

      logger.info('Saved location deleted via API', {
        userId,
        locationId: id,
      });

      res.json({
        success: true,
        message: 'Adresse supprimée avec succès',
      });
    }
  );

  /**
   * Set location as default
   * PATCH /api/v1/saved-locations/:id/set-default
   */
  setDefaultLocation = asyncHandler(
    async (req: Request<SetDefaultLocationInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      const location = await savedLocationService.setDefaultLocation(
        userId,
        id
      );

      logger.info('Default location set via API', {
        userId,
        locationId: id,
      });

      res.json({
        success: true,
        message: 'Adresse définie comme adresse par défaut',
        data: { location },
      });
    }
  );

  /**
   * Get default location
   * GET /api/v1/saved-locations/default
   */
  getDefaultLocation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const location = await savedLocationService.getDefaultLocation(userId);

    if (!location) {
      res.json({
        success: true,
        message: "Aucune adresse par défaut n'est définie",
        data: { location: null },
      });
      return;
    }

    res.json({
      success: true,
      data: { location },
    });
  });
}

export default new SavedLocationController();
