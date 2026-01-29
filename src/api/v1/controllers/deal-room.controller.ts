import { Request, Response } from 'express';

import { DealRoomService } from '@/core/services/deal-room.service';
import { asyncHandler } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import {
  CreateDealRoomInput,
  UpdateDealRoomInput,
  GetRoomsByDealIdInput,
  GetRoomByIdInput,
  DeleteRoomInput,
} from '@/api/v1/validators/deal-room.validator';
import { normalizeImages, normalizeImagesList } from '@/utils/normalize.utils';

const dealRoomService = new DealRoomService();

/**
 * Deal Room Controller
 * Handles HTTP requests for deal rooms
 */
export class DealRoomController {
  /**
   * Create a new room for a deal
   * POST /api/v1/deals/:dealId/rooms
   */
  createRoom = asyncHandler(
    async (
      req: Request<
        CreateDealRoomInput['params'],
        {},
        CreateDealRoomInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { dealId } = req.params;
      const { title, price, ...rest } = req.body;

      const room = await dealRoomService.createRoom(userId, {
        dealId,
        title: title!,
        price: price!,
        ...rest,
      });

      logger.info('Room created via API', {
        userId,
        dealId,
        roomId: room.id,
      });

      res.status(201).json({
        success: true,
        message: 'Chambre créée avec succès',
        data: normalizeImages(room),
      });
    }
  );

  /**
   * Get all rooms for a deal
   * GET /api/v1/deals/:dealId/rooms
   */
  getRoomsByDealId = asyncHandler(
    async (
      req: Request<
        GetRoomsByDealIdInput['params'],
        {},
        {},
        GetRoomsByDealIdInput['query']
      >,
      res: Response
    ) => {
      const { dealId } = req.params;
      const { availableOnly } = req.query;

      const rooms = await dealRoomService.getRoomsByDealId(
        dealId,
        availableOnly
      );

      res.json({
        success: true,
        data: {
          rooms: normalizeImagesList(rooms),
          count: rooms.length,
        },
      });
    }
  );

  /**
   * Get a specific room
   * GET /api/v1/deals/:dealId/rooms/:roomId
   */
  getRoomById = asyncHandler(
    async (req: Request<GetRoomByIdInput['params']>, res: Response) => {
      const { roomId } = req.params;

      const room = await dealRoomService.getRoom(roomId);

      res.json({
        success: true,
        data: normalizeImages(room),
      });
    }
  );

  /**
   * Update a room
   * PUT /api/v1/deals/:dealId/rooms/:roomId
   */
  updateRoom = asyncHandler(
    async (
      req: Request<
        UpdateDealRoomInput['params'],
        {},
        UpdateDealRoomInput['body']
      >,
      res: Response
    ) => {
      const userId = req.user.id;
      const { roomId } = req.params;

      const room = await dealRoomService.updateRoom(userId, roomId, req.body);

      logger.info('Room updated via API', {
        userId,
        roomId,
      });

      res.json({
        success: true,
        message: 'Chambre mise à jour avec succès',
        data: normalizeImages(room),
      });
    }
  );

  /**
   * Delete a room
   * DELETE /api/v1/deals/:dealId/rooms/:roomId
   */
  deleteRoom = asyncHandler(
    async (req: Request<DeleteRoomInput['params']>, res: Response) => {
      const userId = req.user.id;
      const { roomId } = req.params;

      await dealRoomService.deleteRoom(userId, roomId);

      logger.info('Room deleted via API', {
        userId,
        roomId,
      });

      res.json({
        success: true,
        message: 'Chambre supprimée avec succès',
      });
    }
  );
}

export const dealRoomController = new DealRoomController();
