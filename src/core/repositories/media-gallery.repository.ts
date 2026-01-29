/**
 * Media Gallery Repository - DEPRECATED
 *
 * NOTE: The Media model does not exist in the Prisma schema.
 * Images are stored as JSON arrays directly on entity models:
 * - Product.images
 * - Deal.images
 * - SupplierStore.images
 * - DealRoom.images
 * - Review.images
 *
 * If you need to implement media management, consider:
 * 1. Creating a Media model in the Prisma schema
 * 2. Or use JSON array manipulation directly on the entity models
 *
 * This file has been commented out to prevent TypeScript compilation errors.
 */

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export class MediaGalleryRepository {
  // Placeholder - implement when Media model is added to schema
}

export default new MediaGalleryRepository();
