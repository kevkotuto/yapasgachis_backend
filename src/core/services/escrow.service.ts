import { EscrowStatus, PaymentMethod } from '@prisma/client';

import config from '@/config';
import eventService, { AppEvent } from '@/core/services/event.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import waveService from '@/infrastructure/payment/wave.service';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Escrow Service
 * Gère le système de blocage des fonds (escrow) pour les paiements Wave
 *
 * Flux:
 * 1. Client paie via Wave → Fonds bloqués (FUNDS_HELD)
 * 2. Commande livrée/récupérée → Client confirme
 * 3. Fonds transférés au fournisseur (RELEASED)
 *
 * En cas de litige:
 * - Admin peut marquer comme DISPUTED
 * - Admin peut décider de REFUND ou RELEASE
 */

export interface CreateEscrowParams {
  orderId: string;
  amount: number;
  commission: number;
  waveTransferFee: number; // Frais de transfert Wave (1%) - déduit du fournisseur
  supplierId: string;
  supplierWaveId?: string;
}

export interface EscrowTransaction {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  waveTransferFee: number;
  supplierAmount: number;
  status: EscrowStatus;
  waveCheckoutId?: string;
  wavePaymentId?: string;
  waveTransferId?: string;
  supplierId: string;
  supplierWaveId?: string;
  paidAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class EscrowService {
  private static instance: EscrowService;

  private constructor() {}

  static getInstance(): EscrowService {
    if (!EscrowService.instance) {
      EscrowService.instance = new EscrowService();
    }
    return EscrowService.instance;
  }

  /**
   * Créer une transaction escrow pour une commande
   */
  async createEscrow(params: CreateEscrowParams): Promise<{
    escrow: EscrowTransaction;
    checkoutUrl: string;
  }> {
    try {
      // Montant fournisseur = montant total - commission - frais de transfert Wave
      const supplierAmount =
        params.amount - params.commission - params.waveTransferFee;

      // Créer le checkout Wave
      const checkout = await waveService.createCheckout({
        amount: params.amount,
        orderId: params.orderId,
        successUrl: `${config.app.url}/api/v1/payments/wave/callback/success?orderId=${params.orderId}`,
        errorUrl: `${config.app.url}/api/v1/payments/wave/callback/error?orderId=${params.orderId}`,
      });

      // Créer l'enregistrement escrow
      const escrow = await prisma.escrowTransaction.create({
        data: {
          orderId: params.orderId,
          amount: params.amount,
          commission: params.commission,
          waveTransferFee: params.waveTransferFee,
          supplierAmount,
          status: EscrowStatus.PENDING,
          waveCheckoutId: checkout.id,
          supplierId: params.supplierId,
          supplierWaveId: params.supplierWaveId,
        },
      });

      logger.info('Escrow transaction created', {
        escrowId: escrow.id,
        orderId: params.orderId,
        amount: params.amount,
        checkoutId: checkout.id,
      });

      return {
        escrow: escrow as EscrowTransaction,
        checkoutUrl: checkout.wave_launch_url,
      };
    } catch (error) {
      logger.error('Failed to create escrow', {
        orderId: params.orderId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Confirmer que le paiement a été reçu (appelé par webhook ou polling)
   */
  async confirmPayment(
    orderId: string,
    wavePaymentId: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (escrow.status !== EscrowStatus.PENDING) {
        throw new AppError(400, 'Le paiement a déjà été traité');
      }

      // Mettre à jour le statut
      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.FUNDS_HELD,
          wavePaymentId,
          paidAt: new Date(),
        },
      });

      // Mettre à jour le statut de la commande et récupérer les infos
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentReference: wavePaymentId,
        },
        include: {
          supplier: true,
        },
      });

      logger.info('Payment confirmed, funds held in escrow', {
        escrowId: escrow.id,
        orderId,
        wavePaymentId,
      });

      // Émettre l'événement PAYMENT_CONFIRMED
      eventService.emit(AppEvent.PAYMENT_CONFIRMED, {
        orderId,
        userId: order.clientId,
        supplierId: order.supplierId,
        amount: escrow.amount,
        wavePaymentId,
      });

