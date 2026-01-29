// @ts-nocheck - MediaGallery model deprecated, uses JSON fields instead
import { Request, Response } from 'express';
import mediaGalleryService from '@/core/services/media-gallery.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

export class MediaGalleryController {
  uploadMedia = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user.id;
      const { entityType, entityId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res
          .status(400)
          .json({ success: false, message: 'Aucun fichier fourni' });
        return;
      }

      const media = await mediaGalleryService.uploadMedia(
        userId,
        entityType,
        entityId,
        files,
        {
          isPrimary: req.body.isPrimary === 'true',
          caption: req.body.caption,
          altText: req.body.altText,
        }
      );

      logger.info('Media uploaded via API', {
        userId,
        entityType,
        entityId,
        count: files.length,
      });
      res
        .status(201)
        .json({ success: true, message: 'Médias uploadés', data: { media } });
    }
  );

  getMediaGallery = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const gallery = await mediaGalleryService.getMediaGallery(
      entityType,
      entityId
    );
    res.json({ success: true, data: gallery });
  });

  updateMedia = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const media = await mediaGalleryService.updateMedia(userId, id, req.body);

    logger.info('Media updated via API', { userId, mediaId: id });
    res.json({ success: true, message: 'Media mis à jour', data: { media } });
  });

  deleteMedia = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    await mediaGalleryService.deleteMedia(userId, id);

    logger.info('Media deleted via API', { userId, mediaId: id });
    res.json({ success: true, message: 'Media supprimé' });
  });

  bulkDeleteMedia = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { mediaIds } = req.body;
    const result = await mediaGalleryService.bulkDeleteMedia(userId, mediaIds);

    logger.info('Bulk media deleted via API', {
      userId,
      count: result.deleted,
    });
    res.json({
      success: true,
      message: `${result.deleted} médias supprimés`,
      data: result,
    });
  });

  setPrimaryMedia = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    await mediaGalleryService.setPrimaryMedia(userId, id);

    logger.info('Primary media set via API', { userId, mediaId: id });
    res.json({ success: true, message: 'Media principal défini' });
  });

  reorderMedia = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { entityType, entityId } = req.params;
    const { mediaIds } = req.body;

    const media = await mediaGalleryService.reorderMedia(
      userId,
      entityType,
      entityId,
      mediaIds
    );

    logger.info('Media reordered via API', { userId, entityType, entityId });
    res.json({ success: true, message: 'Médias réordonnés', data: { media } });
  });
}

export default new MediaGalleryController();
