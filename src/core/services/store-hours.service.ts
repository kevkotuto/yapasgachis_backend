import storeHoursRepository from '@/core/repositories/store-hours.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

interface TimeSlot {
  open: string;
  close: string;
}

interface DayHours {
  day: string;
  isClosed: boolean;
  slots: TimeSlot[];
}

/**
 * Store Hours Service
 * Business logic for store operating hours
 */
export class StoreHoursService {
  private readonly DAYS_OF_WEEK = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  /**
   * Create store hours
   */
  async createStoreHours(
    supplierId: string,
    data: {
      storeId: string;
      hours: DayHours[];
      timezone?: string;
      specialNotes?: string;
    }
  ) {
    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: data.storeId },
      select: { supplierId: true },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    if (store.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce magasin");
    }

    // Validate hours format
    this.validateHours(data.hours);

    // Check if hours already exist
    const existing = await storeHoursRepository.findByStoreId(data.storeId);
    if (existing) {
      throw new AppError(400, 'Les horaires existent déjà pour ce magasin');
    }

    const storeHours = await storeHoursRepository.create({
      storeId: data.storeId,
      hours: data.hours,
      timezone: data.timezone,
      specialNotes: data.specialNotes,
    });

    logger.info('Store hours created', {
      supplierId,
      storeId: data.storeId,
    });

    return this.enrichWithCurrentStatus(storeHours);
  }

  /**
   * Get store hours
   */
  async getStoreHours(storeId: string) {
    const storeHours = await storeHoursRepository.findByStoreId(storeId);

    if (!storeHours) {
      throw new AppError(404, 'Horaires non configurés pour ce magasin');
    }

    return this.enrichWithCurrentStatus(storeHours);
  }

  /**
   * Update store hours
   */
  async updateStoreHours(
    supplierId: string,
    storeId: string,
    data: {
      hours?: DayHours[];
      timezone?: string;
      specialNotes?: string;
    }
  ) {
    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: storeId },
      select: { supplierId: true },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    if (store.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce magasin");
    }

    // Validate hours if provided
    if (data.hours) {
      this.validateHours(data.hours);
    }

    const storeHours = await storeHoursRepository.update(storeId, data);

    logger.info('Store hours updated', {
      supplierId,
      storeId,
    });

    return this.enrichWithCurrentStatus(storeHours);
  }

  /**
   * Delete store hours
   */
  async deleteStoreHours(supplierId: string, storeId: string) {
    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: storeId },
      select: { supplierId: true },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    if (store.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce magasin");
    }

    await storeHoursRepository.delete(storeId);

    logger.info('Store hours deleted', {
      supplierId,
      storeId,
    });

    return { success: true };
  }

  /**
   * Create special closure
   */
  async createSpecialClosure(
    supplierId: string,
    data: {
      storeId: string;
      date: Date;
      reason: string;
      allDay: boolean;
      from?: string;
      to?: string;
    }
  ) {
    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: data.storeId },
      select: { supplierId: true },
    });

    if (!store) {
      throw new AppError(404, 'Magasin non trouvé');
    }

    if (store.supplierId !== supplierId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce magasin");
    }

    // Validate time slots if not all day
    if (!data.allDay && (!data.from || !data.to)) {
      throw new AppError(
        400,
        "Les horaires de début et fin sont requis si ce n'est pas une fermeture toute la journée"
      );
    }

    const closure = await storeHoursRepository.createSpecialClosure(data);

    logger.info('Special closure created', {
      supplierId,
      storeId: data.storeId,
      date: data.date,
    });

    return closure;
  }

  /**
   * Get special closures
   */
  async getSpecialClosures(storeId: string, futureOnly = true) {
    const fromDate = futureOnly ? new Date() : undefined;
    return await storeHoursRepository.findSpecialClosures(storeId, fromDate);
  }

  /**
   * Delete special closure
   */
  async deleteSpecialClosure(supplierId: string, closureId: string) {
    const closure =
      await storeHoursRepository.findSpecialClosureById(closureId);

    if (!closure) {
      throw new AppError(404, 'Fermeture spéciale non trouvée');
    }

    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: closure.storeId },
      select: { supplierId: true },
    });

    if (!store || store.supplierId !== supplierId) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à supprimer cette fermeture"
      );
    }

    await storeHoursRepository.deleteSpecialClosure(closureId);

    logger.info('Special closure deleted', {
      supplierId,
      closureId,
    });

    return { success: true };
  }

  /**
   * Check if store is currently open
   */
  async isStoreOpen(storeId: string): Promise<boolean> {
    const storeHours = await storeHoursRepository.findByStoreId(storeId);

    if (!storeHours) {
      return false;
    }

    const now = new Date();

    // Check special closure
    const hasSpecialClosure = await storeHoursRepository.hasSpecialClosure(
      storeId,
      now
    );
    if (hasSpecialClosure) {
      return false;
    }

    // Get current day and time
    const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Adjust to match MONDAY = 0
    const currentDay = this.DAYS_OF_WEEK[adjustedDayIndex];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const hours = storeHours.hours as any;
    const dayHours = hours.find((h: any) => h.day === currentDay);

    if (!dayHours || dayHours.isClosed) {
      return false;
    }

    // Check if current time is within any slot
    return dayHours.slots.some((slot: TimeSlot) => {
      return currentTime >= slot.open && currentTime <= slot.close;
    });
  }

  /**
   * Get next opening time
   */
  async getNextOpenTime(storeId: string): Promise<string | null> {
    const storeHours = await storeHoursRepository.findByStoreId(storeId);

    if (!storeHours) {
      return null;
    }

    const now = new Date();
    const hours = storeHours.hours as any;

    // Try next 7 days
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);

      const dayIndex = checkDate.getDay();
      const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      const day = this.DAYS_OF_WEEK[adjustedDayIndex];

      const dayHours = hours.find((h: any) => h.day === day);

      if (dayHours && !dayHours.isClosed && dayHours.slots.length > 0) {
        const firstSlot = dayHours.slots[0];
        return `${day} ${firstSlot.open}`;
      }
    }

    return null;
  }

  /**
   * Validate hours format
   */
  private validateHours(hours: DayHours[]) {
    // Check all days are present
    const providedDays = hours.map((h) => h.day);
    const missingDays = this.DAYS_OF_WEEK.filter(
      (day) => !providedDays.includes(day)
    );

    if (missingDays.length > 0) {
      throw new AppError(400, `Jours manquants: ${missingDays.join(', ')}`);
    }

    // Validate time slots
    for (const dayHours of hours) {
      if (!dayHours.isClosed && dayHours.slots.length === 0) {
        throw new AppError(
          400,
          `${dayHours.day}: Au moins un créneau horaire requis`
        );
      }

      for (const slot of dayHours.slots) {
        if (!this.isValidTime(slot.open) || !this.isValidTime(slot.close)) {
          throw new AppError(
            400,
            `${dayHours.day}: Format d'heure invalide (HH:MM)`
          );
        }

        if (slot.open >= slot.close) {
          throw new AppError(
            400,
            `${dayHours.day}: L'heure d'ouverture doit être avant l'heure de fermeture`
          );
        }
      }
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTime(time: string): boolean {
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }

  /**
   * Enrich store hours with current status
   */
  private async enrichWithCurrentStatus(storeHours: any) {
    const isCurrentlyOpen = await this.isStoreOpen(storeHours.storeId);
    const nextOpenTime = isCurrentlyOpen
      ? null
      : await this.getNextOpenTime(storeHours.storeId);

    return {
      ...storeHours,
      isCurrentlyOpen,
      nextOpenTime,
    };
  }
}

export default new StoreHoursService();
