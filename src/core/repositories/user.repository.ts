import { User, UserRole, UserStatus, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export class UserRepository {
  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by ID with profile relations
   */
  async findByIdWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        supplierProfile: true,
        associationProfile: true,
        advertiserProfile: true,
      },
    });
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phoneNumber },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by phone or email
   */
  async findByPhoneOrEmail(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: identifier }, { email: identifier }],
      },
    });
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.DEACTIVATED,
      },
    });
  }

  /**
   * Hard delete user
   */
  async hardDelete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Check if user exists by phone
   */
  async existsByPhone(phoneNumber: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { phoneNumber },
    });
    return count > 0;
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Verify phone number
   */
  async verifyPhoneNumber(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        phoneVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
  }

  /**
   * Update password
   */
  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Update location
   */
  async updateLocation(
    id: string,
    data: {
      city?: string;
      commune?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Get users by role
   */
  async findByRole(role: UserRole, limit: number = 50): Promise<User[]> {
    return prisma.user.findMany({
      where: { role },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get users count
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * Search users
   */
  async search(
    query: string,
    options?: {
      role?: UserRole;
      status?: UserStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { phoneNumber: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          options?.role ? { role: options.role } : {},
          options?.status ? { status: options.status } : {},
        ],
      },
      take: options?.limit || 20,
      skip: options?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get users near location
   */
  async findNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options?: {
      role?: UserRole;
      limit?: number;
    }
  ): Promise<User[]> {
    // Note: For production, use PostGIS extension for efficient geospatial queries
    // This is a simple implementation using Haversine formula in SQL

    const query = `
      SELECT *,
        (
          6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(latitude))
          )
        ) AS distance
      FROM "users"
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        ${options?.role ? `AND role = '${options.role}'` : ''}
      HAVING distance <= ${radiusKm}
      ORDER BY distance
      LIMIT ${options?.limit || 50}
    `;

    const users = await prisma.$queryRawUnsafe<User[]>(query);
    return users;
  }

  /**
   * Award badge to user
   */
  async awardBadge(
    id: string,
    badge: 'contributorBadge' | 'saverBadge' | 'donorBadge'
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { [badge]: true },
    });
  }

  /**
   * Get user with relations
   */
  async findByIdWithRelations(
    id: string,
    include?: Prisma.UserInclude
  ): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include,
    });
  }
}

export default UserRepository;
