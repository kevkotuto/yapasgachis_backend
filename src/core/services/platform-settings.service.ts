import { PlatformSettings } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import cacheService from '@/infrastructure/database/redis/cache.service';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Platform Settings Service
 * Gère les paramètres de la plateforme modifiables par l'admin
 *
 * Les paramètres sont stockés dans une seule ligne de la table platform_settings
 * avec l'ID "default". Les valeurs sont cachées dans Redis pour performance.
 */

const SETTINGS_CACHE_KEY = 'platform:settings';
const SETTINGS_CACHE_TTL = 300; // 5 minutes

export interface PlatformSettingsUpdate {
  // Business
  defaultCommissionRate?: number;
  premiumCommissionRate?: number;
  defaultDeliveryFee?: number;
  deliveryFeePerKm?: number;
  maxDeliveryDistance?: number;

  // Payment Fees
  wavePaymentFeeRate?: number;
  waveTransferFeeRate?: number;

  // Features
  graphqlEnabled?: boolean;
  websocketEnabled?: boolean;
  analyticsEnabled?: boolean;
  notificationsEnabled?: boolean;

  // Rate Limiting
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  authRateLimitMaxRequests?: number;

  // Security
  bcryptRounds?: number;
  otpExpiration?: number;
  otpLength?: number;

  // Cache TTL
  cacheTtlShort?: number;
  cacheTtlMedium?: number;
  cacheTtlLong?: number;

  // Pagination
  defaultPageSize?: number;
  maxPageSize?: number;

  // Upload
  maxFileSize?: number;
}

export class PlatformSettingsService {
  private static instance: PlatformSettingsService;

  private constructor() {}

  static getInstance(): PlatformSettingsService {
    if (!PlatformSettingsService.instance) {
      PlatformSettingsService.instance = new PlatformSettingsService();
    }
    return PlatformSettingsService.instance;
  }

  /**
   * Récupérer les paramètres de la plateforme
   * Utilise le cache Redis si disponible
   */
  async getSettings(): Promise<PlatformSettings> {
    try {
      // Essayer de récupérer depuis le cache
      const cached = await cacheService.get<PlatformSettings>(SETTINGS_CACHE_KEY);
      if (cached) {
        return cached;
      }

      // Récupérer depuis la base de données
      let settings = await prisma.platformSettings.findUnique({
        where: { id: 'default' },
      });

      // Si pas de settings, créer les valeurs par défaut
      if (!settings) {
        settings = await prisma.platformSettings.create({
          data: { id: 'default' },
        });
        logger.info('Platform settings initialized with defaults');
      }

      // Mettre en cache
      await cacheService.set(SETTINGS_CACHE_KEY, settings, SETTINGS_CACHE_TTL);

      return settings;
    } catch (error) {
      logger.error('Failed to get platform settings', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mettre à jour les paramètres de la plateforme
   * Enregistre l'audit trail et invalide le cache
   */
  async updateSettings(
    updates: PlatformSettingsUpdate,
    adminId: string,
    reason?: string
  ): Promise<PlatformSettings> {
    try {
      // Récupérer les anciennes valeurs
      const oldSettings = await this.getSettings();

      // Préparer les données de mise à jour (filtrer les undefined)
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      // Mettre à jour les paramètres
      const newSettings = await prisma.platformSettings.update({
        where: { id: 'default' },
        data: {
          ...updateData,
          updatedById: adminId,
        } as any,
      });

      // Enregistrer l'audit trail pour chaque changement
      const auditPromises = [];
      for (const [key, newValue] of Object.entries(updateData)) {
        if (key === 'updatedById') continue;

        const oldValue = (oldSettings as any)[key];
        if (oldValue !== newValue) {
          auditPromises.push(
            prisma.platformSettingsAudit.create({
              data: {
                settingKey: key,
                oldValue: JSON.stringify(oldValue),
                newValue: JSON.stringify(newValue),
                changedById: adminId,
                reason,
              },
            })
          );
        }
      }

      await Promise.all(auditPromises);

      // Invalider le cache
      await cacheService.delete(SETTINGS_CACHE_KEY);

      logger.info('Platform settings updated', {
        adminId,
        changes: Object.keys(updateData),
        reason,
      });

      return newSettings;
    } catch (error) {
      logger.error('Failed to update platform settings', {
        error: (error as Error).message,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Récupérer l'historique des modifications
   */
  async getAuditHistory(params: {
    settingKey?: string;
    adminId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    audits: any[];
    total: number;
    pages: number;
  }> {
    const { settingKey, adminId, startDate, endDate, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(settingKey && { settingKey }),
      ...(adminId && { changedById: adminId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [audits, total] = await Promise.all([
      prisma.platformSettingsAudit.findMany({
        where,
        include: {
          changedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.platformSettingsAudit.count({ where }),
    ]);

    return {
      audits,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une valeur spécifique
   */
  async getValue<K extends keyof PlatformSettings>(
    key: K
  ): Promise<PlatformSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Récupérer les paramètres business (pour order.service.ts)
   */
  async getBusinessSettings(): Promise<{
    defaultCommissionRate: number;
    premiumCommissionRate: number;
    defaultDeliveryFee: number;
    deliveryFeePerKm: number;
    maxDeliveryDistance: number;
  }> {
    const settings = await this.getSettings();
    return {
      defaultCommissionRate: settings.defaultCommissionRate,
      premiumCommissionRate: settings.premiumCommissionRate,
      defaultDeliveryFee: settings.defaultDeliveryFee,
      deliveryFeePerKm: settings.deliveryFeePerKm,
      maxDeliveryDistance: settings.maxDeliveryDistance,
    };
  }

  /**
   * Récupérer les paramètres Wave (pour escrow.service.ts)
   */
  async getWaveSettings(): Promise<{
    wavePaymentFeeRate: number;
    waveTransferFeeRate: number;
  }> {
    const settings = await this.getSettings();
    return {
      wavePaymentFeeRate: settings.wavePaymentFeeRate,
      waveTransferFeeRate: settings.waveTransferFeeRate,
    };
  }

  /**
   * Récupérer les feature flags
   */
  async getFeatureFlags(): Promise<{
    graphqlEnabled: boolean;
    websocketEnabled: boolean;
    analyticsEnabled: boolean;
    notificationsEnabled: boolean;
  }> {
    const settings = await this.getSettings();
    return {
      graphqlEnabled: settings.graphqlEnabled,
      websocketEnabled: settings.websocketEnabled,
      analyticsEnabled: settings.analyticsEnabled,
      notificationsEnabled: settings.notificationsEnabled,
    };
  }

  /**
   * Invalider le cache (utile pour les tests)
   */
  async invalidateCache(): Promise<void> {
    await cacheService.delete(SETTINGS_CACHE_KEY);
  }
}

export default PlatformSettingsService.getInstance();
