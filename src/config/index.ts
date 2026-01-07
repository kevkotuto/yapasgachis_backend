import path from 'path';

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  app: {
    env: string;
    port: number;
    name: string;
    url: string;
    apiVersion: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
  };
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
    uploadDest: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      fromEmail: string;
      fromName: string;
    };
    sendgrid: {
      apiKey: string;
    };
    mailgun: {
      apiKey: string;
      domain: string;
    };
    adminEmail: string;
  };
  sms: {
    twilio: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
    africasTalking: {
      apiKey: string;
      username: string;
    };
  };
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
    databaseURL: string;
  };
  payment: {
    orangeMoney: {
      apiKey: string;
      merchantId: string;
      apiUrl: string;
    };
    mtnMoney: {
      apiKey: string;
      userId: string;
      apiUrl: string;
    };
    moovMoney: {
      apiKey: string;
      merchantCode: string;
    };
    wave: {
      apiKey: string;
      apiSecret: string;
      apiUrl: string;
      webhookSecret: string;
      businessId: string;
      paymentFeeRate: number; // Frais de paiement Wave (1%)
      transferFeeRate: number; // Frais de transfert Wave (1%)
    };
    stripe: {
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
    };
    paystack: {
      secretKey: string;
      publicKey: string;
    };
  };
  googleMaps: {
    apiKey: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    iosClientId: string;
    androidClientId: string;
  };
  sentry: {
    dsn: string;
  };
  logging: {
    level: string;
    filePath: string;
  };
  session: {
    secret: string;
    maxAge: number;
  };
  queue: {
    redis: {
      host: string;
      port: number;
    };
    concurrency: number;
  };
  cron: {
    enabled: boolean;
    schedules: {
      expireProducts: string;
      subscriptionRenewal: string;
      analyticsAggregation: string;
    };
  };
  features: {
    graphql: boolean;
    websocket: boolean;
    analytics: boolean;
    notifications: boolean;
  };
  security: {
    bcryptRounds: number;
    otpExpiration: number;
    otpLength: number;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  business: {
    defaultCommissionRate: number;
    premiumCommissionRate: number;
    defaultDeliveryFee: number;
    deliveryFeePerKm: number;
    maxDeliveryDistance: number;
  };
  cache: {
    ttl: {
      short: number;
      medium: number;
      long: number;
    };
  };
  kycVerification: {
    enabled: boolean;
    provider: 'aws-rekognition' | 'azure' | 'google' | 'mock';
    autoApproveThreshold: number; // Score minimum pour approbation automatique (0-100)
    manualReviewThreshold: number; // Score en dessous = review manuel obligatoire
    faceSimilarityThreshold: number; // Score minimum de correspondance faciale
    livenessThreshold: number; // Score minimum de vivacité
    maxAttemptsPerSupplier: number; // Nombre max de tentatives
    processingTimeoutMs: number; // Timeout de traitement en ms
    enableLivenessDetection: boolean;
    enableDocumentAuthenticity: boolean;
    supportedDocumentTypes: string[];
    webhookUrl: string; // URL de callback après vérification
  };
}

