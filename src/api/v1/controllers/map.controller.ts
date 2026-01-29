import { Request, Response } from 'express';

import { GetMarkersInput } from '../validators/map.validator';

import mapService from '@/core/services/map.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Map Controller
 * Handles map-related HTTP requests
 */
export class MapController {
  /**
   * Get map markers (products, deals, donations, stores)
   * GET /api/v1/map/markers
   */
  getMarkers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as GetMarkersInput;

    // Build filters from query params
    const filters: any = {};

    if (query.category) {
      filters.category = query.category;
    }

    if (query.type) {
      // Parse comma-separated types
      filters.type = query.type;
      filters.types = query.type
        .split(',')
        .map((t) => t.trim())
        .filter((t) => ['product', 'deal', 'donation', 'store'].includes(t));
    }

    // Build bounds filter if all coordinates are provided
    if (
      query.ne_lat !== undefined &&
      query.ne_lng !== undefined &&
      query.sw_lat !== undefined &&
      query.sw_lng !== undefined
    ) {
      // Parse and validate coordinates
      const ne_lat = parseFloat(query.ne_lat);
      const ne_lng = parseFloat(query.ne_lng);
      const sw_lat = parseFloat(query.sw_lat);
      const sw_lng = parseFloat(query.sw_lng);

      // Validate that all are valid numbers
      if (
        !isNaN(ne_lat) &&
        !isNaN(ne_lng) &&
        !isNaN(sw_lat) &&
        !isNaN(sw_lng)
      ) {
        filters.bounds = {
          ne_lat,
          ne_lng,
          sw_lat,
          sw_lng,
        };
      }
    }

    const markers = await mapService.getMapMarkers(filters);

    logger.info('Map markers retrieved via API', {
      totalMarkers: markers.length,
      filters,
    });

    res.json({
      success: true,
      data: { markers },
      meta: {
        total: markers.length,
      },
    });
  });
}

const mapController = new MapController();
export default mapController;
