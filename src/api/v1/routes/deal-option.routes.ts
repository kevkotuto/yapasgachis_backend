import { Router } from 'express';

import dealOptionController from '@/api/v1/controllers/deal-option.controller';
import {
  createDealOptionSchema,
  updateDealOptionSchema,
  dealIdParamSchema,
  optionIdParamSchema,
  checkAvailabilitySchema,
  reorderDealOptionsSchema,
} from '@/api/v1/validators/deal-option.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get all options for a deal
router.get(
  '/deal/:dealId',
  validate(dealIdParamSchema),
  dealOptionController.getDealOptions
);

// Get a single option
router.get(
  '/:id',
  validate(optionIdParamSchema),
  dealOptionController.getDealOption
);

// Check option availability
router.get(
  '/:id/availability',
  validate(checkAvailabilitySchema),
  dealOptionController.checkAvailability
);

// ==================== SUPPLIER ROUTES ====================

// Create a deal option
router.post(
  '/',
  authenticate,
  requireRole(['SUPPLIER_DEALS']),
  validate(createDealOptionSchema),
  dealOptionController.createDealOption
);

// Update a deal option
router.put(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_DEALS']),
  validate(updateDealOptionSchema),
  dealOptionController.updateDealOption
);

// Delete a deal option
router.delete(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_DEALS']),
  validate(optionIdParamSchema),
  dealOptionController.deleteDealOption
);

// Reorder deal options
router.patch(
  '/deal/:dealId/reorder',
  authenticate,
  requireRole(['SUPPLIER_DEALS']),
  validate(reorderDealOptionsSchema),
  dealOptionController.reorderDealOptions
);

export default router;
