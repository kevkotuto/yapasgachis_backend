import { DonationType, DonationStatus } from '@prisma/client';
import { Request, Response } from 'express';

import donationService from '@/core/services/donation.service';
import { asyncHandler } from '@/middleware/error-handler.middleware';

/**
 * Donation Controller
 * Handles donation-related endpoints
 */
export class DonationController {
  // ==================== DONOR ENDPOINTS ====================

  /**
   * Create a food donation
   * POST /api/v1/donations/food
   */
  createFoodDonation = asyncHandler(async (req: Request, res: Response) => {
    const donorId = req.user.id;
    const { associationId, productId, quantity, unit, pickupScheduled } =
      req.body as {
        associationId: string;
        productId: string;
        quantity: number;
        unit: string;
        pickupScheduled?: string;
      };

    const donation = await donationService.createFoodDonation(donorId, {
      associationId,
      productId,
      quantity,
      unit,
      pickupScheduled: pickupScheduled ? new Date(pickupScheduled) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Don alimentaire créé avec succès',
      data: donation,
    });
  });

  /**
   * Create a financial donation
   * POST /api/v1/donations/financial
   */
  createFinancialDonation = asyncHandler(
    async (req: Request, res: Response) => {
      const donorId = req.user.id;
      const { associationId, amount, currency, paymentReference } =
        req.body as {
          associationId: string;
          amount: number;
          currency: string;
          paymentReference?: string;
        };

      const donation = await donationService.createFinancialDonation(donorId, {
        associationId,
        amount,
        currency,
        paymentReference,
      });

      res.status(201).json({
        success: true,
        message: 'Don financier créé avec succès',
        data: donation,
      });
    }
  );

  /**
   * Get my donations (as donor)
   * GET /api/v1/donations/my-donations
   */
  getMyDonations = asyncHandler(async (req: Request, res: Response) => {
    const donorId = req.user.id;
    const { type, status, page, limit } = req.query;

    const result = await donationService.getByDonor(donorId, {
      type: type as DonationType,
      status: status as DonationStatus,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.donations,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get my donor statistics
   * GET /api/v1/donations/my-stats
   */
  getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const donorId = req.user.id;
    const stats = await donationService.getDonorStats(donorId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get donation by ID
   * GET /api/v1/donations/:donationId
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { donationId } = req.params;
    const donation = await donationService.getById(donationId);

    res.json({
      success: true,
      data: donation,
    });
  });

  /**
   * Cancel donation
   * POST /api/v1/donations/:donationId/cancel
   */
  cancel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;
    const { reason } = req.body as { reason?: string };

    const donation = await donationService.cancel(userId, donationId, reason);

    res.json({
      success: true,
      message: 'Don annulé avec succès',
      data: donation,
    });
  });

  /**
   * Generate receipt
   * POST /api/v1/donations/:donationId/receipt
   */
  generateReceipt = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;

    const result = await donationService.generateReceipt(userId, donationId);

    res.json({
      success: true,
      message: 'Reçu généré avec succès',
      data: result,
    });
  });

  /**
   * Generate certificate
   * POST /api/v1/donations/:donationId/certificate
   */
  generateCertificate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;

    const result = await donationService.generateCertificate(
      userId,
      donationId
    );

    res.json({
      success: true,
      message: 'Certificat généré avec succès',
      data: result,
    });
  });

  // ==================== ASSOCIATION ENDPOINTS ====================

  /**
   * Get donations received by association
   * GET /api/v1/associations/donations
   */
  getAssociationDonations = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user.id;
      const { type, status, page, limit } = req.query;

      const result = await donationService.getByAssociation(userId, {
        type: type as DonationType,
        status: status as DonationStatus,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.donations,
        pagination: {
          total: result.total,
          pages: result.pages,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        },
      });
    }
  );

  /**
   * Get pending pickups for association
   * GET /api/v1/associations/donations/pending-pickups
   */
  getPendingPickups = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const donations = await donationService.getPendingPickups(userId);

    res.json({
      success: true,
      data: donations,
    });
  });

  /**
   * Get association donation statistics
   * GET /api/v1/associations/donations/stats
   */
  getAssociationStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const stats = await donationService.getAssociationStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get comprehensive donation stats for association
   * GET /api/v1/donations/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const stats =
      await donationService.getAssociationComprehensiveStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Schedule pickup for food donation
   * POST /api/v1/donations/:donationId/schedule-pickup
   */
  schedulePickup = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;
    const { pickupDate } = req.body as { pickupDate: string };

    const donation = await donationService.schedulePickup(
      userId,
      donationId,
      new Date(pickupDate)
    );

    res.json({
      success: true,
      message: 'Collecte programmée avec succès',
      data: donation,
    });
  });

  /**
   * Confirm pickup
   * POST /api/v1/donations/:donationId/confirm-pickup
   */
  confirmPickup = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;

    const donation = await donationService.confirmPickup(userId, donationId);

    res.json({
      success: true,
      message: 'Collecte confirmée avec succès',
      data: donation,
    });
  });

  /**
   * Update donation status
   * PATCH /api/v1/donations/:donationId/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { donationId } = req.params;
    const { status } = req.body as { status: DonationStatus };

    const donation = await donationService.updateStatus(
      userId,
      donationId,
      status
    );

    res.json({
      success: true,
      message: 'Statut du don mis à jour',
      data: donation,
    });
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Search all donations (admin)
   * GET /api/v1/admin/donations
   */
  adminSearch = asyncHandler(async (req: Request, res: Response) => {
    const {
      type,
      status,
      associationId,
      donorId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await donationService.searchAll({
      type: type as DonationType,
      status: status as DonationStatus,
      associationId: associationId as string,
      donorId: donorId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.donations,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get global donation statistics (admin)
   * GET /api/v1/admin/donations/stats
   */
  adminGetStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await donationService.getGlobalStats();

    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new DonationController();
