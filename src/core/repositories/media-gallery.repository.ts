import { Media, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export class MediaGalleryRepository {
  async create(data: any): Promise<Media> {
    try {
      return await prisma.media.create({ data });
    } catch (error) {
      logger.error('Error creating media', { error: (error as Error).message });
      throw error;
    }
  }

  async findById(id: string): Promise<Media | null> {
    try {
      return await prisma.media.findUnique({ where: { id } });
    } catch (error) {
      logger.error('Error finding media', { error: (error as Error).message });
      throw error;
    }
  }

  async findByEntity(entityType: string, entityId: string): Promise<Media[]> {
    try {
      return await prisma.media.findMany({
        where: { entityType, entityId },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      });
    } catch (error) {
      logger.error('Error finding media by entity', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async update(id: string, data: any): Promise<Media> {
    try {
      return await prisma.media.update({ where: { id }, data });
    } catch (error) {
      logger.error('Error updating media', { error: (error as Error).message });
      throw error;
    }
  }

  async delete(id: string): Promise<Media> {
    try {
      return await prisma.media.delete({ where: { id } });
    } catch (error) {
      logger.error('Error deleting media', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteMany(ids: string[]): Promise<number> {
    try {
      const result = await prisma.media.deleteMany({
        where: { id: { in: ids } },
      });
      return result.count;
    } catch (error) {
      logger.error('Error deleting multiple media', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async setPrimary(
    entityType: string,
    entityId: string,
    mediaId: string
  ): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.media.updateMany({
          where: { entityType, entityId },
          data: { isPrimary: false },
        }),
        prisma.media.update({
          where: { id: mediaId },
          data: { isPrimary: true },
        }),
      ]);
    } catch (error) {
      logger.error('Error setting primary media', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async reorder(
    updates: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    try {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.media.update({
            where: { id: u.id },
            data: { sortOrder: u.sortOrder },
          })
        )
      );
    } catch (error) {
      logger.error('Error reordering media', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new MediaGalleryRepository();
