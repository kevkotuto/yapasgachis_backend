import {
  NotificationType,
  NotificationPriority,
  DeviceType,
} from '@prisma/client';

// ==================== NOTIFICATION ====================

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  groupKey?: string;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendRealtime?: boolean;
}

export interface NotificationWithMeta {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  readAt: Date | null;
  pushSent: boolean;
  pushSentAt: Date | null;
  emailSent: boolean;
  emailSentAt: Date | null;
  priority: NotificationPriority;
  scheduledFor: Date | null;
  expiresAt: Date | null;
  groupKey: string | null;
  createdAt: Date;
}

export interface NotificationListResult {
  notifications: NotificationWithMeta[];
  total: number;
  unreadCount: number;
  pages: number;
  currentPage: number;
}

export interface NotificationFilters {
  read?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

// ==================== DEVICE TOKEN ====================

export interface RegisterDeviceTokenParams {
  userId: string;
  token: string;
  deviceType: DeviceType;
  deviceName?: string;
  deviceId?: string;
  appVersion?: string;
  osVersion?: string;
}

export interface DeviceTokenInfo {
  id: string;
  userId: string;
  token: string;
  deviceType: DeviceType;
  deviceName: string | null;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

// ==================== NOTIFICATION PREFERENCES ====================

export interface NotificationPreferenceData {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  orderUpdates: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
  productAlerts: boolean;
  systemAnnouncements: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface UpdatePreferencesParams {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  orderUpdates?: boolean;
  paymentAlerts?: boolean;
  promotions?: boolean;
  productAlerts?: boolean;
  systemAnnouncements?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ==================== PUSH NOTIFICATIONS ====================

export interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

export interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?:
      | 'DeviceNotRegistered'
      | 'MessageTooBig'
      | 'MessageRateExceeded'
      | 'InvalidCredentials';
  };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

// ==================== WEBSOCKET ====================

export interface SocketUserData {
  userId: string;
  userRole: string;
}

export interface WebSocketEvents {
  // Client -> Server
  'order:join': { orderId: string };
  'order:leave': { orderId: string };
  'delivery:track': { orderId: string };
  'delivery:untrack': { orderId: string };
  'typing:start': { roomId: string };
  'typing:stop': { roomId: string };

  // Server -> Client
  'notification:new': {
    notification: {
      id: string;
      type: NotificationType;
      title: string;
      message: string;
      data: Record<string, unknown> | null;
      createdAt: Date;
    };
  };
  'notification:unread_count': { count: number };
  'order:status_update': {
    orderId: string;
    status: string;
    timestamp: Date;
  };
  'delivery:location': {
    orderId: string;
    location: { latitude: number; longitude: number };
    timestamp: Date;
  };
}

// ==================== QUEUE JOBS ====================

export interface SendPushJobData {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

export interface SendEmailJobData {
  notificationId: string;
  userId: string;
  email: string;
  subject: string;
  body: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface BulkNotificationJobData {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendRealtime?: boolean;
}

export interface ScheduledNotificationJobData extends CreateNotificationParams {
  sendPush: boolean;
  sendEmail: boolean;
  sendRealtime: boolean;
}

// ==================== NOTIFICATION CATEGORY MAPPING ====================

export const NotificationCategoryMap: Record<
  NotificationType,
  keyof Pick<
    NotificationPreferenceData,
    | 'orderUpdates'
    | 'paymentAlerts'
    | 'promotions'
    | 'productAlerts'
    | 'systemAnnouncements'
  >
> = {
  // Order updates
  [NotificationType.ORDER_CONFIRMED]: 'orderUpdates',
  [NotificationType.ORDER_PAID]: 'orderUpdates',
  [NotificationType.ORDER_PREPARING]: 'orderUpdates',
  [NotificationType.ORDER_READY]: 'orderUpdates',
  [NotificationType.ORDER_IN_DELIVERY]: 'orderUpdates',
  [NotificationType.ORDER_DELIVERED]: 'orderUpdates',
  [NotificationType.ORDER_CANCELLED]: 'orderUpdates',
  [NotificationType.ORDER_REFUNDED]: 'orderUpdates',

  // Payment alerts
  [NotificationType.PAYMENT_RECEIVED]: 'paymentAlerts',
  [NotificationType.PAYMENT_FAILED]: 'paymentAlerts',
  [NotificationType.ESCROW_RELEASED]: 'paymentAlerts',
  [NotificationType.ESCROW_DISPUTED]: 'paymentAlerts',
  [NotificationType.PAYOUT_FAILED]: 'paymentAlerts',

  // Product alerts
  [NotificationType.NEW_PRODUCT_NEARBY]: 'productAlerts',
  [NotificationType.PRODUCT_EXPIRING_SOON]: 'productAlerts',
  [NotificationType.PRODUCT_APPROVED]: 'productAlerts',
  [NotificationType.PRODUCT_REJECTED]: 'productAlerts',
  [NotificationType.PRODUCT]: 'productAlerts',

  // Promotions / Deals
  [NotificationType.DEAL_BOOKING_CONFIRMED]: 'promotions',
  [NotificationType.DEAL_BOOKING_REMINDER]: 'promotions',
  [NotificationType.DEAL_APPROVED]: 'promotions',
  [NotificationType.DEAL_REJECTED]: 'promotions',
  [NotificationType.DEAL]: 'promotions',
  [NotificationType.PROMOTION_ALERT]: 'promotions',

  // Donations
  [NotificationType.DONATION_CONFIRMED]: 'orderUpdates',

  // System & Campaigns
  [NotificationType.SUBSCRIPTION_EXPIRING]: 'systemAnnouncements',
  [NotificationType.CAMPAIGN_APPROVED]: 'systemAnnouncements',
  [NotificationType.CAMPAIGN_REJECTED]: 'systemAnnouncements',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'systemAnnouncements',
  [NotificationType.SYSTEM]: 'systemAnnouncements',
  [NotificationType.WELCOME]: 'systemAnnouncements',

  // Supplier & KYC
  [NotificationType.SUPPLIER_VERIFIED]: 'systemAnnouncements',
  [NotificationType.SUPPLIER_REJECTED]: 'systemAnnouncements',
  [NotificationType.KYC_VERIFIED]: 'systemAnnouncements',
  [NotificationType.KYC_REJECTED]: 'systemAnnouncements',
  [NotificationType.KYC_PENDING]: 'systemAnnouncements',

  // Staff
  [NotificationType.STAFF_INVITATION]: 'systemAnnouncements',
};
