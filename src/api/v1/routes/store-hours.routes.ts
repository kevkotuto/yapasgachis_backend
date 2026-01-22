import { Router } from 'express';

import storeHoursController from '@/api/v1/controllers/store-hours.controller';
import {
  createStoreHoursSchema,
  updateStoreHoursSchema,
  storeIdParamSchema,
  createSpecialClosureSchema,
  specialClosuresQuerySchema,
  closureIdParamSchema,
} from '@/api/v1/validators/store-hours.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get store hours
router.get(
  '/:storeId',
  validate(storeIdParamSchema),
  storeHoursController.getStoreHours
);

// Check if store is open
router.get(
  '/:storeId/is-open',
  validate(storeIdParamSchema),
  storeHoursController.isStoreOpen
);

// Get special closures
router.get(
  '/:storeId/special-closures',
  validate(specialClosuresQuerySchema),
  storeHoursController.getSpecialClosures
);

// ==================== SUPPLIER ROUTES ====================

// Create store hours
router.post(
  '/',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(createStoreHoursSchema),
  storeHoursController.createStoreHours
);

// Update store hours
router.put(
  '/:storeId',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(updateStoreHoursSchema),
  storeHoursController.updateStoreHours
);

// Delete store hours
router.delete(
  '/:storeId',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(storeIdParamSchema),
  storeHoursController.deleteStoreHours
);

// Create special closure
router.post(
  '/:storeId/special-closure',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(createSpecialClosureSchema),
  storeHoursController.createSpecialClosure
);

// Delete special closure
router.delete(
  '/special-closure/:closureId',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(closureIdParamSchema),
  storeHoursController.deleteSpecialClosure
);

export default router;
