import {
  Order,
  OrderStatus,
  PaymentMethod,
  DeliveryMethod,
} from '@prisma/client';

import config from '@/config';
import escrowService from '@/core/services/escrow.service';
import eventService, { AppEvent } from '@/core/services/event.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
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
  paymentMethod: 'WAVE' | 'CASH_ON_DELIVERY';
  // Pour la livraison
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  // Pour le pickup
  pickupSlot?: Date;
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
      const deliveryFee =
        params.deliveryMethod === 'DELIVERY'
          ? config.business.defaultDeliveryFee
          : 0;

      // Commission basée sur le tier du fournisseur
      const commissionRate =
        supplier.commissionRate || config.business.defaultCommissionRate / 100;
      const commission = Math.round(subtotal * commissionRate);

      // Frais Wave (uniquement pour paiement Wave)
      const isWavePayment = params.paymentMethod === 'WAVE';
      const baseAmount = subtotal + deliveryFee;

      // Frais de paiement Wave (1%) - payé par le client
      const wavePaymentFee = isWavePayment
        ? Math.round(baseAmount * config.payment.wave.paymentFeeRate)
        : 0;

      // Frais de transfert Wave (1%) - déduit du montant fournisseur
      const waveTransferFee = isWavePayment
        ? Math.round((baseAmount - commission) * config.payment.wave.transferFeeRate)
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
        const escrowResult = await escrowService.createEscrow({
          orderId: order.id,
          amount: total,
          commission,
          waveTransferFee,
          supplierId: supplier.id,
          supplierWaveId: supplier.waveAccountId || undefined,
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
   * Récupérer les commandes d'un fournisseur
   */
  async getSupplierOrders(
    supplierId: string,
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
      supplierId,
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
