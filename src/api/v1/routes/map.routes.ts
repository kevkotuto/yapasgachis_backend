import { Router } from 'express';

import mapController from '../controllers/map.controller';
import { getMarkersSchema } from '../validators/map.validator';

import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Map Routes
 * Base path: /api/v1/map
 */

// ==================== PUBLIC ROUTES ====================

/**
 * Get map markers (products, deals, donations, and stores)
 * GET /markers
 * Query params:
 *   - category?: ProductCategory | 'STORE' - Filter by category
 *   - type?: string - Filter by marker type (product, deal, donation, store) - comma-separated for multiple
 *   - ne_lat?: number - Northeast corner latitude (requires all bounds)
 *   - ne_lng?: number - Northeast corner longitude (requires all bounds)
 *   - sw_lat?: number - Southwest corner latitude (requires all bounds)
 *   - sw_lng?: number - Southwest corner longitude (requires all bounds)
 */
router.get('/markers', validate(getMarkersSchema), mapController.getMarkers);

export default router;
