import { Router } from 'express';
import multer from 'multer';
import mediaGalleryController from '@/api/v1/controllers/media-gallery.controller';
import {
  uploadMediaSchema,
  getGallerySchema,
  updateMediaSchema,
  mediaIdSchema,
  bulkDeleteSchema,
  reorderMediaSchema,
} from '@/api/v1/validators/media-gallery.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

// ==================== PUBLIC ROUTES ====================

router.get(
  '/gallery/:entityType/:entityId',
  validate(getGallerySchema),
  mediaGalleryController.getMediaGallery
);

// ==================== AUTHENTICATED ROUTES ====================

router.post(
  '/upload',
  authenticate,
  upload.array('files', 10),
  validate(uploadMediaSchema),
  mediaGalleryController.uploadMedia
);

router.put(
  '/:id',
  authenticate,
  validate(updateMediaSchema),
  mediaGalleryController.updateMedia
);

router.delete(
  '/:id',
  authenticate,
  validate(mediaIdSchema),
  mediaGalleryController.deleteMedia
);

router.post(
  '/bulk-delete',
  authenticate,
  validate(bulkDeleteSchema),
  mediaGalleryController.bulkDeleteMedia
);

router.patch(
  '/:id/set-primary',
  authenticate,
  validate(mediaIdSchema),
  mediaGalleryController.setPrimaryMedia
);

router.patch(
  '/reorder/:entityType/:entityId',
  authenticate,
  validate(reorderMediaSchema),
  mediaGalleryController.reorderMedia
);

export default router;
