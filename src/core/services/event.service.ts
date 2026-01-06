import { EventEmitter } from 'events';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Application events for decoupled communication between services
 */
export enum AppEvent {
  // Order Events
  ORDER_CREATED = 'order:created',
  ORDER_PAID = 'order:paid',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_CANCELLED = 'order:cancelled',
  ORDER_COMPLETED = 'order:completed',

  // Payment Events
  PAYMENT_CONFIRMED = 'payment:confirmed',
  PAYMENT_FAILED = 'payment:failed',

  // Escrow Events
  ESCROW_FUNDS_HELD = 'escrow:funds_held',
  ESCROW_RELEASED = 'escrow:released',
  ESCROW_REFUNDED = 'escrow:refunded',
  ESCROW_DISPUTED = 'escrow:disputed',
  PAYOUT_FAILED = 'payout:failed',

  // User Events
  USER_REGISTERED = 'user:registered',

  // Product Events
  PRODUCT_EXPIRING_SOON = 'product:expiring_soon',
  NEW_PRODUCT_NEARBY = 'product:new_nearby',

  // Subscription Events
  SUBSCRIPTION_EXPIRING = 'subscription:expiring',

  // Deal Events
  DEAL_BOOKING_CREATED = 'deal:booking_created',
  DEAL_BOOKING_REMINDER = 'deal:booking_reminder',

  // Delivery Events
  DELIVERY_LOCATION_UPDATE = 'delivery:location_update',

  // Donation Events
  DONATION_CREATED = 'donation:created',
  DONATION_STATUS_UPDATED = 'donation:statusUpdated',
  DONATION_PICKUP_SCHEDULED = 'donation:pickupScheduled',
  DONATION_CANCELLED = 'donation:cancelled',
}

/**
 * Type-safe payload definitions for each event
 */
export interface EventPayload {
  [AppEvent.ORDER_CREATED]: {
    orderId: string;
    orderNumber: string;
    userId: string;
    supplierId: string;
    storeId?: string;
    totalAmount: number;
  };
  [AppEvent.ORDER_PAID]: {
    orderId: string;
    orderNumber: string;
    userId: string;
    supplierId: string;
    amount: number;
    paymentMethod: string;
  };
  [AppEvent.ORDER_STATUS_CHANGED]: {
    orderId: string;
    orderNumber: string;
    userId: string;
    supplierId: string;
    oldStatus: string;
    newStatus: string;
  };
  [AppEvent.ORDER_CANCELLED]: {
    orderId: string;
    orderNumber: string;
    userId: string;
    supplierId: string;
    reason: string;
    cancelledBy: 'client' | 'supplier' | 'system';
  };
  [AppEvent.ORDER_COMPLETED]: {
    orderId: string;
    orderNumber: string;
    userId: string;
    supplierId: string;
  };
  [AppEvent.PAYMENT_CONFIRMED]: {
    orderId: string;
    userId: string;
    supplierId: string;
    amount: number;
    wavePaymentId?: string;
  };
  [AppEvent.PAYMENT_FAILED]: {
    orderId: string;
    userId: string;
    reason: string;
  };
  [AppEvent.ESCROW_FUNDS_HELD]: {
    orderId: string;
    escrowId: string;
    amount: number;
  };
  [AppEvent.ESCROW_RELEASED]: {
    orderId: string;
    escrowId: string;
    supplierId: string;
    supplierUserId: string;
    amount: number;
  };
  [AppEvent.ESCROW_REFUNDED]: {
    orderId: string;
    escrowId: string;
    userId: string;
    amount: number;
    reason?: string;
  };
  [AppEvent.ESCROW_DISPUTED]: {
    orderId: string;
    escrowId: string;
    userId: string;
    supplierId: string;
    reason: string;
  };
  [AppEvent.PAYOUT_FAILED]: {
    orderId: string;
    escrowId: string;
    supplierId: string;
    supplierUserId: string;
    amount: number;
    reason: string;
  };
  [AppEvent.USER_REGISTERED]: {
    userId: string;
    firstName: string;
    phoneNumber: string;
    role: string;
  };
  [AppEvent.PRODUCT_EXPIRING_SOON]: {
    productId: string;
    supplierId: string;
    supplierUserId: string;
    productTitle: string;
    expiryDate: Date;
    hoursRemaining: number;
  };
  [AppEvent.NEW_PRODUCT_NEARBY]: {
    productId: string;
    productTitle: string;
    supplierId: string;
    userIds: string[];
    latitude: number;
    longitude: number;
  };
  [AppEvent.SUBSCRIPTION_EXPIRING]: {
    supplierId: string;
    supplierUserId: string;
    businessName: string;
    expiresAt: Date;
    daysRemaining: number;
  };
  [AppEvent.DEAL_BOOKING_CREATED]: {
    bookingId: string;
    dealId: string;
    userId: string;
    supplierId: string;
    dealTitle: string;
    bookingDate: Date;
  };
  [AppEvent.DEAL_BOOKING_REMINDER]: {
    bookingId: string;
    dealId: string;
    userId: string;
    dealTitle: string;
    bookingDate: Date;
    hoursRemaining: number;
  };
  [AppEvent.DELIVERY_LOCATION_UPDATE]: {
    orderId: string;
    userId: string;
    latitude: number;
    longitude: number;
  };
  [AppEvent.DONATION_CREATED]: {
    donationId: string;
    donorId: string;
    associationId: string;
    type: string;
    amount?: number;
  };
  [AppEvent.DONATION_STATUS_UPDATED]: {
    donationId: string;
    donorId: string;
    associationId: string;
    oldStatus: string;
    newStatus: string;
  };
  [AppEvent.DONATION_PICKUP_SCHEDULED]: {
    donationId: string;
    donorId: string;
    associationId: string;
    pickupDate: Date;
  };
  [AppEvent.DONATION_CANCELLED]: {
    donationId: string;
    donorId: string;
    associationId: string;
    reason?: string;
    cancelledBy?: string;
  };
}

/**
 * Type-safe event listener type
 */
type EventListener<T extends AppEvent> = (payload: EventPayload[T]) => void | Promise<void>;

/**
 * EventService - Central event bus for application-wide events
 *
 * Enables decoupled communication between services using an event-driven architecture.
 * Services can emit events without knowing who will handle them, and listeners can
 * react to events without coupling to the emitting service.
 */
class EventService {
  private static instance: EventService;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Allow many listeners
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * Emit an event with type-safe payload
   */
  emit<T extends AppEvent>(event: T, payload: EventPayload[T]): void {
    logger.debug('Event emitted', { event, payload });
    this.emitter.emit(event, payload);
  }

  /**
   * Register a persistent listener for an event
   */
  on<T extends AppEvent>(event: T, listener: EventListener<T>): void {
    this.emitter.on(event, listener);
  }

  /**
   * Register a one-time listener for an event
   */
  once<T extends AppEvent>(event: T, listener: EventListener<T>): void {
    this.emitter.once(event, listener);
  }

  /**
   * Remove a specific listener for an event
   */
  off<T extends AppEvent>(event: T, listener: EventListener<T>): void {
    this.emitter.off(event, listener);
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(event?: AppEvent): void {
    this.emitter.removeAllListeners(event);
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: AppEvent): number {
    return this.emitter.listenerCount(event);
  }
}

export const eventService = EventService.getInstance();
export default eventService;
