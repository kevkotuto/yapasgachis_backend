import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '@/config';
import { CacheService } from '@/infrastructure/database/redis/cache.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface JWTPayload {
  id: string;
  role: string;
}

/**
 * SocketService - WebSocket management using Socket.io
 *
 * Features:
 * - JWT authentication for connections
 * - Room management for users, orders, and delivery tracking
 * - Real-time notification delivery
 * - Online user tracking via Redis
 */
class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.io server with HTTP server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        socket.userId = decoded.id;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', {
          error: (error as Error).message,
        });
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;

    logger.info('WebSocket client connected', {
      userId,
      socketId: socket.id,
      role: socket.userRole,
    });

    // Join user-specific room for personal notifications
    socket.join(`user:${userId}`);

    // Track online status in Redis
    await CacheService.addToSet('online_users', userId);
    await CacheService.set(`socket:${userId}`, socket.id, config.cache.ttl.long);

    // Send current unread count on connection
    this.sendInitialData(socket, userId);

    // Register event handlers
    this.registerEventHandlers(socket, userId);

    // Handle disconnection
    socket.on('disconnect', async () => {
      await this.handleDisconnect(userId, socket.id);
    });
  }

  /**
   * Send initial data to connected client
   */
  private async sendInitialData(
    socket: AuthenticatedSocket,
    userId: string
  ): Promise<void> {
    try {
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false },
      });
      socket.emit('notification:unread_count', { count: unreadCount });
    } catch (error) {
      logger.error('Failed to send initial data', {
        userId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Register socket event handlers
   */
  private registerEventHandlers(socket: AuthenticatedSocket, userId: string): void {
    // Join order room for real-time updates
    socket.on('order:join', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.debug('User joined order room', { userId, orderId });
    });

    socket.on('order:leave', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      logger.debug('User left order room', { userId, orderId });
    });

    // Join delivery tracking room
    socket.on('delivery:track', (orderId: string) => {
      socket.join(`delivery:${orderId}`);
      logger.debug('User started tracking delivery', { userId, orderId });
    });

    socket.on('delivery:untrack', (orderId: string) => {
      socket.leave(`delivery:${orderId}`);
      logger.debug('User stopped tracking delivery', { userId, orderId });
    });

    // Typing indicators (for future chat feature)
    socket.on('typing:start', (roomId: string) => {
      socket.to(roomId).emit('typing:start', { userId });
    });

    socket.on('typing:stop', (roomId: string) => {
      socket.to(roomId).emit('typing:stop', { userId });
    });
  }

  /**
   * Handle socket disconnection
   */
  private async handleDisconnect(userId: string, socketId: string): Promise<void> {
    await CacheService.removeFromSet('online_users', userId);
    await CacheService.delete(`socket:${userId}`);

    logger.info('WebSocket client disconnected', { userId, socketId });
  }

  /**
   * Send event to a specific user
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) {
      logger.warn('Socket.io not initialized');
      return;
    }
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send event to multiple users
   */
  sendToUsers(userIds: string[], event: string, data: unknown): void {
    if (!this.io) return;
    userIds.forEach((userId) => {
      this.io!.to(`user:${userId}`).emit(event, data);
    });
  }

  /**
   * Send event to an order room (all participants)
   */
  sendToOrder(orderId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`order:${orderId}`).emit(event, data);
  }

  /**
   * Send delivery location update to tracking room
   */
  sendDeliveryUpdate(
    orderId: string,
    location: { latitude: number; longitude: number }
  ): void {
    if (!this.io) return;
    this.io.to(`delivery:${orderId}`).emit('delivery:location', {
      orderId,
      location,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Check if a user is currently online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return CacheService.isInSet('online_users', userId);
  }

  /**
   * Get all online user IDs
   */
  async getOnlineUsers(): Promise<string[]> {
    return CacheService.getSetMembers('online_users');
  }

  /**
   * Get online user count
   */
  async getOnlineUserCount(): Promise<number> {
    const users = await this.getOnlineUsers();
    return users.length;
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server | null {
    return this.io;
  }

  /**
   * Gracefully close WebSocket server
   */
  async close(): Promise<void> {
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
  }
}

export const socketService = SocketService.getInstance();
export default socketService;
