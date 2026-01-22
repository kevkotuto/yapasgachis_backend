import { Router } from 'express';

import posController from '@/api/v1/controllers/point-of-sale.controller';
import {
  createPOSSchema,
  updatePOSSchema,
  posIdSchema,
  supplierIdSchema,
  searchPOSSchema,
  findNearestSchema,
} from '@/api/v1/validators/point-of-sale.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

router.get('/:id', validate(posIdSchema), posController.getPOS);
router.get(
  '/supplier/:supplierId',
  validate(supplierIdSchema),
  posController.getSupplierPOS
);
router.get('/search', validate(searchPOSSchema), posController.searchPOS);
router.get('/nearest', validate(findNearestSchema), posController.findNearest);

// ==================== SUPPLIER ROUTES ====================

router.post(
  '/',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(createPOSSchema),
  posController.createPOS
);

router.get('/my', authenticate, posController.getMyPOS);

router.put(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(updatePOSSchema),
  posController.updatePOS
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(posIdSchema),
  posController.deletePOS
);

export default router;
