import eventService, { AppEvent } from '@/core/services/event.service';
import notificationService from '@/core/services/notification.service';
import socketService from '@/infrastructure/websocket/socket.service';
import emailService from '@/infrastructure/messaging/email/email.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { NotificationType, NotificationPriority } from '@/utils/enums';

/**
 * Initialize all notification event listeners
 *
 * This sets up the connection between application events and notifications.
 * When services emit events, listeners here create appropriate notifications.
 */
export function initializeNotificationListeners(): void {
  logger.info('Initializing notification event listeners...');

  // ==================== ORDER EVENTS ====================

  /**
   * Order created - Notify supplier of new order
   */
  eventService.on(AppEvent.ORDER_CREATED, async (payload) => {
    try {
      // Get supplier user ID
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { userId: true, businessName: true },
      });

      if (supplier) {
        await notificationService.create({
          userId: supplier.userId,
          type: NotificationType.ORDER_CONFIRMED,
          title: 'Nouvelle commande',
          message: `Vous avez reçu une nouvelle commande #${payload.orderNumber}`,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            totalAmount: payload.totalAmount,
          },
          priority: NotificationPriority.HIGH,
        });
      }
    } catch (error) {
      logger.error('Failed to process ORDER_CREATED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Order paid - Notify client and supplier
   */
  eventService.on(AppEvent.ORDER_PAID, async (payload) => {
    try {
      // Notify client
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.ORDER_PAID,
        title: 'Paiement confirmé',
        message: `Votre paiement de ${payload.amount} FCFA a été reçu`,
        data: {
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          amount: payload.amount,
        },
      });

      // Notify supplier
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { userId: true },
      });

      if (supplier) {
        await notificationService.create({
          userId: supplier.userId,
          type: NotificationType.PAYMENT_RECEIVED,
          title: 'Paiement reçu',
          message: `Commande #${payload.orderNumber} payée - ${payload.amount} FCFA`,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            amount: payload.amount,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to process ORDER_PAID event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Order status changed - Notify client
   */
  eventService.on(AppEvent.ORDER_STATUS_CHANGED, async (payload) => {
    try {
      const statusMessages: Record<
        string,
        { type: NotificationType; title: string; message: string }
      > = {
        PREPARING: {
          type: NotificationType.ORDER_PREPARING,
          title: 'Commande en préparation',
          message: 'Votre commande est en cours de préparation',
        },
        READY_FOR_PICKUP: {
          type: NotificationType.ORDER_READY,
          title: 'Commande prête',
          message: 'Votre commande est prête à être récupérée',
        },
        IN_DELIVERY: {
          type: NotificationType.ORDER_IN_DELIVERY,
          title: 'Commande en livraison',
          message: 'Votre commande est en cours de livraison',
        },
        DELIVERED: {
          type: NotificationType.ORDER_DELIVERED,
          title: 'Commande livrée',
          message: 'Votre commande a été livrée',
        },
      };

      const statusInfo = statusMessages[payload.newStatus];
      if (statusInfo) {
        await notificationService.create({
          userId: payload.userId,
          type: statusInfo.type,
          title: statusInfo.title,
          message: statusInfo.message,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            status: payload.newStatus,
          },
        });

        // Also send real-time order status update
        socketService.sendToOrder(payload.orderId, 'order:status_update', {
          orderId: payload.orderId,
          status: payload.newStatus,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Failed to process ORDER_STATUS_CHANGED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Order cancelled - Notify the other party
   */
  eventService.on(AppEvent.ORDER_CANCELLED, async (payload) => {
    try {
      const cancelledByText =
        payload.cancelledBy === 'client' ? 'le client' : 'le fournisseur';

      // If cancelled by client, notify supplier
      if (payload.cancelledBy === 'client') {
        const supplier = await prisma.supplierProfile.findUnique({
          where: { id: payload.supplierId },
          select: { userId: true },
        });

        if (supplier) {
          await notificationService.create({
            userId: supplier.userId,
            type: NotificationType.ORDER_CANCELLED,
            title: 'Commande annulée',
            message: `La commande #${payload.orderNumber} a été annulée par ${cancelledByText}`,
            data: {
              orderId: payload.orderId,
              orderNumber: payload.orderNumber,
              reason: payload.reason,
            },
            priority: NotificationPriority.HIGH,
          });
        }
      } else {
        // If cancelled by supplier, notify client
        await notificationService.create({
          userId: payload.userId,
          type: NotificationType.ORDER_CANCELLED,
          title: 'Commande annulée',
          message: `Votre commande #${payload.orderNumber} a été annulée: ${payload.reason}`,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            reason: payload.reason,
          },
          priority: NotificationPriority.HIGH,
        });
      }
    } catch (error) {
      logger.error('Failed to process ORDER_CANCELLED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Order completed - Notify supplier of completion
   */
  eventService.on(AppEvent.ORDER_COMPLETED, async (payload) => {
    try {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { userId: true },
      });

      if (supplier) {
        await notificationService.create({
          userId: supplier.userId,
          type: NotificationType.ORDER_DELIVERED,
          title: 'Commande terminée',
          message: `La commande #${payload.orderNumber} est terminée`,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to process ORDER_COMPLETED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  // ==================== ESCROW/PAYMENT EVENTS ====================

  /**
   * Escrow released - Notify supplier of payment
   */
  eventService.on(AppEvent.ESCROW_RELEASED, async (payload) => {
    try {
      await notificationService.create({
        userId: payload.supplierUserId,
        type: NotificationType.ESCROW_RELEASED,
        title: 'Paiement reçu',
        message: `${payload.amount} FCFA ont été transférés sur votre compte Wave`,
        data: {
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          amount: payload.amount,
        },
      });
    } catch (error) {
      logger.error('Failed to process ESCROW_RELEASED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Escrow refunded - Notify client
   */
  eventService.on(AppEvent.ESCROW_REFUNDED, async (payload) => {
    try {
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.ORDER_REFUNDED,
        title: 'Remboursement effectué',
        message: `${payload.amount} FCFA vous ont été remboursés`,
        data: {
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          amount: payload.amount,
          reason: payload.reason,
        },
      });
    } catch (error) {
      logger.error('Failed to process ESCROW_REFUNDED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Escrow disputed - Notify both parties and admins
   */
  eventService.on(AppEvent.ESCROW_DISPUTED, async (payload) => {
    try {
      // Get supplier info
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { userId: true, businessName: true },
      });

      const client = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { firstName: true },
      });

      // Notify client
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.ESCROW_DISPUTED,
        title: 'Dispute ouverte',
        message: 'Une dispute a été ouverte sur votre commande',
        data: {
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          reason: payload.reason,
        },
        priority: NotificationPriority.HIGH,
      });

      // Notify supplier
      if (supplier) {
        await notificationService.create({
          userId: supplier.userId,
          type: NotificationType.ESCROW_DISPUTED,
          title: 'Dispute ouverte',
          message: 'Une dispute a été ouverte sur une commande',
          data: {
            orderId: payload.orderId,
            escrowId: payload.escrowId,
            reason: payload.reason,
          },
          priority: NotificationPriority.HIGH,
        });
      }

      // Notify admins with email
      await notificationService.notifyAdmins({
        type: NotificationType.ESCROW_DISPUTED,
        title: 'Nouvelle dispute ouverte',
        message: `Une dispute nécessite votre attention`,
        data: {
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          reason: payload.reason,
        },
        priority: NotificationPriority.URGENT,
        sendEmail: true,
      });

      // Send detailed email to admin
      if (supplier && client) {
        const order = await prisma.order.findUnique({
          where: { id: payload.orderId },
          select: { total: true },
        });

        await emailService.sendDisputeAlert({
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          clientName: client.firstName,
          supplierName: supplier.businessName,
          amount: order?.total || 0,
          reason: payload.reason,
        });
      }
    } catch (error) {
      logger.error('Failed to process ESCROW_DISPUTED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Payout failed - Critical admin notification
   */
  eventService.on(AppEvent.PAYOUT_FAILED, async (payload) => {
    try {
      // Notify admins
      await notificationService.notifyAdmins({
        type: NotificationType.PAYOUT_FAILED,
        title: 'Échec de paiement fournisseur',
        message: `Le transfert pour la commande a échoué: ${payload.reason}`,
        data: {
          orderId: payload.orderId,
          escrowId: payload.escrowId,
          supplierId: payload.supplierId,
          amount: payload.amount,
          reason: payload.reason,
        },
        priority: NotificationPriority.URGENT,
        sendEmail: true,
      });

      // Send detailed email
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { businessName: true },
      });

      await emailService.sendPayoutFailedAlert({
        orderId: payload.orderId,
        supplierId: payload.supplierId,
        supplierName: supplier?.businessName || 'Inconnu',
        amount: payload.amount,
        reason: payload.reason,
      });
    } catch (error) {
      logger.error('Failed to process PAYOUT_FAILED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  // ==================== USER EVENTS ====================

  /**
   * User registered - Send welcome notification
   */
  eventService.on(AppEvent.USER_REGISTERED, async (payload) => {
    try {
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.WELCOME,
        title: 'Bienvenue sur YapaGachis !',
        message: `Bonjour ${payload.firstName}, bienvenue dans la communauté anti-gaspi !`,
        data: { role: payload.role },
      });
    } catch (error) {
      logger.error('Failed to process USER_REGISTERED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  // ==================== DELIVERY EVENTS ====================

  /**
   * Delivery location update - Send real-time via WebSocket
   */
  eventService.on(AppEvent.DELIVERY_LOCATION_UPDATE, async (payload) => {
    try {
      socketService.sendDeliveryUpdate(payload.orderId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    } catch (error) {
      logger.error('Failed to process DELIVERY_LOCATION_UPDATE event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  // ==================== SUBSCRIPTION EVENTS ====================

  /**
   * Subscription expiring - Notify supplier
   */
  eventService.on(AppEvent.SUBSCRIPTION_EXPIRING, async (payload) => {
    try {
      await notificationService.create({
        userId: payload.supplierUserId,
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        title: 'Abonnement expire bientôt',
        message: `Votre abonnement expire dans ${payload.daysRemaining} jours. Renouvelez-le pour continuer à vendre.`,
        data: {
          supplierId: payload.supplierId,
          businessName: payload.businessName,
          expiresAt: payload.expiresAt,
          daysRemaining: payload.daysRemaining,
        },
        priority:
          payload.daysRemaining <= 3
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
      });
    } catch (error) {
      logger.error('Failed to process SUBSCRIPTION_EXPIRING event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  // ==================== DEAL EVENTS ====================

  /**
   * Deal booking created - Notify user and supplier
   */
  eventService.on(AppEvent.DEAL_BOOKING_CREATED, async (payload) => {
    try {
      // Notify user
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.DEAL_BOOKING_CONFIRMED,
        title: 'Réservation confirmée',
        message: `Votre réservation pour "${payload.dealTitle}" est confirmée`,
        data: {
          bookingId: payload.bookingId,
          dealId: payload.dealId,
          dealTitle: payload.dealTitle,
          bookingDate: payload.bookingDate,
        },
      });

      // Notify supplier
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: payload.supplierId },
        select: { userId: true },
      });

      if (supplier) {
        await notificationService.create({
          userId: supplier.userId,
          type: NotificationType.DEAL_BOOKING_CONFIRMED,
          title: 'Nouvelle réservation',
          message: `Une nouvelle réservation pour "${payload.dealTitle}"`,
          data: {
            bookingId: payload.bookingId,
            dealId: payload.dealId,
            dealTitle: payload.dealTitle,
            bookingDate: payload.bookingDate,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to process DEAL_BOOKING_CREATED event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  /**
   * Deal booking reminder - Notify user before their booking
   */
  eventService.on(AppEvent.DEAL_BOOKING_REMINDER, async (payload) => {
    try {
      await notificationService.create({
        userId: payload.userId,
        type: NotificationType.DEAL_BOOKING_REMINDER,
        title: 'Rappel de réservation',
        message: `Votre réservation "${payload.dealTitle}" est dans ${payload.hoursRemaining}h`,
        data: {
          bookingId: payload.bookingId,
          dealId: payload.dealId,
          dealTitle: payload.dealTitle,
          bookingDate: payload.bookingDate,
        },
        priority: NotificationPriority.HIGH,
      });
    } catch (error) {
      logger.error('Failed to process DEAL_BOOKING_REMINDER event', {
        error: (error as Error).message,
        payload,
      });
    }
  });

  logger.info('Notification event listeners initialized', {
    eventCount: Object.keys(AppEvent).length,
  });
}

export default initializeNotificationListeners;
