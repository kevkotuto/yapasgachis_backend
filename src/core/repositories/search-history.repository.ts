import { PrismaClient, SearchHistory } from '@prisma/client';
import { CreateSearchHistoryDTO } from '@/core/interfaces/dtos/search-history.dto';

export class SearchHistoryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new search history entry
   */
  async create(data: CreateSearchHistoryDTO): Promise<SearchHistory> {
    return this.prisma.searchHistory.create({
      data: {
        userId: data.userId,
        query: data.query,
        type: data.type,
        filters: data.filters || null,
        resultCount: data.resultCount,
        clicked: data.clicked || false,
      },
    });
  }

  /**
   * Get recent searches for a user
   */
  async getRecentByUser(
    userId: string,
    type?: string,
    limit: number = 10
  ): Promise<SearchHistory[]> {
    return this.prisma.searchHistory.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      distinct: ['query'], // Avoid duplicate queries
    });
  }

  /**
   * Get search suggestions based on query prefix
   */
  async getSuggestions(
    query: string,
    type?: string,
    limit: number = 5
  ): Promise<{ query: string; type: string; frequency: number }[]> {
    const searches = await this.prisma.searchHistory.groupBy({
      by: ['query', 'type'],
      where: {
        query: {
          startsWith: query,
          mode: 'insensitive',
        },
        ...(type && { type }),
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return searches.map((s) => ({
      query: s.query,
      type: s.type,
      frequency: s._count.query,
    }));
  }

  /**
   * Get trending searches
   */
  async getTrending(
    type?: string,
    timeRange: '24h' | '7d' | '30d' = '7d',
    limit: number = 10
  ): Promise<{ query: string; type: string; count: number }[]> {
    const now = new Date();
    let sinceDate = new Date();

    switch (timeRange) {
      case '24h':
        sinceDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        sinceDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        sinceDate.setDate(now.getDate() - 30);
        break;
    }

    const trending = await this.prisma.searchHistory.groupBy({
      by: ['query', 'type'],
      where: {
        createdAt: {
          gte: sinceDate,
        },
        ...(type && { type }),
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return trending.map((t) => ({
      query: t.query,
      type: t.type,
      count: t._count.query,
    }));
  }

  /**
   * Delete a specific search history entry
   */
  async deleteById(id: string): Promise<void> {
    await this.prisma.searchHistory.delete({
      where: { id },
    });
  }

  /**
   * Delete all search history for a user
   */
  async deleteAllByUser(userId: string): Promise<number> {
    const result = await this.prisma.searchHistory.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  /**
   * Update clicked status
   */
  async markAsClicked(id: string): Promise<SearchHistory> {
    return this.prisma.searchHistory.update({
      where: { id },
      data: { clicked: true },
    });
  }
}

export default SearchHistoryRepository;
