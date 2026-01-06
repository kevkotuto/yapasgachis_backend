import { prisma } from '@/infrastructure/database/prisma';
import { Order, OrderStatus, OrderItem, Prisma } from '@prisma/client';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Order Repository
 * Data access layer for orders
 */
export class OrderRepository {
  /**
   * Create a new order with items
   */
  async create(data: {
    userId: string;
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    deliveryFee: number;
    total: number;
    commission: number;
    supplierAmount: number;
    deliveryMethod: 'PICKUP' | 'DELIVERY';
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    deliveryNotes?: string;
    paymentMethod: 'WAVE' | 'CASH_ON_DELIVERY';
    pickupSlot?: Date;
  }): Promise<Order> {
    try {
      const order = await prisma.order.create({
        data: {
          clientId: data.userId,
          supplierId: data.supplierId,
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          total: data.total,
          commission: data.commission,
          supplierAmount: data.supplierAmount,
          status: OrderStatus.PENDING_PAYMENT,
          deliveryMethod: data.deliveryMethod,
          deliveryAddress: data.deliveryAddress,
          deliveryLatitude: data.deliveryLatitude,
          deliveryLongitude: data.deliveryLongitude,
          deliveryNotes: data.deliveryNotes,
          paymentMethod: data.paymentMethod,
          pickupSlot: data.pickupSlot,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  supplier: true,
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

      return order;
    } catch (error) {
      logger.error('Error creating order', {
        userId: data.userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<Order | null> {
    try {
      return await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  supplier: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          phoneNumber: true,
                        },
                      },
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
          tracking: true,
        },
      });
    } catch (error) {
      logger.error('Error finding order by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    metadata?: any
  ): Promise<Order> {
    try {
      const updateData: any = {
        status,
      };

      // Set timestamps based on status
      switch (status) {
        case OrderStatus.PAID:
          updateData.paidAt = new Date();
          break;
        case OrderStatus.IN_DELIVERY:
          updateData.deliveredAt = new Date();
          break;
        case OrderStatus.COMPLETED:
          updateData.deliveredAt = new Date();
          break;
        case OrderStatus.CANCELLED:
          updateData.cancelledAt = new Date();
          break;
      }

      return await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating order status', {
        id,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get orders by user ID
   */
  async findByUserId(
    userId: string,
    filters?: {
      status?: OrderStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.OrderWhereInput = {
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
                    supplier: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error finding orders by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get orders by supplier ID
   */
  async findBySupplierId(
    supplierId: string,
    filters?: {
      status?: OrderStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    try {
      // Find orders that contain products from this supplier
      const where: Prisma.OrderWhereInput = {
        items: {
          some: {
            product: {
              supplierId,
            },
          },
        },
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
                    supplier: true,
                  },
                },
              },
              where: {
                product: {
                  supplierId,
                },
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error finding orders by supplier ID', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get order statistics for a user
   */
  async getUserStatistics(userId: string): Promise<{
    totalOrders: number;
    completedOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  }> {
    try {
      const [totalOrders, completedOrders, orders] = await Promise.all([
        prisma.order.count({ where: { clientId: userId } }),
        prisma.order.count({
          where: { clientId: userId, status: OrderStatus.COMPLETED },
        }),
        prisma.order.findMany({
          where: { clientId: userId, status: OrderStatus.COMPLETED },
          select: { total: true },
        }),
      ]);

      const totalSpent = orders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      const averageOrderValue =
        completedOrders > 0 ? totalSpent / completedOrders : 0;

      return {
        totalOrders,
        completedOrders,
        totalSpent,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting user order statistics', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get order statistics for a supplier
   */
  async getSupplierStatistics(supplierId: string): Promise<{
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      // Get all orders containing products from this supplier
      const orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                supplierId,
              },
            },
          },
        },
        include: {
          items: {
            where: {
              product: {
                supplierId,
              },
            },
          },
        },
      });

      const totalOrders = orders.length;
      const completedOrders = orders.filter(
        (o) => o.status === OrderStatus.COMPLETED
      ).length;

      // Calculate revenue from completed orders
      const totalRevenue = orders
        .filter((o) => o.status === OrderStatus.COMPLETED)
        .reduce((sum, order) => {
          const supplierItemsTotal = order.items.reduce(
            (itemSum, item) => itemSum + Number(item.totalPrice),
            0
          );
          return sum + supplierItemsTotal;
        }, 0);

      const averageOrderValue =
        completedOrders > 0 ? totalRevenue / completedOrders : 0;

      return {
        totalOrders,
        completedOrders,
        totalRevenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting supplier order statistics', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancel(id: string, reason?: string): Promise<Order> {
    try {
      return await prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Commande annulée par le client',
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error cancelling order', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get recent orders
   */
  async getRecent(limit: number = 10): Promise<Order[]> {
    try {
      return await prisma.order.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting recent orders', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search orders
   */
  async search(params: {
    search?: string;
    status?: OrderStatus;
    userId?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const {
      search,
      status,
      userId,
      supplierId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.OrderWhereInput = {
        ...(userId && { clientId: userId }),
        ...(supplierId && {
          items: {
            some: {
              product: {
                supplierId,
              },
            },
          },
        }),
        ...(status && { status }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        ...(search && {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { deliveryAddress: { contains: search, mode: 'insensitive' } },
            {
              client: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { phoneNumber: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  include: {
                    supplier: true,
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
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error searching orders', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new OrderRepository();
