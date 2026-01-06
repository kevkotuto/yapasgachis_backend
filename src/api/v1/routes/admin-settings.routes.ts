import { Router } from 'express';

import * as settingsController from '@/api/v1/controllers/platform-settings.controller';
import {
  updateSettingsSchema,
  getAuditHistorySchema,
} from '@/api/v1/validators/platform-settings.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import { asyncHandler } from '@/utils/helpers';

const router = Router();

// Toutes les routes requièrent authentification + rôle ADMIN ou SUPER_ADMIN
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Récupérer tous les paramètres de la plateforme
 * @access  Admin
 */
router.get('/', asyncHandler(settingsController.getSettings));

/**
 * @route   PATCH /api/v1/admin/settings
 * @desc    Mettre à jour les paramètres de la plateforme
 * @access  Admin
 */
router.patch(
  '/',
  validate(updateSettingsSchema),
  asyncHandler(settingsController.updateSettings)
);

/**
 * @route   GET /api/v1/admin/settings/audit
 * @desc    Récupérer l'historique des modifications
 * @access  Admin
 */
router.get(
  '/audit',
  validate(getAuditHistorySchema),
  asyncHandler(settingsController.getAuditHistory)
);

/**
 * @route   GET /api/v1/admin/settings/business
 * @desc    Récupérer les paramètres business (commission, livraison)
 * @access  Admin
 */
router.get('/business', asyncHandler(settingsController.getBusinessSettings));

/**
 * @route   GET /api/v1/admin/settings/wave
 * @desc    Récupérer les paramètres Wave (frais paiement/transfert)
 * @access  Admin
 */
router.get('/wave', asyncHandler(settingsController.getWaveSettings));

/**
 * @route   GET /api/v1/admin/settings/features
 * @desc    Récupérer les feature flags
 * @access  Admin
 */
router.get('/features', asyncHandler(settingsController.getFeatureFlags));

/**
 * @route   POST /api/v1/admin/settings/invalidate-cache
 * @desc    Invalider le cache des paramètres (debug)
 * @access  Super Admin
 */
router.post(
  '/invalidate-cache',
  requireRole(['SUPER_ADMIN']),
  asyncHandler(settingsController.invalidateCache)
);

export default router;
