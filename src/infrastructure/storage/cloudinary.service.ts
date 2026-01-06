import { v2 as cloudinary } from 'cloudinary';
import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Cloudinary Service
 * Handles file uploads to Cloudinary
 */
export class CloudinaryService {
  private static instance: CloudinaryService;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Initialize Cloudinary configuration
   */
  private initialize(): void {
    try {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true,
      });

      this.initialized = true;
      logger.info('Cloudinary service initialized');
    } catch (error) {
      logger.error('Failed to initialize Cloudinary', {
        error: (error as Error).message,
      });
      throw new AppError(500, 'Failed to initialize file storage service');
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      filename?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      transformation?: any;
      maxFileSize?: number;
    } = {}
  ): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    format: string;
    width: number | undefined;
    height: number | undefined;
    bytes: number;
  }> {
    if (!this.initialized) {
      throw new AppError(500, 'File storage service not initialized');
    }

    const {
      folder = 'yapasgachis',
      filename,
      resourceType = 'auto',
      transformation,
      maxFileSize = 10 * 1024 * 1024, // 10MB default
    } = options;

    // Check file size
    if (buffer.length > maxFileSize) {
      throw new AppError(
        400,
        `File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024)}MB`
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: resourceType,
          transformation,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed', {
              error: error.message,
              folder,
            });
            reject(new AppError(500, 'Failed to upload file'));
            return;
          }

          if (!result) {
            reject(new AppError(500, 'Upload result is undefined'));
            return;
          }

          logger.info('File uploaded to Cloudinary', {
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Upload image with automatic optimization
   */
  async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      filename?: string;
      width?: number;
      height?: number;
      quality?: number;
      crop?: 'fill' | 'fit' | 'limit' | 'scale';
    } = {}
  ): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    format: string;
    width: number | undefined;
    height: number | undefined;
    bytes: number;
  }> {
    const {
      folder = 'yapasgachis/products',
      filename,
      width,
      height,
      quality = 80,
      crop = 'limit',
    } = options;

    const transformation: any = {
      quality: quality,
      fetch_format: 'auto',
    };

    if (width || height) {
      transformation.width = width;
      transformation.height = height;
      transformation.crop = crop;
    }

    return this.uploadFromBuffer(buffer, {
      folder,
      filename,
      resourceType: 'image',
      transformation,
      maxFileSize: 5 * 1024 * 1024, // 5MB for images
    });
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: { buffer: Buffer; filename: string }[],
    options: {
      folder?: string;
      width?: number;
      height?: number;
      quality?: number;
    } = {}
  ): Promise<
    Array<{
      url: string;
      secureUrl: string;
      publicId: string;
      format: string;
      width: number;
      height: number;
      bytes: number;
    }>
  > {
    const uploadPromises = files.map((file) =>
      this.uploadImage(file.buffer, {
        ...options,
        filename: file.filename,
      })
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Failed to upload multiple images', {
        count: files.length,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Failed to upload images');
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new AppError(500, 'File storage service not initialized');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      const success = result.result === 'ok';

      if (success) {
        logger.info('File deleted from Cloudinary', { publicId });
      } else {
        logger.warn('File deletion failed', { publicId, result });
      }

      return success;
    } catch (error) {
      logger.error('Error deleting file from Cloudinary', {
        publicId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(
    publicIds: string[],
    resourceType: 'image' | 'video' | 'raw' = 'image'
  ): Promise<{ deleted: string[]; failed: string[] }> {
    const results = await Promise.allSettled(
      publicIds.map((id) => this.deleteFile(id, resourceType))
    );

    const deleted: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      const publicId = publicIds[index];
      if (publicId === undefined) return;

      if (result.status === 'fulfilled' && result.value) {
        deleted.push(publicId);
      } else {
        failed.push(publicId);
      }
    });

    logger.info('Bulk file deletion completed', {
      deleted: deleted.length,
      failed: failed.length,
    });

    return { deleted, failed };
  }

  /**
   * Get file URL with transformations
   */
  getTransformedUrl(
    publicId: string,
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: number;
      format?: string;
    }
  ): string {
    if (!this.initialized) {
      throw new AppError(500, 'File storage service not initialized');
    }

    return cloudinary.url(publicId, {
      ...transformations,
      secure: true,
    });
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(
    publicId: string,
    size: { width: number; height: number } = { width: 200, height: 200 }
  ): string {
    return this.getTransformedUrl(publicId, {
      width: size.width,
      height: size.height,
      crop: 'fill',
      quality: 80,
      format: 'jpg',
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      const regex = /\/v\d+\/(.+)\.[a-z]+$/;
      const match = url.match(regex);
      return match?.[1] ?? null;
    } catch (error) {
      logger.error('Failed to extract public ID from URL', {
        url,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      // Try to get account details as a health check
      await cloudinary.api.ping();
      return true;
    } catch (error) {
      logger.error('Cloudinary health check failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export default CloudinaryService.getInstance();
