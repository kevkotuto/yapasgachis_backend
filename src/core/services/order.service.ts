import {
  Order,
  OrderStatus,
  PaymentMethod,
  DeliveryMethod,
} from '@prisma/client';

import config from '@/config';
import escrowService from '@/core/services/escrow.service';
import eventService, { AppEvent } from '@/core/services/event.service';
import platformSettingsService from '@/core/services/platform-settings.service';
import { prisma } from '@/infrastructure/database/prisma';
import { MobileMoneyProvider } from '@/infrastructure/payment/mobile-money.service';
import logger from '@/infrastructure/monitoring/logger';
import socketService from '@/infrastructure/websocket/socket.service';
import { AppError } from '@/middleware/error-handler.middleware';
import { generateQRCode } from '@/utils/qr-code.utils';

/**
 * Order Service
 * Gère la création et le cycle de vie des commandes
 *
 * Modes de livraison:
 * - DELIVERY: Livraison à domicile
 * - PICKUP: À emporter (le client récupère au magasin)
 *
 * Modes de paiement:
 * - WAVE: Paiement via Wave (escrow)
 * - CASH_ON_DELIVERY: Paiement en espèces (si autorisé par le fournisseur)
 */

export interface CreateOrderParams {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  paymentMethod: MobileMoneyProvider | 'CASH_ON_DELIVERY';
  // Pour la livraison
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  // Pour le pickup
  pickupSlot?: Date;
  scheduledPickupTime?: string; // Créneau horaire "14:00-16:00"
}

export interface OrderWithDetails extends Order {
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      title: string;
      images: any;
      supplier: {
        id: string;
        businessName: string;
        address: string;
        acceptCashPayment: boolean;
      };
    };
  }>;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
  };
  escrowTransaction?: {
    id: string;
    status: string;
    amount: number;
  };
}

export class OrderService {
  private static instance: OrderService;

