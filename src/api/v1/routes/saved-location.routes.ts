import { Router } from 'express';

import savedLocationController from '../controllers/saved-location.controller';
import {
  createSavedLocationSchema,
  updateSavedLocationSchema,
  getSavedLocationByIdSchema,
  deleteSavedLocationSchema,
  setDefaultLocationSchema,
} from '../validators/saved-location.validator';

import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * SavedLocation Routes
 * Base path: /api/v1/saved-locations
 * All routes require authentication
 */

// ==================== PROTECTED ROUTES ====================

/**
 * Get default location
 * GET /default
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get(
  '/default',
  authMiddleware,
  savedLocationController.getDefaultLocation
);

/**
 * Get all saved locations for the authenticated user
 * GET /
 */
router.get('/', authMiddleware, savedLocationController.getSavedLocations);

/**
 * Create saved location
 * POST /
 */
router.post(
  '/',
  authMiddleware,
  validate(createSavedLocationSchema),
  savedLocationController.createSavedLocation
);

/**
 * Update saved location
 * PATCH /:id
 */
router.patch(
  '/:id',
  authMiddleware,
  validate(updateSavedLocationSchema),
  savedLocationController.updateSavedLocation
);

/**
 * Delete saved location
 * DELETE /:id
 */
router.delete(
  '/:id',
  authMiddleware,
  validate(deleteSavedLocationSchema),
  savedLocationController.deleteSavedLocation
);

/**
 * Set location as default
 * PATCH /:id/set-default
 */
router.patch(
  '/:id/set-default',
  authMiddleware,
  validate(setDefaultLocationSchema),
  savedLocationController.setDefaultLocation
);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

/**
 * Get saved location by ID
 * GET /:id
 * NOTE: Must be last to avoid capturing static routes like /default
 */
router.get(
  '/:id',
  authMiddleware,
  validate(getSavedLocationByIdSchema),
  savedLocationController.getSavedLocation
);

export default router;
