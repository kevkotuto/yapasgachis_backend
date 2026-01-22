import mediaGalleryRepository from '@/core/repositories/media-gallery.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

export class MediaGalleryService {
  async uploadMedia(
    userId: string,
    entityType: string,
    entityId: string,
    files: any[],
    options: any
  ) {
    // Validate entity ownership here (product, deal, store, etc.)
    await this.validateEntityOwnership(userId, entityType, entityId);

    const uploadedMedia = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Upload to Cloudinary/S3 (mocked here)
      const uploadedUrl = await this.uploadToCloudStorage(file);

      const media = await mediaGalleryRepository.create({
        entityType,
        entityId,
        type: this.determineMediaType(file.mimetype),
        url: uploadedUrl,
        thumbnailUrl: uploadedUrl, // TODO: Generate thumbnail
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        isPrimary: options.isPrimary && i === 0,
        sortOrder: i,
        caption: options.caption,
        altText: options.altText,
        uploadedBy: userId,
      });

      uploadedMedia.push(media);
    }

    logger.info('Media uploaded', {
      userId,
      entityType,
      entityId,
      count: files.length,
    });
    return uploadedMedia;
  }

  async getMediaGallery(entityType: string, entityId: string) {
    const media = await mediaGalleryRepository.findByEntity(
      entityType,
      entityId
    );
    const primaryMedia = media.find((m) => m.isPrimary);

    return {
      entityType,
      entityId,
      totalCount: media.length,
      primaryMedia,
      media,
    };
  }

  async updateMedia(userId: string, mediaId: string, data: any) {
    const media = await mediaGalleryRepository.findById(mediaId);
    if (!media) throw new AppError(404, 'Media non trouvé');

    await this.validateEntityOwnership(
      userId,
      media.entityType,
      media.entityId
    );

    const updated = await mediaGalleryRepository.update(mediaId, data);
    logger.info('Media updated', { userId, mediaId });
    return updated;
  }

  async deleteMedia(userId: string, mediaId: string) {
    const media = await mediaGalleryRepository.findById(mediaId);
    if (!media) throw new AppError(404, 'Media non trouvé');

    await this.validateEntityOwnership(
      userId,
      media.entityType,
      media.entityId
    );

    // TODO: Delete from cloud storage
    await this.deleteFromCloudStorage(media.url);

    await mediaGalleryRepository.delete(mediaId);
    logger.info('Media deleted', { userId, mediaId });
    return { success: true };
  }

  async bulkDeleteMedia(userId: string, mediaIds: string[]) {
    for (const id of mediaIds) {
      await this.deleteMedia(userId, id);
    }
    return { success: true, deleted: mediaIds.length };
  }

  async setPrimaryMedia(userId: string, mediaId: string) {
    const media = await mediaGalleryRepository.findById(mediaId);
    if (!media) throw new AppError(404, 'Media non trouvé');

    await this.validateEntityOwnership(
      userId,
      media.entityType,
      media.entityId
    );

    await mediaGalleryRepository.setPrimary(
      media.entityType,
      media.entityId,
      mediaId
    );
    logger.info('Primary media set', { userId, mediaId });
    return { success: true };
  }

  async reorderMedia(
    userId: string,
    entityType: string,
    entityId: string,
    mediaIds: string[]
  ) {
    await this.validateEntityOwnership(userId, entityType, entityId);

    const updates = mediaIds.map((id, index) => ({ id, sortOrder: index }));
    await mediaGalleryRepository.reorder(updates);

    logger.info('Media reordered', { userId, entityType, entityId });
    return await mediaGalleryRepository.findByEntity(entityType, entityId);
  }

  private async validateEntityOwnership(
    userId: string,
    entityType: string,
    entityId: string
  ) {
    // TODO: Implement actual ownership validation
    // Check if user owns the product, deal, store, etc.
    return true;
  }

  private async uploadToCloudStorage(file: any): Promise<string> {
    // TODO: Implement actual cloud upload (Cloudinary/S3)
    return `https://storage.yapasgachis.com/${file.originalname}`;
  }

  private async deleteFromCloudStorage(url: string): Promise<void> {
    // TODO: Implement actual cloud deletion
  }

  private determineMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    return 'DOCUMENT';
  }
}

export default new MediaGalleryService();
