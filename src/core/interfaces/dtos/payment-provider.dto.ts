/**
 * Payment Provider DTOs
 * Data Transfer Objects for payment provider management
 */

export interface CreatePaymentProviderDTO {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  iconUrl?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  paymentFeeRate?: number;
  transferFeeRate?: number;
  minAmount?: number;
  maxAmount?: number;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
  config?: Record<string, any>;
  displayOrder?: number;
  isFeatured?: boolean;
}

export interface UpdatePaymentProviderDTO {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  iconUrl?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  paymentFeeRate?: number;
  transferFeeRate?: number;
  minAmount?: number;
  maxAmount?: number;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
  config?: Record<string, any>;
  displayOrder?: number;
  isFeatured?: boolean;
}

export interface PaymentProviderResponseDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  iconUrl?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  paymentFeeRate: number;
  transferFeeRate: number;
  minAmount?: number;
  maxAmount?: number;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
  displayOrder: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTO public pour les clients (sans informations sensibles)
export interface PublicPaymentProviderDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  iconUrl?: string;
  paymentFeeRate: number;
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies?: string[];
  isFeatured: boolean;
}

export interface PaymentProviderListQueryDTO {
  page?: number;
  limit?: number;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  search?: string;
}
