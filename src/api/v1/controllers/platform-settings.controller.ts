import { Request, Response } from 'express';

import platformSettingsService from '@/core/services/platform-settings.service';

/**
 * Platform Settings Controller
 * Gère les endpoints admin pour les paramètres de la plateforme
 */

/**
 * GET /api/v1/admin/settings
 * Récupérer tous les paramètres de la plateforme
 */
export const getSettings = async (req: Request, res: Response) => {
  const settings = await platformSettingsService.getSettings();

  // Masquer les champs techniques
  const { id, updatedById, createdAt, updatedAt, ...publicSettings } = settings;

  res.json({
    success: true,
    data: {
      settings: publicSettings,
      lastUpdatedAt: updatedAt,
    },
  });
};

/**
 * PATCH /api/v1/admin/settings
 * Mettre à jour les paramètres de la plateforme
 */
export const updateSettings = async (req: Request, res: Response) => {
  const adminId = req.user!.id;
  const { reason, ...updates } = req.body;

  const settings = await platformSettingsService.updateSettings(
    updates,
    adminId,
    reason
  );

  // Masquer les champs techniques
  const { id, updatedById, createdAt, updatedAt, ...publicSettings } = settings;

  res.json({
    success: true,
    message: 'Paramètres mis à jour avec succès',
    data: {
      settings: publicSettings,
      lastUpdatedAt: updatedAt,
    },
  });
};

/**
 * GET /api/v1/admin/settings/audit
 * Récupérer l'historique des modifications
 */
export const getAuditHistory = async (req: Request, res: Response) => {
  const { settingKey, adminId, startDate, endDate, page, limit } = req.query;

  const result = await platformSettingsService.getAuditHistory({
    settingKey: settingKey as string,
    adminId: adminId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /api/v1/admin/settings/business
 * Récupérer uniquement les paramètres business
 */
export const getBusinessSettings = async (req: Request, res: Response) => {
  const settings = await platformSettingsService.getBusinessSettings();

  res.json({
    success: true,
    data: settings,
  });
};

/**
 * GET /api/v1/admin/settings/wave
 * Récupérer uniquement les paramètres Wave
 */
export const getWaveSettings = async (req: Request, res: Response) => {
  const settings = await platformSettingsService.getWaveSettings();

  res.json({
    success: true,
    data: settings,
  });
};

/**
 * GET /api/v1/admin/settings/features
 * Récupérer uniquement les feature flags
 */
export const getFeatureFlags = async (req: Request, res: Response) => {
  const settings = await platformSettingsService.getFeatureFlags();

  res.json({
    success: true,
    data: settings,
  });
};

/**
 * POST /api/v1/admin/settings/invalidate-cache
 * Invalider le cache des paramètres (utile pour debug)
 */
export const invalidateCache = async (req: Request, res: Response) => {
  await platformSettingsService.invalidateCache();

  res.json({
    success: true,
    message: 'Cache des paramètres invalidé',
  });
};
