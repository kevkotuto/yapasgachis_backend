import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import SearchHistoryService from '@/core/services/search-history.service';
import GlobalSearchService from '@/core/services/global-search.service';
import {
  SaveSearchInput,
  GetRecentSearchesInput,
  GetSearchSuggestionsInput,
  GetTrendingSearchesInput,
  DeleteSearchHistoryInput,
  MarkSearchClickedInput,
  GlobalSearchInput,
} from '@/api/v1/validators/search-history.validator';
import { asyncHandler } from '@/utils/helpers';

const prisma = new PrismaClient();
const searchHistoryService = new SearchHistoryService(prisma);
const globalSearchService = new GlobalSearchService(prisma);

class SearchHistoryController {
  /**
   * POST /api/v1/search/save
   * Save a search query
   */
  saveSearch = asyncHandler(
    async (
      req: Request<{}, {}, SaveSearchInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user?.id; // Optional, pour les utilisateurs connectés
      const { query, type, filters, resultCount, clicked } = req.body;

      const search = await searchHistoryService.saveSearch({
        userId,
        query,
        type,
        filters,
        resultCount,
        clicked,
      });

      res.status(201).json({
        success: true,
        data: search,
      });
    }
  );

  /**
   * GET /api/v1/search/recent
   * Get recent searches for authenticated user
   */
  getRecentSearches = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetRecentSearchesInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentification requise pour voir l'historique",
        });
        return;
      }

      const { type, limit } = req.query;

      const searches = await searchHistoryService.getRecentSearches({
        userId,
        type,
        limit: limit as number,
      });

      res.json({
        success: true,
        data: {
          searches,
          total: searches.length,
        },
      });
    }
  );

  /**
   * GET /api/v1/search/suggestions
   * Get search suggestions (autocomplete)
   */
  getSearchSuggestions = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetSearchSuggestionsInput>,
      res: Response
    ): Promise<void> => {
      const { q, type, limit } = req.query;

      const suggestions = await searchHistoryService.getSearchSuggestions({
        query: q,
        type,
        limit: limit as number,
      });

      res.json({
        success: true,
        data: {
          suggestions,
          total: suggestions.length,
        },
      });
    }
  );

  /**
   * GET /api/v1/search/trending
   * Get trending searches
   */
  getTrendingSearches = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetTrendingSearchesInput>,
      res: Response
    ): Promise<void> => {
      const { type, timeRange, limit } = req.query;

      const trending = await searchHistoryService.getTrendingSearches({
        type,
        timeRange: timeRange || '7d',
        limit: limit as number,
      });

      res.json({
        success: true,
        data: {
          trending,
          total: trending.length,
          timeRange: timeRange || '7d',
        },
      });
    }
  );

  /**
   * DELETE /api/v1/search/history/:searchId?
   * Delete search history (specific or all)
   */
  deleteSearchHistory = asyncHandler(
    async (
      req: Request<DeleteSearchHistoryInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentification requise',
        });
        return;
      }

      const { searchId } = req.params;

      const result = await searchHistoryService.deleteSearchHistory({
        userId,
        searchId,
      });

      res.json({
        success: true,
        message: searchId
          ? 'Recherche supprimée'
          : 'Historique de recherche effacé',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/search/:searchId/clicked
   * Mark a search as clicked
   */
  markSearchAsClicked = asyncHandler(
    async (
      req: Request<MarkSearchClickedInput>,
      res: Response
    ): Promise<void> => {
      const { searchId } = req.params;

      await searchHistoryService.markSearchAsClicked(searchId);

      res.json({
        success: true,
        message: 'Recherche marquée comme cliquée',
      });
    }
  );

  /**
   * GET /api/v1/search/all
   * Global search across products, deals, and donations
   */
  globalSearch = asyncHandler(
    async (
      req: Request<{}, {}, {}, GlobalSearchInput>,
      res: Response
    ): Promise<void> => {
      const { q, types, categories, latitude, longitude, radius, limit } =
        req.query;

      // Parse comma-separated types and categories
      const typesArray = types
        ? (types.split(',') as Array<'product' | 'deal' | 'donation'>)
        : undefined;
      const categoriesArray = categories ? categories.split(',') : undefined;

      const results = await globalSearchService.searchAll({
        query: q,
        types: typesArray,
        categories: categoriesArray,
        latitude,
        longitude,
        radius,
        limit: limit as number,
      });

      // Save search history (optional auth)
      const userId = (req as any).user?.id;
      if (userId) {
        await searchHistoryService.saveSearch({
          userId,
          query: q,
          type: 'all',
          filters: {
            types: typesArray,
            categories: categoriesArray,
            latitude,
            longitude,
            radius,
          },
          resultCount: results.total,
        });
      }

      res.json({
        success: true,
        data: results,
        meta: {
          query: q,
          types: typesArray || ['product', 'deal', 'donation'],
          total: results.total,
        },
      });
    }
  );
}

export default new SearchHistoryController();
