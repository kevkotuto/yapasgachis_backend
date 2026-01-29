/**
 * DTOs for Search History
 */

export interface CreateSearchHistoryDTO {
  userId?: string;
  query: string;
  type: 'product' | 'deal' | 'donation' | 'all';
  filters?: Record<string, any>;
  resultCount?: number;
  clicked?: boolean;
}

export interface GetRecentSearchesDTO {
  userId?: string;
  type?: 'product' | 'deal' | 'donation' | 'all';
  limit?: number;
}

export interface GetSearchSuggestionsDTO {
  query: string;
  type?: 'product' | 'deal' | 'donation' | 'all';
  limit?: number;
}

export interface GetTrendingSearchesDTO {
  type?: 'product' | 'deal' | 'donation' | 'all';
  limit?: number;
  timeRange?: '24h' | '7d' | '30d';
}

export interface GlobalSearchDTO {
  query: string;
  types?: Array<'product' | 'deal' | 'donation'>;
  categories?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
}

export interface GlobalSearchResultDTO {
  products: any[];
  deals: any[];
  donations: any[];
  total: number;
}

export interface DeleteSearchHistoryDTO {
  userId: string;
  searchId?: string; // Si fourni, supprime une recherche spécifique, sinon tout l'historique
}

export interface SearchHistoryResponseDTO {
  id: string;
  query: string;
  type: string;
  filters?: Record<string, any>;
  resultCount?: number;
  clicked: boolean;
  createdAt: Date;
}

export interface TrendingSearchResponseDTO {
  query: string;
  type: string;
  count: number;
}

export interface SearchSuggestionResponseDTO {
  query: string;
  type: string;
  frequency: number;
}
