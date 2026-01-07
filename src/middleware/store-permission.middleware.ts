import { Request, Response, NextFunction } from 'express';

import storeStaffService from '@/core/services/store-staff.service';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Store Permission Middleware
 * Vérifie les permissions d'un utilisateur sur un magasin
 */

type StorePermission =
  | 'canManageProducts'
  | 'canManageOrders'
  | 'canViewStats'
  | 'canManageStaff'
  | 'canManageDeals'
  | 'canManageSettings';

/**
 * Middleware pour vérifier qu'un utilisateur a une permission spécifique sur un magasin
 * Le storeId doit être dans req.params.storeId ou req.body.storeId
 */
export const requireStorePermission = (permission: StorePermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Non authentifié', 'UNAUTHORIZED');
      }

      // Récupérer le storeId depuis params ou body
      const storeId = req.params.storeId || req.body.storeId;
      if (!storeId) {
        throw new AppError(400, 'ID du magasin requis', 'STORE_ID_REQUIRED');
      }

      // Vérifier la permission
      const hasPermission = await storeStaffService.hasPermission(userId, storeId, permission);

      if (!hasPermission) {
        throw new AppError(
          403,
          `Vous n'avez pas la permission "${permission}" sur ce magasin`,
          'PERMISSION_DENIED'
        );
      }

      // Mettre à jour la dernière activité
      await storeStaffService.updateLastActive(userId, storeId).catch(() => {
        // Ignorer les erreurs de mise à jour de lastActive
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware pour vérifier qu'un utilisateur a au moins une des permissions
 */
export const requireAnyStorePermission = (permissions: StorePermission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Non authentifié', 'UNAUTHORIZED');
      }

      const storeId = req.params.storeId || req.body.storeId;
      if (!storeId) {
        throw new AppError(400, 'ID du magasin requis', 'STORE_ID_REQUIRED');
      }

      // Vérifier au moins une permission
      for (const permission of permissions) {
        const hasPermission = await storeStaffService.hasPermission(userId, storeId, permission);
        if (hasPermission) {
          await storeStaffService.updateLastActive(userId, storeId).catch(() => {});
          return next();
        }
      }

      throw new AppError(
        403,
        `Vous n'avez aucune des permissions requises sur ce magasin`,
        'PERMISSION_DENIED'
      );
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware pour vérifier qu'un utilisateur est propriétaire du supplier ou staff du magasin
 */
export const requireStoreAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Non authentifié', 'UNAUTHORIZED');
    }

    const storeId = req.params.storeId || req.body.storeId;
    if (!storeId) {
      throw new AppError(400, 'ID du magasin requis', 'STORE_ID_REQUIRED');
    }

    // Vérifier si propriétaire
    const isOwner = await storeStaffService.isStoreOwner(userId, storeId);
    if (isOwner) {
      return next();
    }

    // Vérifier si staff actif
    const roleInfo = await storeStaffService.getStaffRole(userId, storeId);
    if (roleInfo) {
      await storeStaffService.updateLastActive(userId, storeId).catch(() => {});
      return next();
    }

    throw new AppError(403, "Vous n'avez pas accès à ce magasin", 'ACCESS_DENIED');
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware qui attache les informations de rôle à la requête
 */
export const attachStoreRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const storeId = req.params.storeId || req.body.storeId;

    if (userId && storeId) {
      const roleInfo = await storeStaffService.getStaffRole(userId, storeId);
      (req as any).storeRole = roleInfo;
    }

    next();
  } catch (error) {
    // Ne pas bloquer si erreur, juste continuer sans role info
    next();
  }
};
