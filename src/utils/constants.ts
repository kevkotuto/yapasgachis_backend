export const APP_CONSTANTS = {
  DEFAULT_LANGUAGE: 'fr',
  SUPPORTED_LANGUAGES: ['fr', 'en', 'ar', 'es', 'bm'],

  CURRENCIES: {
    XOF: 'XOF', // West African CFA franc
    EUR: 'EUR',
    USD: 'USD',
  },

  PAYMENT_METHODS: {
    MOBILE_MONEY: 'mobile_money',
    CARD: 'card',
    CASH: 'cash',
  },

  MOBILE_MONEY_PROVIDERS: {
    ORANGE: 'orange_money',
    MTN: 'mtn_money',
    MOOV: 'moov_money',
    WAVE: 'wave',
  },

  CARD_PROVIDERS: {
    STRIPE: 'stripe',
    PAYSTACK: 'paystack',
  },

  ORDER_STATUSES: {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    PREPARING: 'PREPARING',
    READY_FOR_PICKUP: 'READY_FOR_PICKUP',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
  },

  PRODUCT_CATEGORIES: {
    FOOD_PREPARED: 'FOOD_PREPARED',
    BAKERY: 'BAKERY',
    PASTRY: 'PASTRY',
    GROCERIES: 'GROCERIES',
    FRUITS_VEGETABLES: 'FRUITS_VEGETABLES',
    MEAT_FISH: 'MEAT_FISH',
    DAIRY: 'DAIRY',
    HOTEL_ROOM: 'HOTEL_ROOM',
    SPA_WELLNESS: 'SPA_WELLNESS',
    LEISURE: 'LEISURE',
    TRANSPORT: 'TRANSPORT',
    OTHER: 'OTHER',
  },

  USER_ROLES: {
    CLIENT: 'CLIENT',
    SUPPLIER_FOOD: 'SUPPLIER_FOOD',
    SUPPLIER_DEALS: 'SUPPLIER_DEALS',
    ASSOCIATION: 'ASSOCIATION',
    ADVERTISER: 'ADVERTISER',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },

  SUBSCRIPTION_TIERS: {
    BASIC: 'BASIC',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
  },

  SUBSCRIPTION_FEATURES: {
    BASIC: {
      maxAnnonces: 10,
      analytics: false,
      sponsorship: false,
      priority: false,
    },
    PRO: {
      maxAnnonces: -1, // unlimited
      analytics: true,
      sponsorship: false,
      priority: true,
    },
    PREMIUM: {
      maxAnnonces: -1, // unlimited
      analytics: true,
      sponsorship: true,
      priority: true,
    },
  },

  NOTIFICATION_TYPES: {
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_READY: 'ORDER_READY',
    ORDER_IN_DELIVERY: 'ORDER_IN_DELIVERY',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    NEW_PRODUCT_NEARBY: 'NEW_PRODUCT_NEARBY',
    PRODUCT_EXPIRING_SOON: 'PRODUCT_EXPIRING_SOON',
    DONATION_CONFIRMED: 'DONATION_CONFIRMED',
    SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
    CAMPAIGN_APPROVED: 'CAMPAIGN_APPROVED',
    SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  },

  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    OTP_EXPIRED: 'OTP_EXPIRED',
    INVALID_OTP: 'INVALID_OTP',
  },

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  QUEUE_NAMES: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH_NOTIFICATION: 'push-notification',
    IMAGE_PROCESSING: 'image-processing',
    PAYMENT: 'payment',
    ANALYTICS: 'analytics',
  },

  CACHE_KEYS: {
    USER_PREFIX: 'user:',
    PRODUCT_PREFIX: 'product:',
    SUPPLIER_PREFIX: 'supplier:',
    ORDER_PREFIX: 'order:',
    SESSION_PREFIX: 'session:',
    OTP_PREFIX: 'otp:',
    RATE_LIMIT_PREFIX: 'rate-limit:',
  },

  REGEX: {
    // Pan-African phone regex: accepts international format with common African country codes
    // Includes: +221 (Senegal), +225 (Côte d'Ivoire), +223 (Mali), +226 (Burkina Faso),
    // +227 (Niger), +228 (Togo), +229 (Benin), +233 (Ghana), +234 (Nigeria),
    // +237 (Cameroon), +241 (Gabon), +242 (Congo), +243 (DRC), +254 (Kenya),
    // +255 (Tanzania), +256 (Uganda), +212 (Morocco), +213 (Algeria), +216 (Tunisia),
    // +20 (Egypt), +27 (South Africa), etc.
    PHONE: /^\+?[0-9]{8,15}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  },

  IMAGE_VARIANTS: {
    THUMBNAIL: { width: 200, height: 200 },
    MEDIUM: { width: 800, height: 800 },
    LARGE: { width: 1600, height: 1600 },
  },

  GEOLOCATION: {
    DEFAULT_SEARCH_RADIUS: 5, // km
    MAX_SEARCH_RADIUS: 50, // km
  },
} as const;

export type AppConstants = typeof APP_CONSTANTS;
