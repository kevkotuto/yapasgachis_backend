/**
 * DTOs for Media Gallery (Multi-upload for Products, Deals, Stores)
 */

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum MediaCategory {
  PRODUCT = 'PRODUCT',
  DEAL = 'DEAL',
  STORE = 'STORE',
  PROFILE = 'PROFILE',
  REVIEW = 'REVIEW',
  KYC = 'KYC',
}

export interface UploadMediaDTO {
  entityType: MediaCategory;
  entityId: string; // productId, dealId, storeId, etc.
  files: Express.Multer.File[]; // Array de fichiers
  isPrimary?: boolean; // Si c'est la photo principale
  caption?: string;
  altText?: string;
}

export interface MediaResponseDTO {
  id: string;
  entityType: MediaCategory;
  entityId: string;
  type: MediaType;
  url: string; // URL Cloudinary/S3
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number; // Pour vidéos (en secondes)
  isPrimary: boolean;
  sortOrder: number;
  caption?: string;
  altText?: string;
  uploadedBy: string; // userId
  createdAt: Date;
}

export interface UpdateMediaDTO {
  isPrimary?: boolean;
  sortOrder?: number;
  caption?: string;
  altText?: string;
}

export interface ReorderMediaDTO {
  mediaIds: string[]; // Array dans le nouvel ordre
}

export interface BulkDeleteMediaDTO {
  mediaIds: string[];
}

export interface MediaGalleryDTO {
  entityType: MediaCategory;
  entityId: string;
  totalCount: number;
  primaryMedia?: MediaResponseDTO;
  media: MediaResponseDTO[];
}
