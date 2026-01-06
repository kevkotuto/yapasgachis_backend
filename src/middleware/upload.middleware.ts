import multer from 'multer';
import { Request, RequestHandler } from 'express';
import { AppError } from './error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Upload Middleware
 * Handles file uploads using multer with memory storage
 */

// File type validation
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * File filter function
 */
const fileFilter = (
  allowedTypes: string[]
): multer.Options['fileFilter'] => {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      logger.warn('File type not allowed', {
        mimetype: file.mimetype,
        filename: file.originalname,
      });
      cb(
        new AppError(
          400,
          `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`,
          'INVALID_FILE_TYPE'
        )
      );
    }
  };
};

/**
 * Image upload middleware
 * Accepts: JPEG, PNG, WebP, GIF
 * Max size: 5MB per file
 */
export const uploadImages: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // Max 10 files
  },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).array('images', 10);

/**
 * Single image upload middleware
 * Max size: 5MB
 */
export const uploadSingleImage: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('image');

/**
 * Document upload middleware
 * Accepts: PDF, DOC, DOCX
 * Max size: 10MB
 */
export const uploadDocument: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: fileFilter(ALLOWED_DOCUMENT_TYPES),
}).single('document');

/**
 * Multiple documents upload middleware
 */
export const uploadDocuments: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Max 5 files
  },
  fileFilter: fileFilter(ALLOWED_DOCUMENT_TYPES),
}).array('documents', 5);

/**
 * Avatar upload middleware
 * Max size: 2MB
 */
export const uploadAvatar: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('avatar');

/**
 * Banner/Cover upload middleware
 * Max size: 5MB
 */
export const uploadBanner: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('banner');

/**
 * Handle multer errors
 */
export const handleUploadError = (
  error: any,
  _req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer upload error', {
      code: error.code,
      message: error.message,
      field: error.field,
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux',
        code: 'FILE_TOO_LARGE',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers',
        code: 'TOO_MANY_FILES',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Champ de fichier inattendu',
        code: 'UNEXPECTED_FILE',
      });
    }

    return res.status(400).json({
      success: false,
      message: "Erreur lors de l'upload du fichier",
      code: 'UPLOAD_ERROR',
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  next(error);
};

/**
 * Validate uploaded files exist
 */
export const requireFiles = (_fieldName: string = 'images') => {
  return (req: Request, res: any, next: any) => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file as Express.Multer.File | undefined;

    if (!files && !file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
        code: 'NO_FILE_PROVIDED',
      });
    }

    if (files && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
        code: 'NO_FILE_PROVIDED',
      });
    }

    next();
  };
};

/**
 * Extract file info helper
 */
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
    encoding: file.encoding,
  };
};

/**
 * Validate image dimensions (optional middleware)
 */
export const validateImageDimensions = (_options: {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}) => {
  return async (req: Request, _res: any, next: any) => {
    try {
      const file = req.file;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!file && (!files || files.length === 0)) {
        return next();
      }

      // For simple validation without external library
      // In production, you might want to use 'sharp' or 'jimp'
      // to validate actual image dimensions

      next();
    } catch (error) {
      logger.error('Error validating image dimensions', {
        error: (error as Error).message,
      });
      next(error);
    }
  };
};

/**
 * Clean up uploaded files on error (if using disk storage)
 * Not needed with memory storage, but useful for future disk storage
 */
export const cleanupOnError = (req: Request, res: any, next: any) => {
  res.on('finish', () => {
    if (res.statusCode >= 400 && req.file) {
      // Cleanup would go here if using disk storage
      logger.debug('Request failed, cleanup would be performed', {
        statusCode: res.statusCode,
      });
    }
  });
  next();
};
