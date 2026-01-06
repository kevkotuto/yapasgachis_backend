import { Router } from 'express';

import supplierStoreController from '@/api/v1/controllers/supplier-store.controller';
import {
  storeIdParamSchema,
  searchStoresSchema,
} from '@/api/v1/validators/supplier-store.validator';
import { optionalAuthenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Search stores
router.get(
  '/',
  validate(searchStoresSchema),
  supplierStoreController.searchStores
);

// Get nearby stores
router.get('/nearby', supplierStoreController.getNearbyStores);

// Get store by ID
router.get(
  '/:storeId',
  validate(storeIdParamSchema),
  supplierStoreController.getStoreById
);

export default router;