  private constructor() {}

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  /**
   * Créer une nouvelle commande
   */
  async createOrder(params: CreateOrderParams): Promise<{
    order: OrderWithDetails;
    paymentUrl?: string; // URL Wave si paiement Wave
  }> {
    try {
      // 1. Valider et récupérer les produits
      const products = await this.validateAndGetProducts(params.items);

      // 2. Vérifier que tous les produits sont du même fournisseur
      const supplierIds = [...new Set(products.map((p) => p.supplierId))];
      if (supplierIds.length > 1) {
        throw new AppError(
          400,
          'Tous les produits doivent provenir du même fournisseur',
          'MULTIPLE_SUPPLIERS'
        );
      }

      // 3. Récupérer le fournisseur
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: supplierIds[0] },
        include: {
          user: {
            select: { phoneNumber: true },
          },
        },
      });

      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé');
      }

      // 4. Vérifier que le mode de paiement est autorisé
      if (
        params.paymentMethod === 'CASH_ON_DELIVERY' &&
        !supplier.acceptCashPayment
      ) {
        throw new AppError(
          400,
          "Ce fournisseur n'accepte pas le paiement en espèces",
          'CASH_NOT_ACCEPTED'
        );
      }

      // 5. Vérifier la méthode de livraison
      if (params.deliveryMethod === 'DELIVERY' && !supplier.deliveryEnabled) {
        throw new AppError(
          400,
          'Ce fournisseur ne propose pas la livraison',
          'DELIVERY_NOT_AVAILABLE'
        );
      }

      if (params.deliveryMethod === 'PICKUP' && !supplier.pickupEnabled) {
        throw new AppError(
          400,
          'Ce fournisseur ne propose pas le retrait en magasin',
          'PICKUP_NOT_AVAILABLE'
        );
      }

      // 6. Calculer les montants
      const orderItems = params.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.discountedPrice,
          totalPrice: product.discountedPrice * item.quantity,
        };
      });

      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      // Récupérer les paramètres depuis la base de données (ou fallback config)
      const [businessSettings, waveSettings] = await Promise.all([
        platformSettingsService.getBusinessSettings(),
        platformSettingsService.getWaveSettings(),
      ]);

      const deliveryFee =
        params.deliveryMethod === 'DELIVERY'
          ? businessSettings.defaultDeliveryFee
          : 0;

      // Commission basée sur le tier du fournisseur (ou défaut de la plateforme)
      const commissionRate =
        supplier.commissionRate || businessSettings.defaultCommissionRate;
      const commission = Math.round(subtotal * commissionRate);

      // Frais Wave (uniquement pour paiement Wave)
      const isWavePayment = params.paymentMethod === 'WAVE';
      const baseAmount = subtotal + deliveryFee;

      // Frais de paiement Wave - payé par le client
      const wavePaymentFee = isWavePayment
        ? Math.round(baseAmount * waveSettings.wavePaymentFeeRate)
        : 0;

      // Frais de transfert Wave - déduit du montant fournisseur
      const waveTransferFee = isWavePayment
        ? Math.round(
            (baseAmount - commission) * waveSettings.waveTransferFeeRate
          )
        : 0;

      // Total payé par le client (inclut les frais de paiement Wave)
      const total = baseAmount + wavePaymentFee;

      // Montant net pour le fournisseur (déduit commission + frais de transfert)
      const supplierAmount = baseAmount - commission - waveTransferFee;

      // 7. Générer le code de pickup/livraison
      const pickupCode = this.generatePickupCode();

      // 8. Créer la commande
      const order = await prisma.order.create({
        data: {
          clientId: params.userId,
          supplierId: supplier.id,
          status:
            params.paymentMethod === 'WAVE'
              ? OrderStatus.PENDING_PAYMENT
              : OrderStatus.PAID, // Cash = considéré comme "payé" à la réception
          deliveryMethod: params.deliveryMethod as DeliveryMethod,
          paymentMethod: params.paymentMethod as PaymentMethod,
          subtotal,
          deliveryFee,
          commission,
          wavePaymentFee,
          waveTransferFee,
          supplierAmount,
          total,
          pickupCode,
          pickupSlot: params.pickupSlot,
          scheduledPickupTime: params.scheduledPickupTime,
          deliveryAddress: params.deliveryAddress,
          deliveryLatitude: params.deliveryLatitude,
          deliveryLongitude: params.deliveryLongitude,
          deliveryNotes: params.deliveryNotes,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      businessName: true,
                      address: true,
                      acceptCashPayment: true,
                    },
                  },
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      });

      // 9. Réduire le stock des produits
      await this.updateProductStock(params.items, -1);

      let paymentUrl: string | undefined;

      // 10. Si paiement Wave, créer l'escrow et obtenir l'URL de paiement
      if (params.paymentMethod === 'WAVE') {
        // Extract Wave account info from payout account info
        let supplierWaveId: string | undefined;
        if (
          supplier.payoutAccountInfo &&
          typeof supplier.payoutAccountInfo === 'object'
        ) {
          const accountInfo = supplier.payoutAccountInfo as any;
          supplierWaveId =
            accountInfo.phoneNumber || accountInfo.accountId || undefined;
        }

        const escrowResult = await escrowService.createEscrow({
          orderId: order.id,
          amount: total,
          commission,
          waveTransferFee,
          supplierId: supplier.id,
          supplierWaveId,
        });
        paymentUrl = escrowResult.checkoutUrl;
      }

      logger.info('Order created', {
        orderId: order.id,
        userId: params.userId,
        total,
        paymentMethod: params.paymentMethod,
        deliveryMethod: params.deliveryMethod,
      });

      // Emit ORDER_CREATED event
      eventService.emit(AppEvent.ORDER_CREATED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: params.userId,
        supplierId: supplier.id,
        storeId: undefined,
        totalAmount: total,
      });

      // Send WebSocket notification to supplier
      socketService.sendToUser(supplier.id, 'order:new', {
        order,
      });

      return {
        order: order as OrderWithDetails,
        paymentUrl,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create order', {
        userId: params.userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création de la commande');
    }
  }

  /**
   * Récupérer une commande par ID
   */
  async getOrderById(
    orderId: string,
    userId?: string
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    acceptCashPayment: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        escrowTransaction: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Commande non trouvée');
    }

    // Si un userId est fourni, vérifier l'accès
    if (userId && order.clientId !== userId) {
      throw new AppError(403, 'Accès non autorisé à cette commande');
    }

    return order as unknown as OrderWithDetails;
  }

  /**
   * Client confirme la réception (livraison ou pickup)
   */
  async confirmDelivery(
    orderId: string,
    userId: string
  ): Promise<OrderWithDetails> {
    const order = await this.getOrderById(orderId, userId);

    if (
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.READY_FOR_PICKUP
    ) {
      throw new AppError(
        400,
        'La commande ne peut pas être confirmée dans cet état'
      );
    }

    // Mettre à jour la commande
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryConfirmedByClient: true,
        deliveredAt: new Date(),
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    acceptCashPayment: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        supplier: {
          include: {
            user: {
              select: { phoneNumber: true },
            },
          },
        },
      },
    });

    // Si paiement Wave, libérer les fonds vers le fournisseur
    if (order.paymentMethod === PaymentMethod.WAVE) {
      try {
        const supplierPhone = (updated as any).supplier?.user?.phoneNumber;
        if (supplierPhone) {
          await escrowService.releaseToSupplier(orderId, supplierPhone);
        }
      } catch (error) {
        logger.error('Failed to release escrow funds', {
          orderId,
          error: (error as Error).message,
        });
        // Ne pas faire échouer la confirmation même si le transfert échoue
        // L'admin pourra faire le transfert manuellement
      }
    }

    logger.info('Delivery confirmed by client', {
      orderId,
      userId,
    });

    // Emit ORDER_COMPLETED event
    eventService.emit(AppEvent.ORDER_COMPLETED, {
      orderId,
      orderNumber: order.orderNumber,
      userId,
      supplierId: order.supplierId,
    });

    // Send WebSocket notifications
    socketService.sendToUser(order.supplierId, 'order:completed', {
      order: updated,
    });
    socketService.sendToOrder(orderId, 'order:status_changed', {
      orderId,
      status: OrderStatus.COMPLETED,
      oldStatus: order.status,
    });

    return updated as unknown as OrderWithDetails;
  }

  /**
   * Fournisseur met à jour le statut de la commande
   */
  async updateOrderStatus(
    orderId: string,
    supplierId: string,
    newStatus: OrderStatus
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Commande non trouvée');
    }

    if (order.supplierId !== supplierId) {
      throw new AppError(403, 'Accès non autorisé à cette commande');
    }

    // Valider la transition de statut
    this.validateStatusTransition(
      order.status,
      newStatus,
      order.deliveryMethod
    );

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    acceptCashPayment: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    logger.info('Order status updated by supplier', {
      orderId,
      supplierId,
      oldStatus: order.status,
      newStatus,
    });

    // Emit ORDER_STATUS_CHANGED event
    eventService.emit(AppEvent.ORDER_STATUS_CHANGED, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.clientId,
      supplierId,
      oldStatus: order.status,
      newStatus,
    });

    // Send WebSocket notifications
    socketService.sendToUser(order.clientId, 'order:updated', {
      order: updated,
    });
    socketService.sendToOrder(orderId, 'order:status_changed', {
      orderId,
      status: newStatus,
      oldStatus: order.status,
    });

    return updated as unknown as OrderWithDetails;
  }

  /**
   * Annuler une commande
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string,
    isSupplier: boolean = false
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Commande non trouvée');
    }

    // Vérifier l'autorisation
    if (!isSupplier && order.clientId !== userId) {
      throw new AppError(403, 'Accès non autorisé');
    }
    if (isSupplier && order.supplierId !== userId) {
      throw new AppError(403, 'Accès non autorisé');
    }

    // Vérifier si annulation possible
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.PREPARING,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new AppError(
        400,
        'Cette commande ne peut plus être annulée',
        'CANNOT_CANCEL'
      );
    }

    // Restaurer le stock
    const items = await prisma.orderItem.findMany({
      where: { orderId },
    });
    await this.updateProductStock(
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      1
    );

    // Mettre à jour la commande
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    acceptCashPayment: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    // Si paiement Wave déjà effectué, annuler l'escrow
    if (order.paymentMethod === PaymentMethod.WAVE && order.paidAt) {
      try {
        await escrowService.cancelEscrow(orderId);
      } catch (error) {
        logger.error('Failed to cancel escrow', {
          orderId,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Order cancelled', {
      orderId,
      cancelledBy: isSupplier ? 'supplier' : 'client',
      reason,
    });

    // Emit ORDER_CANCELLED event
    eventService.emit(AppEvent.ORDER_CANCELLED, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.clientId,
      supplierId: order.supplierId,
      reason,
      cancelledBy: isSupplier ? 'supplier' : 'client',
    });

    // Send WebSocket notifications
    const targetUserId = isSupplier ? order.clientId : order.supplierId;
    socketService.sendToUser(targetUserId, 'order:cancelled', {
      order: updated,
      reason,
      cancelledBy: isSupplier ? 'supplier' : 'client',
    });
    socketService.sendToOrder(orderId, 'order:status_changed', {
      orderId,
      status: OrderStatus.CANCELLED,
      oldStatus: order.status,
      reason,
    });

    return updated as unknown as OrderWithDetails;
  }

  /**
   * Récupérer les commandes d'un utilisateur
   */
  async getUserOrders(
    userId: string,
    params: {
      status?: OrderStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    orders: OrderWithDetails[];
    total: number;
    pages: number;
  }> {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      clientId: userId,
      ...(status && { status }),
    };

    try {
      logger.info('Starting getUserOrders', {
        userId,
        params,
        where,
        skip,
        limit,
      });

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    originalPrice: true,
                    discountedPrice: true,
                    images: true,
                    category: true,
                  },
                },
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      logger.info('Successfully fetched user orders', {
        userId,
        ordersCount: orders.length,
        total,
      });

      return {
        orders: orders as unknown as OrderWithDetails[],
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching user orders', {
        userId,
        params,
        where,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Récupérer les commandes d'un fournisseur
   */
  async getSupplierOrders(
    supplierId: string,
    params: {
      storeId?: string;
      status?: OrderStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    orders: OrderWithDetails[];
    total: number;
    pages: number;
  }> {
    const { storeId, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      supplierId,
      ...(storeId && { storeId }),
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      businessName: true,
                      address: true,
                      acceptCashPayment: true,
                    },
                  },
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders as unknown as OrderWithDetails[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Générer le QR code pour le pickup
   */
  async getPickupQRCode(orderId: string, userId: string): Promise<string> {
    const order = await this.getOrderById(orderId, userId);

    if (!order.pickupCode) {
      throw new AppError(400, 'Aucun code de pickup pour cette commande');
    }

    const qrData = JSON.stringify({
      orderId: order.id,
      pickupCode: order.pickupCode,
      orderNumber: order.orderNumber,
    });

    return generateQRCode(qrData);
  }

  /**
   * Valider un code de pickup (pour le fournisseur)
   */
  async validatePickupCode(
    supplierId: string,
    pickupCode: string
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findFirst({
      where: {
        supplierId,
        pickupCode,
        status: OrderStatus.READY_FOR_PICKUP,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    address: true,
                    acceptCashPayment: true,
                  },
                },
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(
        404,
        'Aucune commande trouvée avec ce code de pickup',
        'INVALID_PICKUP_CODE'
      );
    }

    return order as unknown as OrderWithDetails;
  }

  // ==================== HELPERS PRIVÉS ====================

  private async validateAndGetProducts(
    items: Array<{ productId: string; quantity: number }>
  ) {
    const productIds = items.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        supplier: true,
      },
    });

    // Vérifier que tous les produits existent
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        throw new AppError(
          404,
          `Produit ${item.productId} non trouvé`,
          'PRODUCT_NOT_FOUND'
        );
      }

      if (product.status !== 'ACTIVE') {
        throw new AppError(
          400,
          `Le produit "${product.title}" n'est pas disponible`,
          'PRODUCT_UNAVAILABLE'
        );
      }

      if (product.quantityAvailable < item.quantity) {
        throw new AppError(
          400,
          `Stock insuffisant pour "${product.title}". Disponible: ${product.quantityAvailable}`,
          'INSUFFICIENT_STOCK'
        );
      }

      // Vérifier si le produit a expiré
      if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
        throw new AppError(
          400,
          `Le produit "${product.title}" a expiré`,
          'PRODUCT_EXPIRED'
        );
      }
    }

    return products;
  }

  private async updateProductStock(
    items: Array<{ productId: string; quantity: number }>,
    multiplier: number // -1 pour réduire, 1 pour restaurer
  ) {
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantityAvailable: {
            increment: item.quantity * multiplier,
          },
        },
      });
    }
  }

  /**
   * Calculer les frais de livraison
   */
  async calculateDeliveryFee(params: {
    storeId?: string;
    supplierId?: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
  }): Promise<{
    deliveryFee: number;
    distance: number;
    estimatedTime: number;
    canDeliver: boolean;
    message?: string;
  }> {
    try {
      let storeLatitude: number;
      let storeLongitude: number;
      let deliveryRadius: number;

      let store: any = null;

      if (params.storeId) {
        // Récupérer le magasin avec les champs de pricing
        store = await prisma.supplierStore.findUnique({
          where: { id: params.storeId },
          select: {
            id: true,
            deliveryEnabled: true,
            latitude: true,
            longitude: true,
            deliveryRadius: true,
            deliveryPricingMode: true,
            deliveryBasePrice: true,
            deliveryPricePerKm: true,
            deliveryFlatPrice: true,
          },
        });

        if (!store) {
          throw new AppError(404, 'Magasin non trouvé');
        }

        if (!store.deliveryEnabled) {
          return {
            deliveryFee: 0,
            distance: 0,
            estimatedTime: 0,
            canDeliver: false,
            message: 'Ce magasin ne propose pas la livraison',
          };
        }

        if (!store.latitude || !store.longitude) {
          throw new AppError(
            400,
            'Les coordonnées du magasin ne sont pas configurées'
          );
        }

        storeLatitude = store.latitude;
        storeLongitude = store.longitude;
        deliveryRadius = store.deliveryRadius || 20;
      } else if (params.supplierId) {
        // Récupérer le fournisseur
        const supplier = await prisma.supplierProfile.findUnique({
          where: { id: params.supplierId },
        });

        if (!supplier) {
          throw new AppError(404, 'Fournisseur non trouvé');
        }

        if (!supplier.deliveryEnabled) {
          return {
            deliveryFee: 0,
            distance: 0,
            estimatedTime: 0,
            canDeliver: false,
            message: 'Ce fournisseur ne propose pas la livraison',
          };
        }

        if (!supplier.latitude || !supplier.longitude) {
          throw new AppError(
            400,
            'Les coordonnées du fournisseur ne sont pas configurées'
          );
        }

        storeLatitude = supplier.latitude;
        storeLongitude = supplier.longitude;
        deliveryRadius = supplier.deliveryRadius || 20;
      } else {
        throw new AppError(
          400,
          'Vous devez fournir soit un storeId soit un supplierId'
        );
      }

      // Calculer la distance
      const distance = this.calculateDistance(
        storeLatitude,
        storeLongitude,
        params.deliveryLatitude,
        params.deliveryLongitude
      );

      // Vérifier si dans le rayon de livraison
      if (distance > deliveryRadius) {
        return {
          deliveryFee: 0,
          distance,
          estimatedTime: 0,
          canDeliver: false,
          message: `Livraison non disponible (distance: ${distance.toFixed(1)} km, maximum: ${deliveryRadius} km)`,
        };
      }

      // Récupérer les paramètres de livraison globaux
      const businessSettings =
        await platformSettingsService.getBusinessSettings();

      // Calculer les frais selon la configuration du store
      let deliveryFee: number;

      if (store && params.storeId) {
        // Utiliser la configuration personnalisée du store si disponible
        if (store.deliveryPricingMode === 'FLAT') {
          // Mode prix fixe
          deliveryFee = store.deliveryFlatPrice
            ? Number(store.deliveryFlatPrice)
            : businessSettings.defaultDeliveryFee;
        } else {
          // Mode basé sur distance (DISTANCE_BASED)
          const basePrice = store.deliveryBasePrice
            ? Number(store.deliveryBasePrice)
            : businessSettings.defaultDeliveryFee;

          const pricePerKm = store.deliveryPricePerKm
            ? Number(store.deliveryPricePerKm)
            : businessSettings.deliveryFeePerKm;

          deliveryFee = basePrice + distance * pricePerKm;
        }
      } else {
        // Fallback : utiliser les paramètres globaux (cas supplierId)
        deliveryFee =
          businessSettings.defaultDeliveryFee +
          distance * businessSettings.deliveryFeePerKm;
      }

      // Estimer le temps (30 km/h en moyenne en ville)
      const estimatedTime = Math.ceil((distance / 30) * 60); // en minutes

      return {
        deliveryFee: Math.round(deliveryFee),
        distance: Math.round(distance * 10) / 10, // Arrondi à 1 décimale
        estimatedTime,
        canDeliver: true,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error calculating delivery fee', {
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du calcul des frais de livraison');
    }
  }

  /**
   * Calculer la distance entre deux points GPS (formule de Haversine)
   * @returns distance en kilomètres
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private generatePickupCode(): string {
    // Code à 6 caractères alphanumériques
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
    deliveryMethod: DeliveryMethod
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]:
        deliveryMethod === DeliveryMethod.PICKUP
          ? [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED]
          : [OrderStatus.IN_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.READY_FOR_PICKUP]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.IN_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new AppError(
        400,
        `Transition de statut invalide: ${current} → ${next}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }
}

export default OrderService.getInstance();
