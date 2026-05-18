import { v4 as uuidv4 } from 'uuid';

import config from '@/config';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import waveService from '@/infrastructure/payment/wave.service';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Supplier Wallet Service
 * Gère le solde virtuel et les retraits des fournisseurs
 *
 * Le solde est calculé à partir des transactions escrow RELEASED
 * moins les retraits effectués (PENDING, PROCESSING, COMPLETED)
 */

export class SupplierWalletService {
  private static instance: SupplierWalletService;

  private constructor() {}

  static getInstance(): SupplierWalletService {
    if (!SupplierWalletService.instance) {
      SupplierWalletService.instance = new SupplierWalletService();
    }
    return SupplierWalletService.instance;
  }

  /**
   * Calculer le solde disponible d'un fournisseur
   */
  async getBalance(supplierId: string): Promise<{
    totalEarned: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    availableBalance: number;
    currency: string;
  }> {
    // Total gagné (escrow RELEASED)
    const totalEarnedResult = await prisma.escrowTransaction.aggregate({
      where: {
        supplierId,
        status: 'RELEASED',
      },
      _sum: {
        supplierAmount: true,
      },
    });

    // Total déjà retiré (COMPLETED)
    const totalWithdrawnResult = await prisma.withdrawal.aggregate({
      where: {
        supplierId,
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    // Retraits en cours (PENDING + PROCESSING)
    const pendingWithdrawalsResult = await prisma.withdrawal.aggregate({
      where: {
        supplierId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalEarned = totalEarnedResult._sum.supplierAmount || 0;
    const totalWithdrawn = totalWithdrawnResult._sum.amount || 0;
    const pendingWithdrawals = pendingWithdrawalsResult._sum.amount || 0;
    const availableBalance = totalEarned - totalWithdrawn - pendingWithdrawals;

    return {
      totalEarned: Math.round(totalEarned),
      totalWithdrawn: Math.round(totalWithdrawn),
      pendingWithdrawals: Math.round(pendingWithdrawals),
      availableBalance: Math.max(0, Math.round(availableBalance)),
      currency: 'XOF',
    };
  }

  /**
   * Analytics: revenu par jour sur une fenêtre temporelle (par défaut 7 jours).
   * Agrège les escrowTransaction RELEASED.
   */
  async getRevenueAnalytics(
    supplierId: string,
    period: 'week' | 'month' | 'year' = 'week'
  ): Promise<{
    period: 'week' | 'month' | 'year';
    revenueByDay: Array<{ date: string; revenue: number }>;
    totalRevenue: number;
  }> {
    const now = new Date();
    const days = period === 'year' ? 365 : period === 'month' ? 30 : 7;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const escrows = await prisma.escrowTransaction.findMany({
      where: {
        supplierId,
        status: 'RELEASED',
        releasedAt: { gte: start },
      },
      select: {
        supplierAmount: true,
        releasedAt: true,
      },
    });

    const buckets: Array<{ date: string; revenue: number }> = [];
    const indexByDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      indexByDate.set(key, buckets.length);
      buckets.push({ date: key, revenue: 0 });
    }

    let totalRevenue = 0;
    for (const e of escrows) {
      const ts = e.releasedAt;
      if (!ts) continue;
      const key = new Date(ts).toISOString().slice(0, 10);
      const idx = indexByDate.get(key);
      const amount = Math.round(Number(e.supplierAmount) || 0);
      if (idx !== undefined) {
        buckets[idx].revenue += amount;
      }
      totalRevenue += amount;
    }

    return { period, revenueByDay: buckets, totalRevenue };
  }

  /**
   * Récupérer les transactions d'un fournisseur
   */
  async getTransactions(
    supplierId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{
    transactions: any[];
    total: number;
    pages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // Récupérer les escrow released (revenus)
    const [escrows, withdrawals, totalEscrows, totalWithdrawals] =
      await Promise.all([
        prisma.escrowTransaction.findMany({
          where: {
            supplierId,
            status: 'RELEASED',
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                createdAt: true,
              },
            },
          },
          orderBy: { releasedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.withdrawal.findMany({
          where: { supplierId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.escrowTransaction.count({
          where: { supplierId, status: 'RELEASED' },
        }),
        prisma.withdrawal.count({
          where: { supplierId },
        }),
      ]);

    // Combiner et trier par date
    const transactions = [
      ...escrows.map((e) => ({
        id: e.id,
        type: 'EARNING' as const,
        amount: e.supplierAmount,
        fee: e.waveTransferFee,
        commission: e.commission,
        status: 'COMPLETED',
        orderNumber: e.order?.orderNumber,
        orderId: e.orderId,
        date: e.releasedAt || e.updatedAt,
        description: `Vente commande #${e.order?.orderNumber || 'N/A'}`,
      })),
      ...withdrawals.map((w) => ({
        id: w.id,
        type: 'WITHDRAWAL' as const,
        amount: -w.amount,
        fee: w.fee,
        netAmount: w.netAmount,
        status: w.status,
        phoneNumber: w.phoneNumber,
        method: w.method,
        date: w.processedAt || w.createdAt,
        description: `Retrait vers ${w.phoneNumber}`,
        failedReason: w.failedReason,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = totalEscrows + totalWithdrawals;

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Demander un retrait
   * Frais Wave: 1% du montant
   */
  async requestWithdrawal(params: {
    supplierId: string;
    amount: number;
    phoneNumber: string;
    method: string;
  }): Promise<any> {
    const { supplierId, amount, phoneNumber, method } = params;

    // Vérifier le montant minimum
    if (amount < 500) {
      throw new AppError(400, 'Le montant minimum de retrait est de 500 XOF');
    }

    // Vérifier le solde disponible
    const balance = await this.getBalance(supplierId);
    if (amount > balance.availableBalance) {
      throw new AppError(
        400,
        `Solde insuffisant. Disponible: ${balance.availableBalance} XOF`
      );
    }

    // Calculer les frais (1% Wave payout fee)
    const feeRate = 0.01;
    const fee = Math.ceil(amount * feeRate);
    const netAmount = amount - fee;

    // Générer une clé d'idempotence
    const idempotencyKey = uuidv4();

    // Créer le retrait en base
    const withdrawal = await prisma.withdrawal.create({
      data: {
        supplierId,
        amount,
        fee,
        netAmount,
        method: method as any,
        phoneNumber,
        status: 'PENDING',
        idempotencyKey,
      },
    });

    // Récupérer le profil fournisseur pour le nom
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      select: { businessName: true },
    });

    try {
      // Appeler Wave Payout API
      const payout = await waveService.createPayout({
        amount: netAmount,
        recipientMobile: phoneNumber,
        recipientName: supplier?.businessName,
        clientReference: `withdrawal_${withdrawal.id}`,
        idempotencyKey,
      });

      // Mettre à jour le retrait avec le résultat
      const updated = await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: payout.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
          wavePayoutId: payout.id,
          processedAt: payout.status === 'succeeded' ? new Date() : undefined,
        },
      });

      logger.info('Withdrawal processed', {
        withdrawalId: withdrawal.id,
        payoutId: payout.id,
        amount,
        fee,
        netAmount,
        status: payout.status,
      });

      return {
        id: updated.id,
        amount: updated.amount,
        fee: updated.fee,
        netAmount: updated.netAmount,
        status: updated.status,
        phoneNumber: updated.phoneNumber,
        method: updated.method,
        wavePayoutId: updated.wavePayoutId,
        processedAt: updated.processedAt,
        createdAt: updated.createdAt,
      };
    } catch (error) {
      // Marquer le retrait comme échoué
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          failedReason: (error as Error).message,
        },
      });

      logger.error('Withdrawal failed', {
        withdrawalId: withdrawal.id,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Récupérer l'historique des retraits
   */
  async getWithdrawals(
    supplierId: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{
    withdrawals: any[];
    total: number;
    pages: number;
  }> {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { supplierId };
    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return {
      withdrawals,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}

export default SupplierWalletService.getInstance();
