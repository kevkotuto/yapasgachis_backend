import {
  Deal,
  DealBooking,
  DealStatus,
  DealCategory,
  BookingStatus,
} from '@prisma/client';
import dealRepository, { DealRepository } from '@/core/repositories/deal.repository';
import dealBookingRepository, {
  DealBookingRepository,
} from '@/core/repositories/deal-booking.repository';
import supplierRepository from '@/core/repositories/supplier.repository';
import supplierStoreRepository from '@/core/repositories/supplier-store.repository';
import subscriptionService from '@/core/services/subscription.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { generateRandomCode } from '@/utils/helpers';
import { generateQRCode } from '@/utils/qr-code.utils';

/**
 * Deal Service
 * Business logic for deals/special offers
 */
export class DealService {
  constructor(
    private dealRepo: DealRepository,
    private bookingRepo: DealBookingRepository
  ) {}

  // ==================== SUPPLIER DEAL MANAGEMENT ====================

  /**
   * Create a new deal (supplier)
   */
  async createDeal(
    supplierId: string,
    data: {
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
      availableFrom: Date;
      availableUntil: Date;
      availableSlots?: { day: string; slots: string[] }[];
      totalQuantity: number;
      maxPerUser?: number;
      isOffPeakOnly?: boolean;
      offPeakDays?: string[];
      offPeakHours?: { start: string; end: string };
      requiresBooking?: boolean;
      bookingLeadTime?: number;
      cancellationHours?: number;
      contactPhone?: string;
      contactEmail?: string;
    }
  ): Promise<Deal> {
    try {
      // Verify supplier exists and is active
      const supplier = await supplierRepository.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      // Check subscription allows deals
      const limits = await subscriptionService.checkSupplierLimits(supplierId);
      if (!limits.canCreateDeal) {
        throw new AppError(
          403,
          'Votre abonnement ne permet pas de créer des deals ou vous avez atteint la limite',
          'DEAL_LIMIT_REACHED'
        );
      }

      // Verify store if provided
      if (data.storeId) {
        const store = await supplierStoreRepository.findById(data.storeId);
        if (!store || store.supplierId !== supplierId) {
          throw new AppError(404, 'Magasin non trouvé', 'STORE_NOT_FOUND');
        }
      }

      // Validate dates
      if (data.availableFrom >= data.availableUntil) {
        throw new AppError(
          400,
          'La date de fin doit être après la date de début',
          'INVALID_DATES'
        );
      }

      // Calculate discount percentage
      const discountPercent = Math.round(
        ((data.originalPrice - data.dealPrice) / data.originalPrice) * 100
      );

      const deal = await this.dealRepo.create({
        supplier: { connect: { id: supplierId } },
        ...(data.storeId && { store: { connect: { id: data.storeId } } }),
        title: data.title,
        description: data.description,
        category: data.category,
        images: data.images,
        originalPrice: data.originalPrice,
        dealPrice: data.dealPrice,
        discountPercent,
        includes: data.includes,
        excludes: data.excludes,
        terms: data.terms,
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
        availableSlots: data.availableSlots,
        totalQuantity: data.totalQuantity,
        quantityAvailable: data.totalQuantity,
        maxPerUser: data.maxPerUser || 1,
        isOffPeakOnly: data.isOffPeakOnly || false,
        offPeakDays: data.offPeakDays,
        offPeakHours: data.offPeakHours,
        requiresBooking: data.requiresBooking !== false,
        bookingLeadTime: data.bookingLeadTime || 0,
        cancellationHours: data.cancellationHours || 24,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        status: 'PENDING_APPROVAL', // Requires admin approval
      });

      logger.info('Deal created', {
        supplierId,
        dealId: deal.id,
        title: deal.title,
        storeId: data.storeId,
      });

      return deal;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating deal', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du deal');
    }
  }

  /**
   * Update deal (supplier)
   */
  async updateDeal(
    supplierId: string,
    dealId: string,
    data: {
      title?: string;
      description?: string;
      images?: string[];
      originalPrice?: number;
      dealPrice?: number;
      includes?: string[];
      excludes?: string[];
      terms?: string;
      availableFrom?: Date;
      availableUntil?: Date;
      availableSlots?: { day: string; slots: string[] }[];
      totalQuantity?: number;
      maxPerUser?: number;
      isOffPeakOnly?: boolean;
      offPeakDays?: string[];
      offPeakHours?: { start: string; end: string };
      bookingLeadTime?: number;
      cancellationHours?: number;
      contactPhone?: string;
      contactEmail?: string;
    }
  ): Promise<Deal> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      // Cannot modify if active with bookings
      if (deal.status === 'ACTIVE' && deal.bookingsCount > 0) {
        // Only allow certain updates
        const allowedFields = ['description', 'terms', 'contactPhone', 'contactEmail'];
        const dataKeys = Object.keys(data);
        const hasRestrictedChanges = dataKeys.some((key) => !allowedFields.includes(key));

        if (hasRestrictedChanges) {
          throw new AppError(
            400,
            'Un deal actif avec des réservations ne peut pas être modifié substantiellement',
            'DEAL_HAS_BOOKINGS'
          );
        }
      }

      // Recalculate discount if prices change
      let updateData: any = { ...data };
      if (data.originalPrice || data.dealPrice) {
        const originalPrice = data.originalPrice || deal.originalPrice;
        const dealPrice = data.dealPrice || deal.dealPrice;
        updateData.discountPercent = Math.round(
          ((originalPrice - dealPrice) / originalPrice) * 100
        );
      }

      // Adjust quantity available if total quantity changes
      if (data.totalQuantity) {
        const diff = data.totalQuantity - deal.totalQuantity;
        updateData.quantityAvailable = deal.quantityAvailable + diff;
        if (updateData.quantityAvailable < 0) {
          throw new AppError(
            400,
            'La nouvelle quantité est inférieure aux réservations existantes',
            'QUANTITY_TOO_LOW'
          );
        }
      }

      // If modifying an approved deal, revert to pending
      if (deal.status === 'ACTIVE' && Object.keys(data).length > 0) {
        updateData.status = 'PENDING_APPROVAL';
      }

      const updated = await this.dealRepo.update(dealId, updateData);

      logger.info('Deal updated', {
        supplierId,
        dealId,
        changes: Object.keys(data),
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating deal', {
        supplierId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du deal');
    }
  }

  /**
   * Pause/unpause deal (supplier)
   */
  async toggleDealPause(supplierId: string, dealId: string): Promise<Deal> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      const newStatus = deal.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';

      if (newStatus === 'ACTIVE' && deal.status !== 'PAUSED') {
        throw new AppError(400, 'Seul un deal en pause peut être réactivé', 'INVALID_STATUS');
      }

      const updated = await this.dealRepo.update(dealId, { status: newStatus });

      logger.info('Deal pause toggled', {
        supplierId,
        dealId,
        newStatus,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error toggling deal pause', {
        supplierId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du changement de statut');
    }
  }

  /**
   * Delete deal (supplier)
   */
  async deleteDeal(supplierId: string, dealId: string): Promise<void> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      // Cannot delete if has active bookings
      if (deal.bookingsCount > 0) {
        // Archive instead of delete
        await this.dealRepo.update(dealId, { status: 'ARCHIVED' });
        logger.info('Deal archived (had bookings)', { supplierId, dealId });
        return;
      }

      await this.dealRepo.delete(dealId);

      logger.info('Deal deleted', {
        supplierId,
        dealId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting deal', {
        supplierId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du deal');
    }
  }

  /**
   * Get supplier's deals
   */
  async getSupplierDeals(
    supplierId: string,
    status?: DealStatus
  ): Promise<Deal[]> {
    return this.dealRepo.findBySupplierId(supplierId, status);
  }

  // ==================== PUBLIC DEAL BROWSING ====================

  /**
   * Search deals (public)
   */
  async searchDeals(params: {
    search?: string;
    category?: DealCategory;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    isOffPeakOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ deals: Deal[]; total: number; pages: number }> {
    const { deals, total } = await this.dealRepo.search({
      ...params,
      status: 'ACTIVE',
      availableNow: true,
    });

    const limit = params.limit || 20;
    const pages = Math.ceil(total / limit);

    return { deals, total, pages };
  }

  /**
   * Get deal by ID (public)
   */
  async getDealById(dealId: string, incrementView = true): Promise<Deal> {
    const deal = await this.dealRepo.findById(dealId);
    if (!deal) {
      throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
    }

    // Don't show non-active deals to public
    if (deal.status !== 'ACTIVE') {
      throw new AppError(404, 'Deal non disponible', 'DEAL_NOT_AVAILABLE');
    }

    if (incrementView) {
      await this.dealRepo.incrementViews(dealId);
    }

    return deal;
  }

  // ==================== BOOKING MANAGEMENT ====================

  /**
   * Book a deal (user)
   */
  async bookDeal(
    userId: string,
    dealId: string,
    data: {
      bookingDate: Date;
      bookingSlot?: string;
      quantity?: number;
      paymentMethod: 'WAVE' | 'CASH_ON_DELIVERY';
      userNotes?: string;
    }
  ): Promise<DealBooking> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.status !== 'ACTIVE') {
        throw new AppError(400, 'Ce deal n\'est plus disponible', 'DEAL_NOT_ACTIVE');
      }

      const quantity = data.quantity || 1;

      // Check availability
      if (deal.quantityAvailable < quantity) {
        throw new AppError(400, 'Stock insuffisant', 'INSUFFICIENT_STOCK');
      }

      // Check user hasn't exceeded max per user
      const userBookings = await this.bookingRepo.countUserBookingsForDeal(userId, dealId);
      if (userBookings + quantity > deal.maxPerUser) {
        throw new AppError(
          400,
          `Vous ne pouvez réserver que ${deal.maxPerUser} fois ce deal`,
          'MAX_PER_USER_EXCEEDED'
        );
      }

      // Check booking date is within deal availability
      const bookingDate = new Date(data.bookingDate);
      if (bookingDate < deal.availableFrom || bookingDate > deal.availableUntil) {
        throw new AppError(
          400,
          'La date de réservation n\'est pas dans la période de validité',
          'INVALID_BOOKING_DATE'
        );
      }

      // Check booking lead time
      if (deal.bookingLeadTime > 0) {
        const minBookingTime = new Date();
        minBookingTime.setHours(minBookingTime.getHours() + deal.bookingLeadTime);
        if (bookingDate < minBookingTime) {
          throw new AppError(
            400,
            `Vous devez réserver au moins ${deal.bookingLeadTime} heures à l'avance`,
            'BOOKING_LEAD_TIME'
          );
        }
      }

      // Check off-peak restrictions
      if (deal.isOffPeakOnly && deal.offPeakDays) {
        const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const offPeakDays = deal.offPeakDays as string[];
        if (!offPeakDays.includes(dayName)) {
          throw new AppError(
            400,
            'Ce deal n\'est disponible que certains jours',
            'OFF_PEAK_ONLY'
          );
        }
      }

      // Check slot if required
      if (deal.availableSlots && !data.bookingSlot) {
        throw new AppError(400, 'Veuillez sélectionner un créneau horaire', 'SLOT_REQUIRED');
      }

      // Generate validation code
      const validationCode = generateRandomCode(8).toUpperCase();

      // Calculate total price
      const totalPrice = deal.dealPrice * quantity;

      // Create booking
      const booking = await this.bookingRepo.create({
        deal: { connect: { id: dealId } },
        userId,
        quantity,
        bookingDate,
        bookingSlot: data.bookingSlot,
        unitPrice: deal.dealPrice,
        totalPrice,
        validationCode,
        paymentMethod: data.paymentMethod,
        userNotes: data.userNotes,
        status: 'PENDING',
      });

      // Decrement available quantity
      await this.dealRepo.decrementQuantity(dealId, quantity);

      logger.info('Deal booked', {
        userId,
        dealId,
        bookingId: booking.id,
        quantity,
        totalPrice,
      });

      return booking;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error booking deal', {
        userId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la réservation');
    }
  }

  /**
   * Confirm booking payment
   */
  async confirmBookingPayment(
    bookingId: string,
    paymentReference: string
  ): Promise<DealBooking> {
    try {
      const booking = await this.bookingRepo.findById(bookingId);
      if (!booking) {
        throw new AppError(404, 'Réservation non trouvée', 'BOOKING_NOT_FOUND');
      }

      if (booking.status !== 'PENDING') {
        throw new AppError(400, 'Réservation déjà traitée', 'BOOKING_ALREADY_PROCESSED');
      }

      const updated = await this.bookingRepo.updateStatus(bookingId, 'CONFIRMED', {
        paidAt: new Date(),
      });

      await this.bookingRepo.update(bookingId, { paymentReference });

      logger.info('Booking payment confirmed', {
        bookingId,
        paymentReference,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error confirming booking payment', {
        bookingId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la confirmation du paiement');
    }
  }

  /**
   * Cancel booking (user)
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string
  ): Promise<DealBooking> {
    try {
      const booking = await this.bookingRepo.findById(bookingId);
      if (!booking) {
        throw new AppError(404, 'Réservation non trouvée', 'BOOKING_NOT_FOUND');
      }

      if (booking.userId !== userId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new AppError(400, 'Cette réservation ne peut pas être annulée', 'CANNOT_CANCEL');
      }

      // Check cancellation deadline
      const deal = await this.dealRepo.findById(booking.dealId);
      if (deal && deal.cancellationHours > 0) {
        const deadline = new Date(booking.bookingDate);
        deadline.setHours(deadline.getHours() - deal.cancellationHours);

        if (new Date() > deadline) {
          throw new AppError(
            400,
            `L'annulation gratuite n'est plus possible (délai: ${deal.cancellationHours}h avant)`,
            'CANCELLATION_DEADLINE_PASSED'
          );
        }
      }

      // Restore quantity to deal
      if (deal) {
        await this.dealRepo.update(booking.dealId, {
          quantityAvailable: { increment: booking.quantity },
          bookingsCount: { decrement: 1 },
        });
      }

      const updated = await this.bookingRepo.updateStatus(bookingId, 'CANCELLED', {
        cancelledAt: new Date(),
        cancelReason: reason,
      });

      // TODO: Process refund if payment was made

      logger.info('Booking cancelled', {
        userId,
        bookingId,
        reason,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error cancelling booking', {
        userId,
        bookingId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de l\'annulation');
    }
  }

  /**
   * Validate booking (supplier - at point of service)
   */
  async validateBooking(
    supplierId: string,
    validationCode: string,
    staffId?: string
  ): Promise<DealBooking> {
    try {
      const booking = await this.bookingRepo.findByValidationCode(validationCode);
      if (!booking) {
        throw new AppError(404, 'Code de validation invalide', 'INVALID_VALIDATION_CODE');
      }

      // Verify supplier ownership
      if (booking.deal?.supplierId !== supplierId) {
        throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
      }

      if (booking.status !== 'CONFIRMED') {
        if (booking.status === 'USED') {
          throw new AppError(400, 'Cette réservation a déjà été utilisée', 'ALREADY_USED');
        }
        throw new AppError(400, 'Cette réservation ne peut pas être validée', 'CANNOT_VALIDATE');
      }

      // Check booking date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bookingDay = new Date(booking.bookingDate);
      bookingDay.setHours(0, 0, 0, 0);

      if (bookingDay.getTime() !== today.getTime()) {
        throw new AppError(
          400,
          'Cette réservation n\'est pas pour aujourd\'hui',
          'WRONG_DATE'
        );
      }

      const updated = await this.bookingRepo.updateStatus(bookingId, 'USED', {
        usedAt: new Date(),
        usedByStaffId: staffId,
      });

      // Increment deal used count
      await this.dealRepo.incrementUsedCount(booking.dealId);

      logger.info('Booking validated', {
        supplierId,
        bookingId: booking.id,
        validationCode,
        staffId,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error validating booking', {
        supplierId,
        validationCode,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la validation');
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    params?: {
      status?: BookingStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ bookings: DealBooking[]; total: number; pages: number }> {
    const { bookings, total } = await this.bookingRepo.findByUserId(userId, params);
    const limit = params?.limit || 20;
    const pages = Math.ceil(total / limit);

    return { bookings, total, pages };
  }

  /**
   * Get supplier's bookings
   */
  async getSupplierBookings(
    supplierId: string,
    params?: {
      status?: BookingStatus;
      storeId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ bookings: DealBooking[]; total: number; pages: number }> {
    const { bookings, total } = await this.bookingRepo.findBySupplierId(
      supplierId,
      params
    );
    const limit = params?.limit || 20;
    const pages = Math.ceil(total / limit);

    return { bookings, total, pages };
  }

  /**
   * Get booking QR code
   */
  async getBookingQRCode(userId: string, bookingId: string): Promise<string> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new AppError(404, 'Réservation non trouvée', 'BOOKING_NOT_FOUND');
    }

    if (booking.userId !== userId) {
      throw new AppError(403, 'Accès non autorisé', 'FORBIDDEN');
    }

    return generateQRCode(booking.validationCode);
  }

  // ==================== ADMIN MODERATION ====================

  /**
   * Get deals pending moderation (admin)
   */
  async getPendingDeals(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ deals: Deal[]; total: number; pages: number }> {
    const { deals, total } = await this.dealRepo.findPendingModeration(params);
    const limit = params?.limit || 20;
    const pages = Math.ceil(total / limit);

    return { deals, total, pages };
  }

  /**
   * Approve deal (admin)
   */
  async approveDeal(adminId: string, dealId: string): Promise<Deal> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.status !== 'PENDING_APPROVAL') {
        throw new AppError(400, 'Ce deal ne nécessite pas d\'approbation', 'INVALID_STATUS');
      }

      const updated = await this.dealRepo.update(dealId, {
        status: 'ACTIVE',
        moderatedAt: new Date(),
        moderatedByAdminId: adminId,
      });

      logger.info('Deal approved', {
        adminId,
        dealId,
        supplierId: deal.supplierId,
      });

      // TODO: Send notification to supplier

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error approving deal', {
        adminId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de l\'approbation du deal');
    }
  }

  /**
   * Reject deal (admin)
   */
  async rejectDeal(
    adminId: string,
    dealId: string,
    reason: string
  ): Promise<Deal> {
    try {
      const deal = await this.dealRepo.findById(dealId);
      if (!deal) {
        throw new AppError(404, 'Deal non trouvé', 'DEAL_NOT_FOUND');
      }

      if (deal.status !== 'PENDING_APPROVAL') {
        throw new AppError(400, 'Ce deal ne peut pas être rejeté', 'INVALID_STATUS');
      }

      const updated = await this.dealRepo.update(dealId, {
        status: 'REJECTED',
        moderatedAt: new Date(),
        moderatedByAdminId: adminId,
        rejectionReason: reason,
      });

      logger.info('Deal rejected', {
        adminId,
        dealId,
        reason,
      });

      // TODO: Send notification to supplier

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error rejecting deal', {
        adminId,
        dealId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du rejet du deal');
    }
  }

  // ==================== CRON JOBS ====================

  /**
   * Update expired deals (cron job)
   */
  async updateExpiredDeals(): Promise<number> {
    const count = await this.dealRepo.updateExpiredDeals();
    logger.info('Expired deals updated', { count });
    return count;
  }

  /**
   * Update expired bookings (cron job)
   */
  async updateExpiredBookings(): Promise<number> {
    const count = await this.bookingRepo.updateExpiredBookings();
    logger.info('Expired bookings updated', { count });
    return count;
  }
}

export default new DealService(dealRepository, dealBookingRepository);
