/**
 * Store Hours Repository - DEPRECATED
 *
 * NOTE: StoreHours and SpecialClosure models do not exist in the Prisma schema.
 * Store operating hours are managed directly via:
 * - SupplierStore.operatingHours (JSON field)
 *
 * If you need store hours functionality, use the SupplierStore model's operatingHours field.
 *
 * This file has been commented out to prevent TypeScript compilation errors.
 */

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export class StoreHoursRepository {
  // Placeholder - use SupplierStore.operatingHours instead
}

export default new StoreHoursRepository();
