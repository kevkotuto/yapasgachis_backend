import { Request, Response } from 'express';

import supplierWalletService from '@/core/services/supplier-wallet.service';
import { prisma } from '@/infrastructure/database/prisma';
import { asyncHandler, AppError } from '@/middleware/error-handler.middleware';

/**
 * Supplier Wallet Controller
 * Gère le portefeuille du fournisseur: solde, transactions, retraits
 */

/**
 * Helper: Récupérer le profil fournisseur depuis le userId
 */
async function getSupplierProfile(userId: string) {
  const supplier = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!supplier) {
    throw new AppError(403, 'Profil fournisseur non trouvé');
  }

  return supplier;
}

/**
 * @route GET /api/v1/supplier/wallet
 * @desc Récupérer le solde du portefeuille fournisseur
 * @access Private (Supplier)
 */
export const getWalletBalance = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const supplier = await getSupplierProfile(userId);

    const balance = await supplierWalletService.getBalance(supplier.id);

    res.json({
      success: true,
      data: balance,
    });
  }
);

/**
 * @route GET /api/v1/supplier/wallet/transactions
 * @desc Récupérer l'historique des transactions
 * @access Private (Supplier)
 */
export const getWalletTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const supplier = await getSupplierProfile(userId);

    const { page, limit } = req.query;

    const result = await supplierWalletService.getTransactions(supplier.id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * @route POST /api/v1/supplier/wallet/withdraw
 * @desc Demander un retrait de fonds
 * @access Private (Supplier)
 */
export const requestWithdrawal = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const supplier = await getSupplierProfile(userId);

    const { amount, phoneNumber, method } = req.body;

    if (!amount || !phoneNumber) {
      throw new AppError(
        400,
        'Le montant et le numéro de téléphone sont requis'
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError(400, 'Le montant doit être un nombre positif');
    }

    if (
      !method ||
      !['WAVE', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY'].includes(method)
    ) {
      throw new AppError(400, 'Méthode de retrait invalide');
    }

    const result = await supplierWalletService.requestWithdrawal({
      supplierId: supplier.id,
      amount,
      phoneNumber,
      method,
    });

    res.status(201).json({
      success: true,
      message: 'Retrait initié avec succès',
      data: result,
    });
  }
);

/**
 * @route GET /api/v1/supplier/wallet/withdrawals
 * @desc Récupérer l'historique des retraits
 * @access Private (Supplier)
 */
export const getWithdrawals = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const supplier = await getSupplierProfile(userId);

    const { page, limit, status } = req.query;

    const result = await supplierWalletService.getWithdrawals(supplier.id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * @route GET /api/v1/supplier/wallet/analytics
 * @desc Revenue by day for a given period (week/month/year), defaults to week
 * @access Private (Supplier)
 */
export const getWalletAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const supplier = await getSupplierProfile(userId);

    const rawPeriod = (req.query.period as string | undefined) || 'week';
    const period: 'week' | 'month' | 'year' = [
      'week',
      'month',
      'year',
    ].includes(rawPeriod)
      ? (rawPeriod as 'week' | 'month' | 'year')
      : 'week';

    const result = await supplierWalletService.getRevenueAnalytics(
      supplier.id,
      period
    );

    res.json({ success: true, data: result });
  }
);

export default {
  getWalletBalance,
  getWalletTransactions,
  requestWithdrawal,
  getWithdrawals,
  getWalletAnalytics,
};