      // Émettre l'événement ESCROW_FUNDS_HELD
      eventService.emit(AppEvent.ESCROW_FUNDS_HELD, {
        orderId,
        escrowId: escrow.id,
        amount: escrow.amount,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to confirm payment', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la confirmation du paiement');
    }
  }

  /**
   * Libérer les fonds vers le fournisseur après confirmation de livraison/pickup
   */
  async releaseToSupplier(
    orderId: string,
    supplierPhoneNumber: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              supplier: true,
            },
          },
        },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (escrow.status !== EscrowStatus.FUNDS_HELD) {
        throw new AppError(
          400,
          `Les fonds ne peuvent pas être libérés (status: ${escrow.status})`
        );
      }

      // Effectuer le transfert Wave vers le fournisseur
      const transfer = await waveService.transferToSupplier({
        amount: escrow.supplierAmount,
        recipientMobile: supplierPhoneNumber,
        orderId,
        supplierName: escrow.order?.supplier?.businessName,
      });

      // Mettre à jour l'escrow
      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          waveTransferId: transfer.id,
          releasedAt: new Date(),
        },
      });

      // Mettre à jour la commande
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      logger.info('Funds released to supplier', {
        escrowId: escrow.id,
        orderId,
        supplierAmount: escrow.supplierAmount,
        transferId: transfer.id,
      });

      // Émettre l'événement ESCROW_RELEASED
      eventService.emit(AppEvent.ESCROW_RELEASED, {
        orderId,
        escrowId: escrow.id,
        supplierId: escrow.supplierId,
        supplierUserId: escrow.order?.supplier?.userId || '',
        amount: escrow.supplierAmount,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to release funds', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du transfert au fournisseur');
    }
  }

  /**
   * Rembourser le client
   */
  async refundToClient(
    orderId: string,
    adminId: string,
    reason: string,
    amount?: number // Optionnel pour remboursement partiel
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
        include: {
          order: true,
        },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (
        escrow.status !== EscrowStatus.FUNDS_HELD &&
        escrow.status !== EscrowStatus.DISPUTED
      ) {
        throw new AppError(
          400,
          `Le remboursement n'est pas possible (status: ${escrow.status})`
        );
      }

      if (!escrow.wavePaymentId) {
        throw new AppError(400, 'Aucun paiement Wave associé');
      }

      const refundAmount = amount || escrow.amount;

      // Utiliser le refund de checkout Wave (gratuit dans les 72h)
      await waveService.refundCheckout({
        checkoutSessionId: escrow.waveCheckoutId!,
        orderId,
      });

      const previousStatus = escrow.status;

      // Mettre à jour l'escrow
      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.REFUNDED,
          refundedAt: new Date(),
          disputeResolution: reason,
          disputeResolvedAt:
            escrow.status === EscrowStatus.DISPUTED ? new Date() : undefined,
        },
      });

      // Enregistrer l'action admin
      await prisma.adminPaymentAction.create({
        data: {
          escrowTransactionId: escrow.id,
          adminId,
          actionType: 'REFUND',
          description: reason,
          amount: refundAmount,
          previousStatus,
          newStatus: EscrowStatus.REFUNDED,
          metadata: {
            waveCheckoutId: escrow.waveCheckoutId,
            refundType: 'checkout_refund',
          },
        },
      });

      // Mettre à jour la commande
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          cancelReason: reason,
        },
      });

      logger.info('Refund processed', {
        escrowId: escrow.id,
        orderId,
        refundAmount,
        adminId,
        reason,
      });

      // Émettre l'événement ESCROW_REFUNDED
      eventService.emit(AppEvent.ESCROW_REFUNDED, {
        orderId,
        escrowId: escrow.id,
        userId: escrow.order?.clientId || '',
        amount: refundAmount,
        reason,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to process refund', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du remboursement');
    }
  }

  /**
   * Remboursement initié par le client (dans les 72h après paiement)
   * Règles:
   * - Seulement si paiement Wave (pas cash)
   * - Seulement dans les 72h après paidAt
   * - Seulement si status FUNDS_HELD (pas encore released)
   * - Si commande en PAID (pas encore prise en charge par vendeur)
   * - Si commande en PREPARING/READY_FOR_PICKUP/IN_DELIVERY → seul le vendeur peut rembourser
   */
  async clientRefund(
    orderId: string,
    userId: string,
    reason: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
        include: {
          order: true,
        },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      // Vérifier que c'est bien le client de cette commande
      if (escrow.order?.clientId !== userId) {
        throw new AppError(
          403,
          "Vous n'êtes pas autorisé à demander ce remboursement"
        );
      }

      // Vérifier le statut de l'escrow
      if (escrow.status !== EscrowStatus.FUNDS_HELD) {
        throw new AppError(
          400,
          `Le remboursement n'est pas possible (status escrow: ${escrow.status})`
        );
      }

      // Vérifier que la commande est en PAID (pas encore prise en charge par le vendeur)
      const orderStatus = escrow.order?.status;
      if (orderStatus !== 'PAID') {
        throw new AppError(
          400,
          "Le remboursement client n'est possible que si la commande n'a pas encore été prise en charge par le vendeur. Contactez le vendeur pour un remboursement."
        );
      }

      // Vérifier la fenêtre de 72h
      if (!escrow.paidAt) {
        throw new AppError(400, 'Date de paiement introuvable');
      }

      const hoursSincePaid =
        (Date.now() - new Date(escrow.paidAt).getTime()) / (1000 * 60 * 60);
      if (hoursSincePaid > 72) {
        throw new AppError(
          400,
          'Le délai de remboursement de 72h est dépassé. Contactez le support pour assistance.'
        );
      }

      // Vérifier qu'il y a un checkout Wave associé
      if (!escrow.waveCheckoutId) {
        throw new AppError(
          400,
          'Aucun paiement Wave associé pour le remboursement'
        );
      }

      // Effectuer le remboursement via Wave Checkout API (gratuit dans les 72h)
      await waveService.refundCheckout({
        checkoutSessionId: escrow.waveCheckoutId,
        orderId,
      });

      const previousStatus = escrow.status;

      // Mettre à jour l'escrow
      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.REFUNDED,
          refundedAt: new Date(),
          disputeResolution: `Remboursement client: ${reason}`,
        },
      });

      // Enregistrer l'action (comme action système, pas admin)
      await prisma.adminPaymentAction.create({
        data: {
          escrowTransactionId: escrow.id,
          adminId: userId, // L'ID du client qui a demandé
          actionType: 'CLIENT_REFUND',
          description: reason,
          amount: escrow.amount,
          previousStatus,
          newStatus: EscrowStatus.REFUNDED,
          metadata: {
            waveCheckoutId: escrow.waveCheckoutId,
            refundType: 'client_72h_refund',
            hoursSincePaid: Math.round(hoursSincePaid),
          },
        },
      });

      // Mettre à jour la commande
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          cancelReason: `Remboursement client: ${reason}`,
        },
      });

      logger.info('Client refund processed', {
        escrowId: escrow.id,
        orderId,
        userId,
        amount: escrow.amount,
        hoursSincePaid: Math.round(hoursSincePaid),
        reason,
      });

      // Émettre l'événement ESCROW_REFUNDED
      eventService.emit(AppEvent.ESCROW_REFUNDED, {
        orderId,
        escrowId: escrow.id,
        userId: escrow.order?.clientId || '',
        amount: escrow.amount,
        reason: `Remboursement client: ${reason}`,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to process client refund', {
        orderId,
        userId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du remboursement');
    }
  }

  /**
   * Remboursement initié par le vendeur (quand la commande est en cours de traitement)
   * Le vendeur peut rembourser si la commande est en PREPARING, READY_FOR_PICKUP, ou IN_DELIVERY
   */
  async supplierRefund(
    orderId: string,
    supplierId: string,
    reason: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
        include: {
          order: true,
        },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      // Vérifier que c'est bien le vendeur de cette commande
      if (escrow.supplierId !== supplierId) {
        throw new AppError(
          403,
          "Vous n'êtes pas autorisé à rembourser cette commande"
        );
      }

      // Vérifier le statut de l'escrow
      if (escrow.status !== EscrowStatus.FUNDS_HELD) {
        throw new AppError(
          400,
          `Le remboursement n'est pas possible (status escrow: ${escrow.status})`
        );
      }

      // Vérifier la fenêtre de 72h Wave
      if (!escrow.paidAt) {
        throw new AppError(400, 'Date de paiement introuvable');
      }

      const hoursSincePaid =
        (Date.now() - new Date(escrow.paidAt).getTime()) / (1000 * 60 * 60);
      if (hoursSincePaid > 72) {
        throw new AppError(
          400,
          'Le délai de remboursement Wave de 72h est dépassé. Contactez le support.'
        );
      }

      if (!escrow.waveCheckoutId) {
        throw new AppError(
          400,
          'Aucun paiement Wave associé pour le remboursement'
        );
      }

      // Effectuer le remboursement via Wave
      await waveService.refundCheckout({
        checkoutSessionId: escrow.waveCheckoutId,
        orderId,
      });

      const previousStatus = escrow.status;

      // Mettre à jour l'escrow
      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.REFUNDED,
          refundedAt: new Date(),
          disputeResolution: `Remboursement vendeur: ${reason}`,
        },
      });

      // Enregistrer l'action
      await prisma.adminPaymentAction.create({
        data: {
          escrowTransactionId: escrow.id,
          adminId: supplierId,
          actionType: 'SUPPLIER_REFUND',
          description: reason,
          amount: escrow.amount,
          previousStatus,
          newStatus: EscrowStatus.REFUNDED,
          metadata: {
            waveCheckoutId: escrow.waveCheckoutId,
            refundType: 'supplier_refund',
            hoursSincePaid: Math.round(hoursSincePaid),
          },
        },
      });

      // Mettre à jour la commande
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          cancelReason: `Remboursement vendeur: ${reason}`,
        },
      });

      logger.info('Supplier refund processed', {
        escrowId: escrow.id,
        orderId,
        supplierId,
        amount: escrow.amount,
        reason,
      });

      eventService.emit(AppEvent.ESCROW_REFUNDED, {
        orderId,
        escrowId: escrow.id,
        userId: escrow.order?.clientId || '',
        amount: escrow.amount,
        reason: `Remboursement vendeur: ${reason}`,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to process supplier refund', {
        orderId,
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du remboursement');
    }
  }

  /**
   * Ouvrir un litige
   */
  async openDispute(
    orderId: string,
    adminId: string,
    reason: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              supplier: true,
            },
          },
        },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (escrow.status !== EscrowStatus.FUNDS_HELD) {
        throw new AppError(
          400,
          `Un litige ne peut être ouvert que sur des fonds bloqués`
        );
      }

      const previousStatus = escrow.status;

      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.DISPUTED,
          disputeReason: reason,
          disputeOpenedAt: new Date(),
        },
      });

      await prisma.adminPaymentAction.create({
        data: {
          escrowTransactionId: escrow.id,
          adminId,
          actionType: 'DISPUTE_OPEN',
          description: reason,
          previousStatus,
          newStatus: EscrowStatus.DISPUTED,
        },
      });

      logger.info('Dispute opened', {
        escrowId: escrow.id,
        orderId,
        adminId,
        reason,
      });

      // Émettre l'événement ESCROW_DISPUTED
      eventService.emit(AppEvent.ESCROW_DISPUTED, {
        orderId,
        escrowId: escrow.id,
        userId: escrow.order?.clientId || '',
        supplierId: escrow.supplierId,
        reason,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to open dispute', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'ouverture du litige");
    }
  }

  /**
   * Résoudre un litige en faveur du fournisseur (libérer les fonds)
   */
  async resolveDisputeForSupplier(
    orderId: string,
    adminId: string,
    supplierPhoneNumber: string,
    resolution: string
  ): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (escrow.status !== EscrowStatus.DISPUTED) {
        throw new AppError(400, 'Aucun litige en cours sur cette transaction');
      }

      // Effectuer le transfert
      const transfer = await waveService.transferToSupplier({
        amount: escrow.supplierAmount,
        recipientMobile: supplierPhoneNumber,
        orderId,
      });

      const previousStatus = escrow.status;

      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          waveTransferId: transfer.id,
          releasedAt: new Date(),
          disputeResolution: resolution,
          disputeResolvedAt: new Date(),
        },
      });

      await prisma.adminPaymentAction.create({
        data: {
          escrowTransactionId: escrow.id,
          adminId,
          actionType: 'DISPUTE_CLOSE',
          description: `Résolu en faveur du fournisseur: ${resolution}`,
          amount: escrow.supplierAmount,
          previousStatus,
          newStatus: EscrowStatus.RELEASED,
          metadata: {
            transferId: transfer.id,
            resolution: 'supplier',
          },
        },
      });

      logger.info('Dispute resolved for supplier', {
        escrowId: escrow.id,
        orderId,
        adminId,
        transferId: transfer.id,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to resolve dispute', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la résolution du litige');
    }
  }

  /**
   * Annuler une transaction escrow (avant paiement)
   */
  async cancelEscrow(orderId: string): Promise<EscrowTransaction> {
    try {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId },
      });

      if (!escrow) {
        throw new AppError(404, 'Transaction escrow non trouvée');
      }

      if (escrow.status !== EscrowStatus.PENDING) {
        throw new AppError(400, 'La transaction ne peut plus être annulée');
      }

      const updated = await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.CANCELLED,
        },
      });

      logger.info('Escrow cancelled', {
        escrowId: escrow.id,
        orderId,
      });

      return updated as EscrowTransaction;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to cancel escrow', {
        orderId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'annulation");
    }
  }

  /**
   * Récupérer une transaction escrow par orderId
   */
  async getByOrderId(orderId: string): Promise<EscrowTransaction | null> {
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { orderId },
      include: {
        adminActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return escrow as EscrowTransaction | null;
  }

  /**
   * Récupérer toutes les transactions escrow avec filtres
   */
  async getAll(params: {
    status?: EscrowStatus;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    escrows: EscrowTransaction[];
    total: number;
    pages: number;
  }> {
    const {
      status,
      supplierId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [escrows, total] = await Promise.all([
      prisma.escrowTransaction.findMany({
        where,
        include: {
          order: {
            include: {
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          adminActions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.escrowTransaction.count({ where }),
    ]);

    return {
      escrows: escrows as EscrowTransaction[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Statistiques escrow
   */
  async getStatistics(): Promise<{
    totalPending: number;
    totalHeld: number;
    totalReleased: number;
    totalRefunded: number;
    totalDisputed: number;
    totalAmountHeld: number;
    totalAmountReleased: number;
    totalCommission: number;
  }> {
    const [counts, sums] = await Promise.all([
      prisma.escrowTransaction.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.escrowTransaction.aggregate({
        where: { status: EscrowStatus.FUNDS_HELD },
        _sum: { amount: true },
      }),
      prisma.escrowTransaction.aggregate({
        where: { status: EscrowStatus.RELEASED },
        _sum: { amount: true, commission: true },
      }),
    ]);

    const statusCounts = counts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalPending: statusCounts[EscrowStatus.PENDING] || 0,
      totalHeld: statusCounts[EscrowStatus.FUNDS_HELD] || 0,
      totalReleased: statusCounts[EscrowStatus.RELEASED] || 0,
      totalRefunded: statusCounts[EscrowStatus.REFUNDED] || 0,
      totalDisputed: statusCounts[EscrowStatus.DISPUTED] || 0,
      totalAmountHeld: sums[0]?._sum?.amount || 0,
      totalAmountReleased: sums[1]?._sum?.amount || 0,
      totalCommission: sums[1]?._sum?.commission || 0,
    };
  }
}

export default EscrowService.getInstance();
