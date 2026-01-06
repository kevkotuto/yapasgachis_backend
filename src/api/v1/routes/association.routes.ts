import { Router } from 'express';
import associationController from '@/api/v1/controllers/association.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  registerAssociationSchema,
  updateAssociationSchema,
  associationIdParamSchema,
  searchAssociationsSchema,
  nearbyAssociationsSchema,
  createReportSchema,
  getReportsSchema,
} from '@/api/v1/validators/association.validator';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Search associations
router.get(
  '/',
  validate(searchAssociationsSchema),
  associationController.search
);

// Get all verified associations
router.get('/verified', associationController.getAllVerified);

// Get nearby associations
router.get(
  '/nearby',
  validate(nearbyAssociationsSchema),
  associationController.getNearby
);

// Get association by ID
router.get(
  '/:associationId',
  validate(associationIdParamSchema),
  associationController.getById
);

// Get association reports (public)
router.get(
  '/:associationId/reports',
  validate(getReportsSchema),
  associationController.getReports
);

// ==================== ASSOCIATION USER ROUTES ====================

// Register association profile
router.post(
  '/register',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(registerAssociationSchema),
  associationController.register
);

// Get my association profile
router.get(
  '/me',
  authenticate,
  requireRole(['ASSOCIATION']),
  associationController.getProfile
);

// Update my association profile
router.put(
  '/me',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(updateAssociationSchema),
  associationController.updateProfile
);

// Create report
router.post(
  '/me/reports',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(createReportSchema),
  associationController.createReport
);

// Get my reports
router.get(
  '/me/reports',
  authenticate,
  requireRole(['ASSOCIATION']),
  associationController.getMyReports
);

export default router;
