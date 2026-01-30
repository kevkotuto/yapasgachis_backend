import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Media Server Service
 * Client pour communiquer avec le serveur de média YapaGachis (media.yapasgachis.com)
 */
export class MediaServerService {
  private static instance: MediaServerService;
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = config.mediaServer.baseUrl;
    this.apiKey = config.mediaServer.apiKey;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-api-key': this.apiKey,
      },
      timeout: 30000, // 30 seconds
    });

    logger.info('Media Server service initialized', {
      baseUrl: this.baseUrl,
    });
  }

  static getInstance(): MediaServerService {
    if (!MediaServerService.instance) {
      MediaServerService.instance = new MediaServerService();
    }
    return MediaServerService.instance;
  }

  /**
   * Upload single file
   */
  async uploadFile(
    buffer: Buffer,
    options: {
      folder:
        | 'products'
        | 'users'
        | 'suppliers'
        | 'associations'
        | 'deals'
        | 'misc';
      filename: string;
      mimetype?: string;
    }
  ): Promise<{
    url: string;
    thumbnailUrl: string | null;
    filename: string;
    folder: string;
    mimetype: string;
    size: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: options.filename,
        contentType: options.mimetype || 'image/jpeg',
      });

      const response = await this.client.post(
        `/upload/${options.folder}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      if (!response.data.success) {
        throw new AppError(500, 'Upload failed on media server');
      }

      logger.info('File uploaded to media server', {
        folder: options.folder,
        filename: response.data.data.filename,
      });

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Media server upload failed', {
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
        });
        throw new AppError(
          500,
          error.response?.data?.error || 'Failed to upload file to media server'
        );
      }
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: { buffer: Buffer; filename: string; mimetype?: string }[],
    folder:
      | 'products'
      | 'users'
      | 'suppliers'
      | 'associations'
      | 'deals'
      | 'misc' = 'products'
  ): Promise<
    Array<{
      url: string;
      thumbnailUrl: string | null;
      filename: string;
      mimetype: string;
      size: number;
    }>
  > {
    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append('files', file.buffer, {
          filename: file.filename,
          contentType: file.mimetype || 'image/jpeg',
        });
      });

      const response = await this.client.post(
        `/upload/${folder}/multiple`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      if (!response.data.success) {
        throw new AppError(500, 'Multiple upload failed on media server');
      }

      logger.info('Multiple files uploaded to media server', {
        folder,
        count: response.data.data.length,
      });

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Media server multiple upload failed', {
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
        });
        throw new AppError(
          500,
          error.response?.data?.error ||
            'Failed to upload files to media server'
        );
      }
      throw error;
    }
  }

  /**
   * Delete file from media server
   */
  async deleteFile(folder: string, filename: string): Promise<boolean> {
    try {
      const response = await this.client.delete(
        `/delete/${folder}/${filename}`
      );

      if (!response.data.success) {
        logger.warn('Failed to delete file from media server', {
          folder,
          filename,
        });
        return false;
      }

      logger.info('File deleted from media server', { folder, filename });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Media server delete failed', {
          folder,
          filename,
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
        });
      }
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(
    files: { folder: string; filename: string }[]
  ): Promise<{ deleted: number; failed: number }> {
    const results = await Promise.allSettled(
      files.map((file) => this.deleteFile(file.folder, file.filename))
    );

    const deleted = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length;
    const failed = results.length - deleted;

    logger.info('Bulk file deletion completed', { deleted, failed });

    return { deleted, failed };
  }

  /**
   * List files in a folder
   */
  async listFiles(
    folder:
      | 'products'
      | 'users'
      | 'suppliers'
      | 'associations'
      | 'deals'
      | 'misc'
  ): Promise<
    Array<{
      filename: string;
      url: string;
      size: number;
      createdAt: string;
    }>
  > {
    try {
      const response = await this.client.get(`/list/${folder}`);

      if (!response.data.success) {
        throw new AppError(500, 'Failed to list files');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Media server list failed', {
          folder,
          message: error.response?.data?.error || error.message,
        });
        throw new AppError(
          500,
          error.response?.data?.error || 'Failed to list files'
        );
      }
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    folders: Record<
      string,
      { files: number; size: number; sizeFormatted: string }
    >;
    total: { files: number; size: number; sizeFormatted: string };
  }> {
    try {
      const response = await this.client.get('/stats');

      if (!response.data.success) {
        throw new AppError(500, 'Failed to get storage stats');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Media server stats failed', {
          message: error.response?.data?.error || error.message,
        });
        throw new AppError(
          500,
          error.response?.data?.error || 'Failed to get storage stats'
        );
      }
      throw error;
    }
  }

  /**
   * Extract folder and filename from media server URL
   */
  extractFileInfo(url: string): { folder: string; filename: string } | null {
    try {
      // URL format: https://media.yapasgachis.com/uploads/{folder}/{filename}
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      if (pathParts.length >= 4 && pathParts[1] === 'uploads') {
        return {
          folder: pathParts[2] as string,
          filename: pathParts[3] as string,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to extract file info from URL', { url });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.success === true;
    } catch (error) {
      logger.error('Media server health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export default MediaServerService.getInstance();
