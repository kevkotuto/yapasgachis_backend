import { Request, Response, NextFunction } from 'express';

import { AppError } from './error-handler.middleware';

import { APP_CONSTANTS } from '@/utils/constants';

// Define UserRole type from Prisma schema
type UserRole =
  | 'CLIENT'
  | 'SUPPLIER_FOOD'
  | 'SUPPLIER_DEALS'
  | 'ASSOCIATION'
  | 'ADVERTISER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

// Export UserRole values for use in middleware
const UserRole = {
  CLIENT: 'CLIENT' as const,
  SUPPLIER_FOOD: 'SUPPLIER_FOOD' as const,
  SUPPLIER_DEALS: 'SUPPLIER_DEALS' as const,
  ASSOCIATION: 'ASSOCIATION' as const,
  ADVERTISER: 'ADVERTISER' as const,
  ADMIN: 'ADMIN' as const,
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
};

/**
 * Role guard middleware factory
 * Creates a middleware that checks if user has required role(s)
 */
export const roleGuard = (allowedRoles: UserRole | UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Authentification requise',
        APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
      );
    }

    // Normalize to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource",
        APP_CONSTANTS.ERROR_CODES.FORBIDDEN
      );
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = roleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Supplier only middleware (food or deals)
 */
export const supplierOnly = roleGuard([
  UserRole.SUPPLIER_FOOD,
  UserRole.SUPPLIER_DEALS,
]);

/**
 * Food supplier only middleware
 */
export const foodSupplierOnly = roleGuard(UserRole.SUPPLIER_FOOD);

/**
 * Deals supplier only middleware
 */
export const dealsSupplierOnly = roleGuard(UserRole.SUPPLIER_DEALS);

/**
 * Association only middleware
 */
export const associationOnly = roleGuard(UserRole.ASSOCIATION);

/**
 * Advertiser only middleware
 */
export const advertiserOnly = roleGuard(UserRole.ADVERTISER);

/**
 * Client only middleware
 */
export const clientOnly = roleGuard(UserRole.CLIENT);

/**
 * Owner or admin middleware
 * Checks if user is the owner of the resource or an admin
 */
export const ownerOrAdmin = (getOwnerId: (req: Request) => string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
        'Authentification requise',
        APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
      );
    }

    const ownerId = getOwnerId(req);
    const isOwner = req.user.id === ownerId;
    const isAdmin = (
      [UserRole.ADMIN, UserRole.SUPER_ADMIN] as string[]
    ).includes(req.user.role);

    if (!isOwner && !isAdmin) {
      throw new AppError(
        APP_CONSTANTS.HTTP_STATUS.FORBIDDEN,
        "Vous ne pouvez accéder qu'à vos propres ressources",
        APP_CONSTANTS.ERROR_CODES.FORBIDDEN
      );
    }

    next();
  };
};

// Alias for roleGuard (used in routes)
export const requireRole = (roles: string[]) => roleGuard(roles as UserRole[]);
export const requireRoles = requireRole; // Another alias

export default roleGuard;
