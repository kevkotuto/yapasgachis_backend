import { EscrowStatus } from '@prisma/client';
import { Request, Response } from 'express';

import escrowService from '@/core/services/escrow.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

/**
 * Admin Payment Controller
 * Gestion des paiements, escrow, litiges et remboursements
 */

/**
 * @route GET /api/v1/admin/payments/escrow
 * @desc Récupérer toutes les transactions escrow avec filtres
 * @access Admin
 */
export const getEscrowTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      status,
      supplierId,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await escrowService.getAll({
      status: status as EscrowStatus | undefined,
      supplierId: supplierId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result.escrows,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      },
    });
  }
);

/**
 * @route GET /api/v1/admin/payments/escrow/:orderId
 * @desc Récupérer une transaction escrow par orderId
 * @access Admin
 */
export const getEscrowByOrderId = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const escrow = await escrowService.getByOrderId(orderId);

    if (!escrow) {
      throw new AppError(404, 'Transaction escrow non trouvée');
    }

    res.json({
      success: true,
      data: escrow,
    });
  }
);

/**
 * @route GET /api/v1/admin/payments/statistics
 * @desc Statistiques des paiements escrow
 * @access Admin
 */
export const getPaymentStatistics = asyncHandler(
  async (_req: Request, res: Response) => {
    const statistics = await escrowService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  }
);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/release
 * @desc Libérer manuellement les fonds vers le fournisseur
 * @access Admin
 */
export const releaseEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { supplierPhoneNumber } = req.body as {
      supplierPhoneNumber?: string;
    };
    const adminId = req.user.id;

    if (!supplierPhoneNumber) {
      throw new AppError(
        400,
        'Le numéro de téléphone du fournisseur est requis'
      );
    }

    const escrow = await escrowService.releaseToSupplier(
      orderId,
      supplierPhoneNumber
    );

    logger.info('Admin released escrow funds', {
      orderId,
      adminId,
      escrowId: escrow.id,
    });

    res.json({
      success: true,
      message: 'Fonds libérés avec succès',
      data: escrow,
    });
  }
);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/refund
 * @desc Rembourser le client
 * @access Admin
 */
export const refundEscrow = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason, amount } = req.body as { reason?: string; amount?: string };
    const adminId = req.user.id;

    if (!reason) {
      throw new AppError(400, 'La raison du remboursement est requise');
    }

    const escrow = await escrowService.refundToClient(
      orderId,
      adminId,
      reason,
      amount ? parseFloat(amount) : undefined
    );

    logger.info('Admin refunded escrow', {
      orderId,
      adminId,
      escrowId: escrow.id,
      amount,
      reason,
    });

    res.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      data: escrow,
    });
  }
);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/open
 * @desc Ouvrir un litige sur une transaction
 * @access Admin
 */
export const openDispute = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason } = req.body as { reason?: string };
  const adminId = req.user.id;

  if (!reason) {
    throw new AppError(400, 'La raison du litige est requise');
  }

  const escrow = await escrowService.openDispute(orderId, adminId, reason);

  logger.info('Admin opened dispute', {
    orderId,
    adminId,
    escrowId: escrow.id,
    reason,
  });

  res.json({
    success: true,
    message: 'Litige ouvert avec succès',
    data: escrow,
  });
});

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-supplier
 * @desc Résoudre un litige en faveur du fournisseur
 * @access Admin
 */
export const resolveDisputeForSupplier = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { resolution, supplierPhoneNumber } = req.body as {
      resolution?: string;
      supplierPhoneNumber?: string;
    };
    const adminId = req.user.id;

    if (!resolution || !supplierPhoneNumber) {
      throw new AppError(
        400,
        'La résolution et le numéro du fournisseur sont requis'
      );
    }

    const escrow = await escrowService.resolveDisputeForSupplier(
      orderId,
      adminId,
      supplierPhoneNumber,
      resolution
    );

    logger.info('Admin resolved dispute for supplier', {
      orderId,
      adminId,
      escrowId: escrow.id,
      resolution,
    });

    res.json({
      success: true,
      message: 'Litige résolu en faveur du fournisseur',
      data: escrow,
    });
  }
);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-client
 * @desc Résoudre un litige en faveur du client (remboursement)
 * @access Admin
 */
export const resolveDisputeForClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { resolution } = req.body as { resolution?: string };
    const adminId = req.user.id;

    if (!resolution) {
      throw new AppError(400, 'La résolution est requise');
    }

    const escrow = await escrowService.refundToClient(
      orderId,
      adminId,
      `Litige résolu en faveur du client: ${resolution}`
    );

    logger.info('Admin resolved dispute for client', {
      orderId,
      adminId,
      escrowId: escrow.id,
      resolution,
    });

    res.json({
      success: true,
      message: 'Litige résolu en faveur du client (remboursement effectué)',
      data: escrow,
    });
  }
);

export default {
  getEscrowTransactions,
  getEscrowByOrderId,
  getPaymentStatistics,
  releaseEscrow,
  refundEscrow,
  openDispute,
  resolveDisputeForSupplier,
  resolveDisputeForClient,
};
