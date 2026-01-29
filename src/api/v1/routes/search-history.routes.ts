import { Router } from 'express';
import searchHistoryController from '@/api/v1/controllers/search-history.controller';
import {
  saveSearchSchema,
  getRecentSearchesSchema,
  getSearchSuggestionsSchema,
  getTrendingSearchesSchema,
  deleteSearchHistorySchema,
  markSearchClickedSchema,
  globalSearchSchema,
} from '@/api/v1/validators/search-history.validator';
import {
  optionalAuthenticate,
  authenticate,
} from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Global search (products, deals, donations) - Public with optional auth
router.get(
  '/all',
  optionalAuthenticate,
  validate(globalSearchSchema),
  searchHistoryController.globalSearch
);

// Get search suggestions (autocomplete) - Public
router.get(
  '/suggestions',
  validate(getSearchSuggestionsSchema),
  searchHistoryController.getSearchSuggestions
);

// Get trending searches - Public
router.get(
  '/trending',
  validate(getTrendingSearchesSchema),
  searchHistoryController.getTrendingSearches
);

// Save search - Optional auth (pour les utilisateurs connectés)
router.post(
  '/save',
  optionalAuthenticate,
  validate(saveSearchSchema),
  searchHistoryController.saveSearch
);

// Mark search as clicked - Optional auth
router.post(
  '/:searchId/clicked',
  optionalAuthenticate,
  validate(markSearchClickedSchema),
  searchHistoryController.markSearchAsClicked
);

// ==================== PROTECTED ROUTES (AUTH REQUIRED) ====================

// Get recent searches - Requires authentication
router.get(
  '/recent',
  authenticate,
  validate(getRecentSearchesSchema),
  searchHistoryController.getRecentSearches
);

// Delete search history (specific or all)
router.delete(
  '/history/:searchId?',
  authenticate,
  validate(deleteSearchHistorySchema),
  searchHistoryController.deleteSearchHistory
);

export default router;
