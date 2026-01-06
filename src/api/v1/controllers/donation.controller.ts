import { Request, Response, NextFunction } from 'express';
import donationService from '@/core/services/donation.service';
import { DonationType, DonationStatus } from '@prisma/client';

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
  async createFoodDonation(req: Request, res: Response, next: NextFunction) {
    try {
      const donorId = req.user!.id;
      const { associationId, productId, quantity, unit, pickupScheduled } = req.body;

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a financial donation
   * POST /api/v1/donations/financial
   */
  async createFinancialDonation(req: Request, res: Response, next: NextFunction) {
    try {
      const donorId = req.user!.id;
      const { associationId, amount, currency, paymentReference } = req.body;

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my donations (as donor)
   * GET /api/v1/donations/my-donations
   */
  async getMyDonations(req: Request, res: Response, next: NextFunction) {
    try {
      const donorId = req.user!.id;
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my donor statistics
   * GET /api/v1/donations/my-stats
   */
  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const donorId = req.user!.id;
      const stats = await donationService.getDonorStats(donorId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get donation by ID
   * GET /api/v1/donations/:donationId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { donationId } = req.params;
      const donation = await donationService.getById(donationId);

      res.json({
        success: true,
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel donation
   * POST /api/v1/donations/:donationId/cancel
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;
      const { reason } = req.body;

      const donation = await donationService.cancel(userId, donationId, reason);

      res.json({
        success: true,
        message: 'Don annulé avec succès',
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate receipt
   * POST /api/v1/donations/:donationId/receipt
   */
  async generateReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;

      const result = await donationService.generateReceipt(userId, donationId);

      res.json({
        success: true,
        message: 'Reçu généré avec succès',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate certificate
   * POST /api/v1/donations/:donationId/certificate
   */
  async generateCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;

      const result = await donationService.generateCertificate(userId, donationId);

      res.json({
        success: true,
        message: 'Certificat généré avec succès',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ASSOCIATION ENDPOINTS ====================

  /**
   * Get donations received by association
   * GET /api/v1/associations/donations
   */
  async getAssociationDonations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending pickups for association
   * GET /api/v1/associations/donations/pending-pickups
   */
  async getPendingPickups(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const donations = await donationService.getPendingPickups(userId);

      res.json({
        success: true,
        data: donations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get association donation statistics
   * GET /api/v1/associations/donations/stats
   */
  async getAssociationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await donationService.getAssociationStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule pickup for food donation
   * POST /api/v1/donations/:donationId/schedule-pickup
   */
  async schedulePickup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;
      const { pickupDate } = req.body;

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm pickup
   * POST /api/v1/donations/:donationId/confirm-pickup
   */
  async confirmPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;

      const donation = await donationService.confirmPickup(userId, donationId);

      res.json({
        success: true,
        message: 'Collecte confirmée avec succès',
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update donation status
   * PATCH /api/v1/donations/:donationId/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { donationId } = req.params;
      const { status } = req.body;

      const donation = await donationService.updateStatus(userId, donationId, status);

      res.json({
        success: true,
        message: 'Statut du don mis à jour',
        data: donation,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Search all donations (admin)
   * GET /api/v1/admin/donations
   */
  async adminSearch(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get global donation statistics (admin)
   * GET /api/v1/admin/donations/stats
   */
  async adminGetStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await donationService.getGlobalStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DonationController();
