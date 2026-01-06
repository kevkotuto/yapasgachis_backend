import { Request, Response, NextFunction } from 'express';
import { EscrowStatus } from '@prisma/client';
import escrowService from '@/core/services/escrow.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Admin Payment Controller
 * Gestion des paiements, escrow, litiges et remboursements
 */

/**
 * @route GET /api/v1/admin/payments/escrow
 * @desc Récupérer toutes les transactions escrow avec filtres
 * @access Admin
 */
export const getEscrowTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/admin/payments/escrow/:orderId
 * @desc Récupérer une transaction escrow par orderId
 * @access Admin
 */
export const getEscrowByOrderId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;

    const escrow = await escrowService.getByOrderId(orderId);

    if (!escrow) {
      throw new AppError(404, 'Transaction escrow non trouvée');
    }

    res.json({
      success: true,
      data: escrow,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/admin/payments/statistics
 * @desc Statistiques des paiements escrow
 * @access Admin
 */
export const getPaymentStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statistics = await escrowService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/release
 * @desc Libérer manuellement les fonds vers le fournisseur
 * @access Admin
 */
export const releaseEscrow = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { supplierPhoneNumber } = req.body;
    const adminId = req.user!.id;

    if (!supplierPhoneNumber) {
      throw new AppError(400, 'Le numéro de téléphone du fournisseur est requis');
    }

    const escrow = await escrowService.releaseToSupplier(orderId, supplierPhoneNumber);

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
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/refund
 * @desc Rembourser le client
 * @access Admin
 */
export const refundEscrow = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { reason, amount } = req.body;
    const adminId = req.user!.id;

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
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/open
 * @desc Ouvrir un litige sur une transaction
 * @access Admin
 */
export const openDispute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.id;

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
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-supplier
 * @desc Résoudre un litige en faveur du fournisseur
 * @access Admin
 */
export const resolveDisputeForSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { resolution, supplierPhoneNumber } = req.body;
    const adminId = req.user!.id;

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
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-client
 * @desc Résoudre un litige en faveur du client (remboursement)
 * @access Admin
 */
export const resolveDisputeForClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { resolution } = req.body;
    const adminId = req.user!.id;

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
  } catch (error) {
    next(error);
  }
};

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
