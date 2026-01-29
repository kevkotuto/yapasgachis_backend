/**
 * User DTOs
 * Data Transfer Objects for user profile management
 */

export interface UpdateUserProfileDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  language?: 'fr' | 'en';
}

export interface UpdateAvatarDTO {
  avatar: string;
}

export interface CheckContactsDTO {
  phoneNumbers: string[];
}

export interface ContactCheckResult {
  phoneNumber: string;
  isOnPlatform: boolean;
  userId?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface UserPaymentMethodDTO {
  id: string;
  provider: string;
  phoneNumber: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddPaymentMethodDTO {
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'MOOV_MONEY';
  phoneNumber: string;
  accountName: string;
  isDefault?: boolean;
}

export interface UpdatePaymentMethodDTO {
  phoneNumber?: string;
  accountName?: string;
  isDefault?: boolean;
}
