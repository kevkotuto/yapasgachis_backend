import { Request, Response, NextFunction } from 'express';
import dealService from '@/core/services/deal.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Deal Controller
 * Handles deals and bookings
 */
export class DealController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Search deals
   * GET /api/v1/deals
   */
  async searchDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        category,
        city,
        latitude,
        longitude,
        radius,
        minPrice,
        maxPrice,
        isOffPeakOnly,
        page,
        limit,
      } = req.query;

      const result = await dealService.searchDeals({
        search: search as string,
        category: category as any,
        city: city as string,
        latitude: latitude ? parseFloat(latitude as string) : undefined,
        longitude: longitude ? parseFloat(longitude as string) : undefined,
        radius: radius ? parseFloat(radius as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        isOffPeakOnly: isOffPeakOnly === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.deals,
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
   * Get deal by ID
   * GET /api/v1/deals/:dealId
   */
  async getDealById(req: Request, res: Response, next: NextFunction) {
    try {
      const { dealId } = req.params;
      const deal = await dealService.getDealById(dealId);

      res.json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== USER BOOKING ENDPOINTS ====================

  /**
   * Book a deal
   * POST /api/v1/deals/:dealId/book
   */
  async bookDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { dealId } = req.params;
      const { bookingDate, bookingSlot, quantity, paymentMethod, userNotes } = req.body;

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date(bookingDate),
        bookingSlot,
        quantity,
        paymentMethod,
        userNotes,
      });

      res.status(201).json({
        success: true,
        message: 'Réservation créée avec succès',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's bookings
   * GET /api/v1/deals/bookings/my-bookings
   */
  async getUserBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { status, page, limit } = req.query;

      const result = await dealService.getUserBookings(userId, {
        status: status as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.bookings,
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
   * Cancel booking
   * POST /api/v1/deals/bookings/:bookingId/cancel
   */
  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { bookingId } = req.params;
      const { reason } = req.body;

      const booking = await dealService.cancelBooking(userId, bookingId, reason);

      res.json({
        success: true,
        message: 'Réservation annulée avec succès',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking QR code
   * GET /api/v1/deals/bookings/:bookingId/qr-code
   */
  async getBookingQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { bookingId } = req.params;

      const qrCode = await dealService.getBookingQRCode(userId, bookingId);

      res.json({
        success: true,
        data: { qrCode },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Create a deal
   * POST /api/v1/supplier/deals
   */
  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const deal = await dealService.createDeal(supplierId, {
        ...req.body,
        availableFrom: new Date(req.body.availableFrom),
        availableUntil: new Date(req.body.availableUntil),
      });

      res.status(201).json({
        success: true,
        message: 'Deal créé avec succès. En attente de validation.',
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a deal
   * PUT /api/v1/supplier/deals/:dealId
   */
  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { dealId } = req.params;
      const updateData = { ...req.body };

      if (req.body.availableFrom) {
        updateData.availableFrom = new Date(req.body.availableFrom);
      }
      if (req.body.availableUntil) {
        updateData.availableUntil = new Date(req.body.availableUntil);
      }

      const deal = await dealService.updateDeal(supplierId, dealId, updateData);

      res.json({
        success: true,
        message: 'Deal mis à jour avec succès',
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle deal pause
   * POST /api/v1/supplier/deals/:dealId/toggle-pause
   */
  async toggleDealPause(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { dealId } = req.params;

      const deal = await dealService.toggleDealPause(supplierId, dealId);

      res.json({
        success: true,
        message: `Deal ${deal.status === 'PAUSED' ? 'mis en pause' : 'réactivé'} avec succès`,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a deal
   * DELETE /api/v1/supplier/deals/:dealId
   */
  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { dealId } = req.params;

      await dealService.deleteDeal(supplierId, dealId);

      res.json({
        success: true,
        message: 'Deal supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier's deals
   * GET /api/v1/supplier/deals
   */
  async getSupplierDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { status } = req.query;

      const deals = await dealService.getSupplierDeals(
        supplierId,
        status as any
      );

      res.json({
        success: true,
        data: deals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier's bookings
   * GET /api/v1/supplier/deals/bookings
   */
  async getSupplierBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { status, storeId, startDate, endDate, page, limit } = req.query;

      const result = await dealService.getSupplierBookings(supplierId, {
        status: status as any,
        storeId: storeId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.bookings,
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
   * Validate a booking
   * POST /api/v1/supplier/deals/bookings/validate
   */
  async validateBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { validationCode, staffId } = req.body;

      const booking = await dealService.validateBooking(
        supplierId,
        validationCode,
        staffId
      );

      res.json({
        success: true,
        message: 'Réservation validée avec succès',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending deals
   * GET /api/v1/admin/deals/pending
   */
  async getPendingDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;

      const result = await dealService.getPendingDeals({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.deals,
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
   * Approve a deal
   * POST /api/v1/admin/deals/:dealId/approve
   */
  async approveDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { dealId } = req.params;

      const deal = await dealService.approveDeal(adminId, dealId);

      res.json({
        success: true,
        message: 'Deal approuvé avec succès',
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a deal
   * POST /api/v1/admin/deals/:dealId/reject
   */
  async rejectDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { dealId } = req.params;
      const { reason } = req.body;

      const deal = await dealService.rejectDeal(adminId, dealId, reason);

      res.json({
        success: true,
        message: 'Deal rejeté',
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DealController();
