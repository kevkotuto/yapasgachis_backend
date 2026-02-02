import { Request, Response } from 'express';

import {
  CreateOrderInput,
  GetOrderByIdInput,
  GetUserOrdersInput,
  UpdateOrderStatusInput,
  CancelOrderInput,
  CheckPaymentStatusInput,
  SearchOrdersInput,
  CalculateDeliveryFeeInput,
} from '../validators/order.validator';

import orderRepository from '@/core/repositories/order.repository';
import supplierRepository from '@/core/repositories/supplier.repository';
import orderService from '@/core/services/order.service';
import logger from '@/infrastructure/monitoring/logger';
import mobileMoneyService from '@/infrastructure/payment/mobile-money.service';
import { asyncHandler } from '@/utils/helpers';

/**
 * Order Controller
 * Handles order and payment HTTP requests
 */
export class OrderController {
  /**
   * Create order with payment
   * POST /api/v1/orders
   */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateOrderInput;

    // Map paymentProvider to paymentMethod for the service
    const { paymentProvider, ...rest } = body;
    const { order, paymentUrl } = await orderService.createOrder({
      userId,
      ...rest,
      paymentMethod: paymentProvider,
    });

    logger.info('Order created via API', {
      userId,
      orderId: order.id,
      total: order.total,
    });

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        order,
        payment: {
          paymentUrl,
          status: order.status,
        },
      },
    });
  });

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  getOrder = asyncHandler(
    async (req: Request<GetOrderByIdInput>, res: Response) => {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await orderService.getOrderById(id, userId);

      res.json({
        success: true,
        data: { order },
      });
    }
  );

  /**
   * Get user's orders
   * GET /api/v1/orders/my-orders
   */
  getMyOrders = asyncHandler(
    async (req: Request<{}, {}, {}, GetUserOrdersInput>, res: Response) => {
      const userId = req.user.id;

      const result = await orderService.getUserOrders(userId, req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get supplier's orders
   * GET /api/v1/orders/supplier-orders
   */
  getSupplierOrders = asyncHandler(
    async (req: Request<{}, {}, {}, GetUserOrdersInput>, res: Response) => {
      const userId = req.user.id;

      // Get supplier profile
      const supplier = await supplierRepository.findByUserId(userId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Profil fournisseur non trouvé',
          code: 'SUPPLIER_NOT_FOUND',
        });
      }

      const result = await orderService.getSupplierOrders(
        supplier.id,
        req.query
      );

      return res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Update order status (supplier only)
   * PATCH /api/v1/orders/:id/status
   */
  updateOrderStatus = asyncHandler(
    async (
      req: Request<
        UpdateOrderStatusInput['params'],
        {},
        UpdateOrderStatusInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { status } = req.body;

      // Get supplier profile
      const supplier = await supplierRepository.findByUserId(userId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Profil fournisseur non trouvé',
          code: 'SUPPLIER_NOT_FOUND',
        });
      }

      const order = await orderService.updateOrderStatus(
        id,
        supplier.id,
        status
      );

      logger.info('Order status updated via API', {
        userId,
        orderId: id,
        status,
      });

      return res.json({
        success: true,
        message: 'Statut de la commande mis à jour',
        data: { order },
      });
    }
  );

  /**
   * Cancel order
   * POST /api/v1/orders/:id/cancel
   */
  cancelOrder = asyncHandler(
    async (
      req: Request<CancelOrderInput['params'], {}, CancelOrderInput['body']>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(id, userId, reason);

      logger.info('Order cancelled via API', {
        userId,
        orderId: id,
      });

      res.json({
        success: true,
        message: 'Commande annulée avec succès',
        data: { order },
      });
    }
  );

  /**
   * Get order statistics
   * GET /api/v1/orders/statistics
   */
  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const statistics = await orderRepository.getUserStatistics(userId);

    res.json({
      success: true,
      data: { statistics },
    });
  });

  /**
   * Get supplier order statistics
   * GET /api/v1/orders/supplier-statistics
   */
  getSupplierStatistics = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { storeId } = req.query;

    // Get supplier profile
    const supplier = await supplierRepository.findByUserId(userId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Profil fournisseur non trouvé',
        code: 'SUPPLIER_NOT_FOUND',
      });
    }

    const statistics = await orderRepository.getSupplierStatistics(
      supplier.id,
      storeId as string | undefined
    );

    return res.json({
      success: true,
      data: { statistics },
    });
  });

  /**
   * Calculate delivery fee
   * POST /api/v1/orders/calculate-delivery-fee
   */
  calculateDeliveryFee = asyncHandler(async (req: Request, res: Response) => {
    const { storeId, supplierId, deliveryLatitude, deliveryLongitude } =
      req.body as CalculateDeliveryFeeInput;

    const result = await orderService.calculateDeliveryFee({
      storeId,
      supplierId,
      deliveryLatitude: deliveryLatitude!,
      deliveryLongitude: deliveryLongitude!,
    });

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Check payment status
   * GET /api/v1/payments/:transactionId/status
   */
  checkPaymentStatus = asyncHandler(
    async (req: Request<CheckPaymentStatusInput>, res: Response) => {
      const { transactionId } = req.params;

      const payment =
        await mobileMoneyService.checkPaymentStatus(transactionId);

      res.json({
        success: true,
        data: { payment },
      });
    }
  );

  /**
   * Get supported payment providers
   * GET /api/v1/payments/providers
   */
  getPaymentProviders = asyncHandler(async (req: Request, res: Response) => {
    const providers = mobileMoneyService.getSupportedProviders().map((p) => ({
      code: p,
      name: mobileMoneyService.getProviderName(p),
    }));

    res.json({
      success: true,
      data: { providers },
    });
  });
}

export default new OrderController();