const config: Config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    name: process.env.APP_NAME || 'YapaGachis',
    url: process.env.APP_URL || 'http://localhost:3000',
    apiVersion: process.env.API_VERSION || 'v1',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    uploadDest: process.env.UPLOAD_DEST || './uploads',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'yapasgachis',
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@yapasgachis.com',
      fromName: process.env.SMTP_FROM_NAME || 'YapaGachis',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY || '',
      domain: process.env.MAILGUN_DOMAIN || '',
    },
    adminEmail: process.env.ADMIN_EMAIL || 'admin@yapasgachis.com',
  },
  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    africasTalking: {
      apiKey: process.env.AFRICASTALKING_API_KEY || '',
      username: process.env.AFRICASTALKING_USERNAME || '',
    },
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  },
  payment: {
    orangeMoney: {
      apiKey: process.env.ORANGE_MONEY_API_KEY || '',
      merchantId: process.env.ORANGE_MONEY_MERCHANT_ID || '',
      apiUrl:
        process.env.ORANGE_MONEY_API_URL ||
        'https://api.orange.com/orange-money-webpay',
    },
    mtnMoney: {
      apiKey: process.env.MTN_MONEY_API_KEY || '',
      userId: process.env.MTN_MONEY_USER_ID || '',
      apiUrl: process.env.MTN_MONEY_API_URL || 'https://proxy.momoapi.mtn.com',
    },
    moovMoney: {
      apiKey: process.env.MOOV_MONEY_API_KEY || '',
      merchantCode: process.env.MOOV_MONEY_MERCHANT_CODE || '',
    },
    wave: {
      apiKey: process.env.WAVE_API_KEY || '',
      apiSecret: process.env.WAVE_API_SECRET || '',
      apiUrl: process.env.WAVE_API_URL || 'https://api.wave.com/v1',
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
      businessId: process.env.WAVE_BUSINESS_ID || '',
      paymentFeeRate: parseFloat(process.env.WAVE_PAYMENT_FEE_RATE || '0.01'), // 1%
      transferFeeRate: parseFloat(process.env.WAVE_TRANSFER_FEE_RATE || '0.01'), // 1%
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    },
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || '',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
  },
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
    },
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  },
  cron: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    schedules: {
      expireProducts: process.env.CRON_EXPIRE_PRODUCTS || '0 */6 * * *',
      subscriptionRenewal: process.env.CRON_SUBSCRIPTION_RENEWAL || '0 0 * * *',
      analyticsAggregation:
        process.env.CRON_ANALYTICS_AGGREGATION || '0 1 * * *',
    },
  },
  features: {
    graphql: process.env.ENABLE_GRAPHQL === 'true',
    websocket: process.env.ENABLE_WEBSOCKET !== 'false', // Enabled by default
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    notifications: process.env.ENABLE_NOTIFICATIONS !== 'false', // Enabled by default
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    otpExpiration: parseInt(process.env.OTP_EXPIRATION || '600000', 10),
    otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  business: {
    defaultCommissionRate: parseInt(
      process.env.DEFAULT_COMMISSION_RATE || '10',
      10
    ),
    premiumCommissionRate: parseInt(
      process.env.PREMIUM_COMMISSION_RATE || '5',
      10
    ),
    defaultDeliveryFee: parseInt(
      process.env.DEFAULT_DELIVERY_FEE || '1000',
      10
    ),
    deliveryFeePerKm: parseInt(process.env.DELIVERY_FEE_PER_KM || '200', 10),
    maxDeliveryDistance: parseInt(
      process.env.MAX_DELIVERY_DISTANCE || '20',
      10
    ),
  },
  cache: {
    ttl: {
      short: parseInt(process.env.CACHE_TTL_SHORT || '300', 10),
      medium: parseInt(process.env.CACHE_TTL_MEDIUM || '1800', 10),
      long: parseInt(process.env.CACHE_TTL_LONG || '86400', 10),
    },
  },
  kycVerification: {
    enabled: process.env.KYC_VERIFICATION_ENABLED === 'true',
    provider: (process.env.KYC_PROVIDER || 'aws-rekognition') as
      | 'aws-rekognition'
      | 'azure'
      | 'google'
      | 'mock',
    autoApproveThreshold: parseFloat(
      process.env.KYC_AUTO_APPROVE_THRESHOLD || '85'
    ),
    manualReviewThreshold: parseFloat(
      process.env.KYC_MANUAL_REVIEW_THRESHOLD || '60'
    ),
    faceSimilarityThreshold: parseFloat(
      process.env.KYC_FACE_SIMILARITY_THRESHOLD || '80'
    ),
    livenessThreshold: parseFloat(process.env.KYC_LIVENESS_THRESHOLD || '75'),
    maxAttemptsPerSupplier: parseInt(
      process.env.KYC_MAX_ATTEMPTS_PER_SUPPLIER || '5',
      10
    ),
    processingTimeoutMs: parseInt(
      process.env.KYC_PROCESSING_TIMEOUT_MS || '60000',
      10
    ), // 60 seconds
    enableLivenessDetection:
      process.env.KYC_ENABLE_LIVENESS_DETECTION !== 'false',
    enableDocumentAuthenticity:
      process.env.KYC_ENABLE_DOCUMENT_AUTHENTICITY !== 'false',
    supportedDocumentTypes: (
      process.env.KYC_SUPPORTED_DOCUMENT_TYPES ||
      'CNI,PASSPORT,DRIVING_LICENSE,RESIDENCE_CARD'
    ).split(','),
    webhookUrl: process.env.KYC_WEBHOOK_URL || '',
  },
};

export default config;
