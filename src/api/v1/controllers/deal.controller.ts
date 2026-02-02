import { BookingStatus, DealCategory, DealStatus } from '@prisma/client';
import { Request, Response } from 'express';

import dealService from '@/core/services/deal.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';
import { normalizeImages, normalizeImagesList } from '@/utils/normalize.utils';

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
  searchDeals = asyncHandler(async (req: Request, res: Response) => {
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
      category: category as DealCategory | undefined,
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
      data: normalizeImagesList(result.deals),
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get deal by ID
   * GET /api/v1/deals/:dealId
   */
  getDealById = asyncHandler(async (req: Request, res: Response) => {
    const { dealId } = req.params;
    const deal = await dealService.getDealById(dealId);

    res.json({
      success: true,
      data: normalizeImages(deal),
    });
  });

  // ==================== USER BOOKING ENDPOINTS ====================

  /**
   * Book a deal
   * POST /api/v1/deals/:dealId/book
   */
  bookDeal = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { dealId } = req.params;
    const {
      bookingDate,
      bookingEndDate,
      bookingSlot,
      quantity,
      paymentMethod,
      userNotes,
    } = req.body as {
      bookingDate: string;
      bookingEndDate?: string;
      bookingSlot?: string;
      quantity: number;
      paymentMethod: 'WAVE' | 'CASH_ON_DELIVERY';
      userNotes?: string;
    };

    const { booking, paymentUrl } = await dealService.bookDeal(userId, dealId, {
      bookingDate: new Date(bookingDate),
      bookingEndDate: bookingEndDate ? new Date(bookingEndDate) : undefined,
      bookingSlot,
      quantity,
      paymentMethod,
      userNotes,
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: {
        booking,
        payment: {
          paymentUrl,
          status: booking.status,
        },
      },
    });
  });

  /**
   * Purchase a deal (no booking required)
   * POST /api/v1/deals/:dealId/purchase
   */
  purchaseDeal = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { dealId } = req.params;
    const { quantity, paymentMethod, userNotes } = req.body as {
      quantity?: number;
      paymentMethod: 'WAVE' | 'CASH_ON_DELIVERY';
      userNotes?: string;
    };

    const { booking, paymentUrl } = await dealService.purchaseDeal(
      userId,
      dealId,
      {
        quantity,
        paymentMethod,
        userNotes,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Achat effectué avec succès',
      data: {
        booking,
        payment: {
          paymentUrl,
          status: booking.status,
        },
      },
    });
  });

  /**
   * Get user's bookings
   * GET /api/v1/deals/bookings/my-bookings
   */
  getUserBookings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { status, page, limit } = req.query;

    const result = await dealService.getUserBookings(userId, {
      status: status as BookingStatus | undefined,
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
  });

  /**
   * Cancel booking
   * POST /api/v1/deals/bookings/:bookingId/cancel
   */
  cancelBooking = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { reason } = req.body as { reason?: string };

    const booking = await dealService.cancelBooking(userId, bookingId, reason);

    res.json({
      success: true,
      message: 'Réservation annulée avec succès',
      data: booking,
    });
  });

  /**
   * Get booking QR code
   * GET /api/v1/deals/bookings/:bookingId/qr-code
   */
  getBookingQRCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const qrCode = await dealService.getBookingQRCode(userId, bookingId);

    res.json({
      success: true,
      data: { qrCode },
    });
  });

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Create a deal
   * POST /api/v1/supplier/deals
   */
  createDeal = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const body = req.body as {
      storeId?: string;
      title: string;
      description: string;
      category: DealCategory;
      images: string[];
      originalPrice: number;
      dealPrice: number;
      includes?: string[];
      excludes?: string[];
      terms?: string;
      availableFrom: string;
      availableUntil: string;
      availableSlots?: { day: string; slots: string[] }[];
      totalQuantity: number;
      maxPerUser?: number;
      isOffPeakOnly?: boolean;
      offPeakDays?: string[];
      offPeakHours?: { start: string; end: string };
      requiresBooking?: boolean;
      bookingLeadTime?: number;
      cancellationHours?: number;
      bookingMode?: 'SINGLE_DATE' | 'DATE_RANGE';
      contactPhone?: string;
      contactEmail?: string;
    };

    const deal = await dealService.createDeal(supplierId, {
      ...body,
      availableFrom: new Date(body.availableFrom),
      availableUntil: new Date(body.availableUntil),
    });

    res.status(201).json({
      success: true,
      message: 'Deal créé avec succès. En attente de validation.',
      data: normalizeImages(deal),
    });
  });

  /**
   * Update a deal
   * PUT /api/v1/supplier/deals/:dealId
   */
  updateDeal = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { dealId } = req.params;
    const body = req.body as {
      availableFrom?: string;
      availableUntil?: string;
      [key: string]: unknown;
    };
    const updateData: Record<string, unknown> = { ...body };

    if (body.availableFrom) {
      updateData.availableFrom = new Date(body.availableFrom);
    }
    if (body.availableUntil) {
      updateData.availableUntil = new Date(body.availableUntil);
    }

    const deal = await dealService.updateDeal(supplierId, dealId, updateData);

    res.json({
      success: true,
      message: 'Deal mis à jour avec succès',
      data: normalizeImages(deal),
    });
  });

  /**
   * Toggle deal pause
   * POST /api/v1/supplier/deals/:dealId/toggle-pause
   */
  toggleDealPause = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { dealId } = req.params;

    const deal = await dealService.toggleDealPause(supplierId, dealId);

    res.json({
      success: true,
      message: `Deal ${deal.status === 'PAUSED' ? 'mis en pause' : 'réactivé'} avec succès`,
      data: normalizeImages(deal),
    });
  });

  /**
   * Delete a deal
   * DELETE /api/v1/supplier/deals/:dealId
   */
  deleteDeal = asyncHandler(async (req: Request, res: Response) => {
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
  });

  /**
   * Get supplier's deals (with pagination)
   * GET /api/v1/supplier/deals
   */
  getSupplierDeals = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { status, page, limit } = req.query;

    const result = await dealService.getSupplierDeals(supplierId, {
      status: status as DealStatus | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: normalizeImagesList(result.deals),
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get supplier's bookings
   * GET /api/v1/supplier/deals/bookings
   */
  getSupplierBookings = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { status, storeId, startDate, endDate, page, limit } = req.query;

    const result = await dealService.getSupplierBookings(supplierId, {
      status: status as BookingStatus | undefined,
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
  });

  /**
   * Validate a booking
   * POST /api/v1/supplier/deals/bookings/validate
   */
  validateBooking = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { validationCode, staffId } = req.body as {
      validationCode: string;
      staffId?: string;
    };

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
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending deals
   * GET /api/v1/admin/deals/pending
   */
  getPendingDeals = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const result = await dealService.getPendingDeals({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: normalizeImagesList(result.deals),
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Approve a deal
   * POST /api/v1/admin/deals/:dealId/approve
   */
  approveDeal = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { dealId } = req.params;

    const deal = await dealService.approveDeal(adminId, dealId);

    res.json({
      success: true,
      message: 'Deal approuvé avec succès',
      data: normalizeImages(deal),
    });
  });

  /**
   * Reject a deal
   * POST /api/v1/admin/deals/:dealId/reject
   */
  rejectDeal = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { dealId } = req.params;
    const { reason } = req.body as { reason: string };

    const deal = await dealService.rejectDeal(adminId, dealId, reason);

    res.json({
      success: true,
      message: 'Deal rejeté',
      data: normalizeImages(deal),
    });
  });
}

export default new DealController();
