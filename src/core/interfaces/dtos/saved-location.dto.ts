/**
 * Saved Location DTOs
 * Data Transfer Objects for user saved locations (favorite addresses)
 */

export interface CreateSavedLocationDTO {
  label: string;
  address: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  instructions?: string;
  phoneNumber?: string;
  isDefault?: boolean;
}

export interface UpdateSavedLocationDTO {
  label?: string;
  address?: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  phoneNumber?: string;
  isDefault?: boolean;
}

export interface SavedLocationResponseDTO {
  id: string;
  label: string;
  address: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  instructions?: string;
  phoneNumber?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
