import { Router } from 'express';

import supplierStoreController from '@/api/v1/controllers/supplier-store.controller';
import {
  createStoreSchema,
  updateStoreSchema,
  storeIdParamSchema,
  setTemporaryClosureSchema,
} from '@/api/v1/validators/supplier-store.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import {
  uploadImages,
  handleUploadError,
  requireFiles,
} from '@/middleware/upload.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require supplier authentication
router.use(authenticate);
router.use(requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']));

// ==================== STORE MANAGEMENT ====================

// Get supplier's stores
router.get('/', supplierStoreController.getSupplierStores);

// Create a store
router.post(
  '/',
  validate(createStoreSchema),
  supplierStoreController.createStore
);

// Update a store
router.put(
  '/:storeId',
  validate(updateStoreSchema),
  supplierStoreController.updateStore
);

// Delete a store
router.delete(
  '/:storeId',
  validate(storeIdParamSchema),
  supplierStoreController.deleteStore
);

// Get store statistics
router.get(
  '/:storeId/statistics',
  validate(storeIdParamSchema),
  supplierStoreController.getStoreStatistics
);

// Set temporary closure
router.post(
  '/:storeId/temporary-closure',
  validate(setTemporaryClosureSchema),
  supplierStoreController.setTemporaryClosure
);

// Toggle store active status
router.post(
  '/:storeId/toggle-active',
  validate(storeIdParamSchema),
  supplierStoreController.toggleStoreActive
);

// Upload store images
router.post(
  '/:storeId/images',
  uploadImages,
  handleUploadError,
  requireFiles('images'),
  validate(storeIdParamSchema),
  supplierStoreController.uploadImages
);

// Delete store image
router.delete(
  '/:storeId/images',
  validate(storeIdParamSchema),
  supplierStoreController.deleteImage
);

export default router;
