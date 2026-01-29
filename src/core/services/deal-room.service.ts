import { DealRoom } from '@prisma/client';

import { AppError } from '@/middleware/error-handler.middleware';
import { DealRoomRepository } from '@/core/repositories/deal-room.repository';
import { DealRepository } from '@/core/repositories/deal.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export interface CreateDealRoomDTO {
  dealId: string;
  title: string;
  description?: string;
  price: number;
  capacity?: string;
  size?: string;
  floor?: string;
  amenities?: string[];
  bedTypes?: string[];
  images?: string[];
  maxOccupancy?: number;
  isAvailable?: boolean;
}

export interface UpdateDealRoomDTO {
  title?: string;
  description?: string;
  price?: number;
  capacity?: string;
  size?: string;
  floor?: string;
  amenities?: string[];
  bedTypes?: string[];
  images?: string[];
  maxOccupancy?: number;
  isAvailable?: boolean;
}

/**
 * Deal Room Service
 * Business logic for managing deal rooms (hotel rooms, etc.)
 */
export class DealRoomService {
  private dealRoomRepo: DealRoomRepository;
  private dealRepo: DealRepository;

  constructor() {
    this.dealRoomRepo = new DealRoomRepository();
    this.dealRepo = new DealRepository();
  }

  /**
   * Create a new room for a deal
   * Only the supplier owner can create rooms
   */
  async createRoom(userId: string, data: CreateDealRoomDTO): Promise<DealRoom> {
    // Check if deal exists and user is the owner
    const deal = await this.dealRepo.findById(data.dealId);
    if (!deal) {
      throw new AppError(404, 'Deal not found');
    }

    // Check if user is the owner
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: deal.supplierId },
      select: { userId: true },
    });

    if (!supplier || supplier.userId !== userId) {
      throw new AppError(
        403,
        'Vous n\u0027êtes pas autorisé à créer des chambres pour ce deal'
      );
    }

    const room = await this.dealRoomRepo.create({
      deal: {
        connect: { id: data.dealId },
      },
      title: data.title,
      description: data.description,
      price: data.price,
      capacity: data.capacity,
      size: data.size,
      floor: data.floor,
      amenities: data.amenities || [],
      bedTypes: data.bedTypes || [],
      images: data.images || [],
      maxOccupancy: data.maxOccupancy,
      isAvailable: data.isAvailable ?? true,
    });

    logger.info('Deal room created', {
      roomId: room.id,
      dealId: data.dealId,
      userId,
    });

    return room;
  }

  /**
   * Get all rooms for a deal
   */
  async getRoomsByDealId(
    dealId: string,
    availableOnly: boolean = false
  ): Promise<DealRoom[]> {
    // Check if deal exists
    const deal = await this.dealRepo.findById(dealId);
    if (!deal) {
      throw new AppError(404, 'Deal not found');
    }

    if (availableOnly) {
      return await this.dealRoomRepo.findAvailableByDealId(dealId);
    }

    return await this.dealRoomRepo.findByDealId(dealId);
  }

  /**
   * Get a specific room
   */
  async getRoom(roomId: string): Promise<DealRoom> {
    const room = await this.dealRoomRepo.findById(roomId);
    if (!room) {
      throw new AppError(404, 'Chambre non trouvée');
    }

    return room;
  }

  /**
   * Update a room
   * Only the supplier owner can update
   */
  async updateRoom(
    userId: string,
    roomId: string,
    data: UpdateDealRoomDTO
  ): Promise<DealRoom> {
    const room = await this.dealRoomRepo.findById(roomId);
    if (!room) {
      throw new AppError(404, 'Chambre non trouvée');
    }

    // Check if user is the owner - get deal to access supplier
    const deal = await this.dealRepo.findById(room.dealId);
    if (!deal) {
      throw new AppError(404, 'Deal not found');
    }

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: deal.supplierId },
      select: { userId: true },
    });

    if (!supplier || supplier.userId !== userId) {
      throw new AppError(
        403,
        'Vous n\u0027êtes pas autorisé à modifier cette chambre'
      );
    }

    const updated = await this.dealRoomRepo.update(roomId, {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.size !== undefined && { size: data.size }),
      ...(data.floor !== undefined && { floor: data.floor }),
      ...(data.amenities && { amenities: data.amenities }),
      ...(data.bedTypes && { bedTypes: data.bedTypes }),
      ...(data.images && { images: data.images }),
      ...(data.maxOccupancy !== undefined && {
        maxOccupancy: data.maxOccupancy,
      }),
      ...(data.isAvailable !== undefined && {
        isAvailable: data.isAvailable,
      }),
    });

    logger.info('Deal room updated', {
      roomId,
      userId,
    });

    return updated;
  }

  /**
   * Delete a room
   * Only the supplier owner can delete
   */
  async deleteRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.dealRoomRepo.findById(roomId);
    if (!room) {
      throw new AppError(404, 'Chambre non trouvée');
    }

    // Check if user is the owner - get deal to access supplier
    const deal = await this.dealRepo.findById(room.dealId);
    if (!deal) {
      throw new AppError(404, 'Deal not found');
    }

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: deal.supplierId },
      select: { userId: true },
    });

    if (!supplier || supplier.userId !== userId) {
      throw new AppError(
        403,
        'Vous n\u0027êtes pas autorisé à supprimer cette chambre'
      );
    }

    await this.dealRoomRepo.delete(roomId);

    logger.info('Deal room deleted', {
      roomId,
      userId,
    });
  }
}
