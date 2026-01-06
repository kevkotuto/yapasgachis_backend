import crypto from 'crypto';

// Re-export asyncHandler and AppError from error-handler middleware for convenience
export { asyncHandler, AppError } from '@/middleware/error-handler.middleware';

/**
 * Generate a random OTP code
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Generate a random token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a unique order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
};

/**
 * Generate pickup code (QR code compatible)
 */
export const generatePickupCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/**
 * Generate a random alphanumeric code
 */
export const generateRandomCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Format phone number to international format
 */
export const formatPhoneNumber = (
  phone: string,
  countryCode: string = '+225'
): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Add country code if not present
  if (!cleaned.startsWith(countryCode.replace('+', ''))) {
    return `${countryCode}${cleaned}`;
  }

  return `+${cleaned}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+225|225)?[0-9]{8,10}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

/**
 * Format currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'XOF'
): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate commission
 */
export const calculateCommission = (
  amount: number,
  commissionRate: number
): number => {
  return Math.round((amount * commissionRate) / 100);
};

/**
 * Calculate delivery fee based on distance
 */
export const calculateDeliveryFee = (
  distance: number,
  baseFee: number,
  feePerKm: number
): number => {
  return baseFee + Math.ceil(distance) * feePerKm;
};

/**
 * Slugify string
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Paginate array
 */
export const paginate = <T>(
  array: T[],
  page: number,
  limit: number
): {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
} => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = array.slice(startIndex, endIndex);
  const total = array.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry async function
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay * (i + 1)); // Exponential backoff
      }
    }
  }

  throw lastError;
};

/**
 * Check if date is expired
 */
export const isExpired = (date: Date): boolean => {
  return new Date(date) < new Date();
};

/**
 * Get time until expiration in minutes
 */
export const getTimeUntilExpiration = (date: Date): number => {
  const now = new Date();
  const expiry = new Date(date);
  const diff = expiry.getTime() - now.getTime();
  return Math.floor(diff / 1000 / 60); // Convert to minutes
};

/**
 * Mask sensitive data
 */
export const maskEmail = (email: string): string => {
  const parts = email.split('@');
  const username = parts[0] ?? '';
  const domain = parts[1] ?? '';
  const maskedUsername =
    username.substring(0, 2) + '*'.repeat(Math.max(0, username.length - 2));
  return `${maskedUsername}@${domain}`;
};

export const maskPhone = (phone: string): string => {
  return (
    phone.substring(0, 4) +
    '*'.repeat(phone.length - 7) +
    phone.substring(phone.length - 3)
  );
};

/**
 * Generate random color for avatar
 */
export const generateAvatarColor = (id: string): string => {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ] as const;
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length] ?? '#FF6B6B';
};
