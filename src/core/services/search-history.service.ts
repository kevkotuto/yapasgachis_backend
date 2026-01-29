import { PrismaClient } from '@prisma/client';
import SearchHistoryRepository from '@/core/repositories/search-history.repository';
import {
  CreateSearchHistoryDTO,
  GetRecentSearchesDTO,
  GetSearchSuggestionsDTO,
  GetTrendingSearchesDTO,
  DeleteSearchHistoryDTO,
  SearchHistoryResponseDTO,
  TrendingSearchResponseDTO,
  SearchSuggestionResponseDTO,
} from '@/core/interfaces/dtos/search-history.dto';

export class SearchHistoryService {
  private repository: SearchHistoryRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new SearchHistoryRepository(prisma);
  }

  /**
   * Save a search query
   */
  async saveSearch(
    data: CreateSearchHistoryDTO
  ): Promise<SearchHistoryResponseDTO> {
    const search = await this.repository.create(data);

    return {
      id: search.id,
      query: search.query,
      type: search.type,
      filters: search.filters as Record<string, any> | undefined,
      resultCount: search.resultCount || undefined,
      clicked: search.clicked,
      createdAt: search.createdAt,
    };
  }

  /**
   * Get recent searches for a user
   */
  async getRecentSearches(
    data: GetRecentSearchesDTO
  ): Promise<SearchHistoryResponseDTO[]> {
    if (!data.userId) {
      return []; // Cannot get recent searches without userId
    }

    const searches = await this.repository.getRecentByUser(
      data.userId,
      data.type,
      data.limit || 10
    );

    return searches.map((s) => ({
      id: s.id,
      query: s.query,
      type: s.type,
      filters: s.filters as Record<string, any> | undefined,
      resultCount: s.resultCount || undefined,
      clicked: s.clicked,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(
    data: GetSearchSuggestionsDTO
  ): Promise<SearchSuggestionResponseDTO[]> {
    if (!data.query || data.query.length < 2) {
      return []; // Minimum 2 characters for suggestions
    }

    return this.repository.getSuggestions(
      data.query,
      data.type,
      data.limit || 5
    );
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(
    data: GetTrendingSearchesDTO
  ): Promise<TrendingSearchResponseDTO[]> {
    return this.repository.getTrending(
      data.type,
      data.timeRange || '7d',
      data.limit || 10
    );
  }

  /**
   * Delete search history
   */
  async deleteSearchHistory(data: DeleteSearchHistoryDTO): Promise<{
    success: boolean;
    deletedCount: number;
  }> {
    if (data.searchId) {
      // Delete specific search
      await this.repository.deleteById(data.searchId);
      return { success: true, deletedCount: 1 };
    } else {
      // Delete all user's search history
      const deletedCount = await this.repository.deleteAllByUser(data.userId);
      return { success: true, deletedCount };
    }
  }

  /**
   * Mark a search as clicked (user clicked on a result)
   */
  async markSearchAsClicked(searchId: string): Promise<void> {
    await this.repository.markAsClicked(searchId);
  }
}

export default SearchHistoryService;
