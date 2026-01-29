import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import {
  ContactCheckResult,
  UserPaymentMethodDTO,
} from '../interfaces/dtos/user.dto';

import {
  UpdateProfileInput,
  UpdateAvatarInput,
  CheckContactsInput,
  AddPaymentMethodInput,
  UpdatePaymentMethodInput,
} from '@/api/v1/validators/user.validator';

import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    try {
      // Check if email is being changed and if it already exists
      if (data.email) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            email: data.email,
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new AppError(
            409,
            'Cet email est déjà utilisé',
            'EMAIL_ALREADY_EXISTS'
          );
        }
      }

      // Check if phone number is being changed and if it already exists
      if (data.phoneNumber) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            phoneNumber: data.phoneNumber,
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new AppError(
            409,
            'Ce numéro de téléphone est déjà utilisé',
            'PHONE_ALREADY_EXISTS'
          );
        }
      }

      // Build update data
      const updateData: any = { ...data };

      // If email is changed, mark as unverified
      if (data.email) {
        updateData.emailVerified = false;
      }

      // If phone is changed, mark as unverified
      if (data.phoneNumber) {
        updateData.phoneVerified = false;
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          avatar: true,
          city: true,
          commune: true,
          neighborhood: true,
          latitude: true,
          longitude: true,
          language: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('User profile updated', { userId });

      return user;
    } catch (error) {
      logger.error('Error updating user profile', {
        error: (error as Error).message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, data: UpdateAvatarInput) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: data.avatar },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      logger.info('User avatar updated', { userId });

      return user;
    } catch (error) {
      logger.error('Error updating user avatar', {
        error: (error as Error).message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check which contacts are on the platform (bulk)
   */
  async checkContacts(data: CheckContactsInput): Promise<ContactCheckResult[]> {
    try {
      const { phoneNumbers } = data;

      // Find all users with matching phone numbers
      const users = await this.prisma.user.findMany({
        where: {
          phoneNumber: {
            in: phoneNumbers,
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      // Create a map of found users
      const userMap = new Map(users.map((user) => [user.phoneNumber, user]));

      // Build result array
      const results: ContactCheckResult[] = phoneNumbers.map((phoneNumber) => {
        const user = userMap.get(phoneNumber);
        if (user) {
          return {
            phoneNumber,
            isOnPlatform: true,
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName || undefined,
            avatar: user.avatar || undefined,
          };
        } else {
          return {
            phoneNumber,
            isOnPlatform: false,
          };
        }
      });

      logger.info('Bulk contact check completed', {
        totalContacts: phoneNumbers.length,
        foundOnPlatform: users.length,
      });

      return results;
    } catch (error) {
      logger.error('Error checking contacts', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(userId: string): Promise<UserPaymentMethodDTO[]> {
    try {
      const methods = await this.prisma.userPaymentMethod.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      logger.info('Payment methods retrieved', {
        userId,
        count: methods.length,
      });

      return methods;
    } catch (error) {
      logger.error('Error getting payment methods', {
        error: (error as Error).message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(userId: string, data: AddPaymentMethodInput) {
    try {
      // If this is set as default, unset all other defaults first
      if (data.isDefault) {
        await this.prisma.userPaymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const method = await this.prisma.userPaymentMethod.create({
        data: {
          userId,
          provider: data.provider,
          phoneNumber: data.phoneNumber,
          accountName: data.accountName,
          isDefault: data.isDefault || false,
        },
      });

      logger.info('Payment method added', {
        userId,
        methodId: method.id,
        provider: data.provider,
      });

      return method;
    } catch (error) {
      logger.error('Error adding payment method', {
        error: (error as Error).message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    userId: string,
    methodId: string,
    data: UpdatePaymentMethodInput['body']
  ) {
    try {
      // Check if method belongs to user
      const existingMethod = await this.prisma.userPaymentMethod.findFirst({
        where: { id: methodId, userId },
      });

      if (!existingMethod) {
        throw new AppError(
          404,
          'Méthode de paiement non trouvée',
          'PAYMENT_METHOD_NOT_FOUND'
        );
      }

      // If setting as default, unset all other defaults first
      if (data.isDefault) {
        await this.prisma.userPaymentMethod.updateMany({
          where: { userId, isDefault: true, id: { not: methodId } },
          data: { isDefault: false },
        });
      }

      const method = await this.prisma.userPaymentMethod.update({
        where: { id: methodId },
        data,
      });

      logger.info('Payment method updated', { userId, methodId });

      return method;
    } catch (error) {
      logger.error('Error updating payment method', {
        error: (error as Error).message,
        userId,
        methodId,
      });
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(userId: string, methodId: string) {
    try {
      // Check if method belongs to user
      const existingMethod = await this.prisma.userPaymentMethod.findFirst({
        where: { id: methodId, userId },
      });

      if (!existingMethod) {
        throw new AppError(
          404,
          'Méthode de paiement non trouvée',
          'PAYMENT_METHOD_NOT_FOUND'
        );
      }

      // Soft delete by setting isActive to false
      await this.prisma.userPaymentMethod.update({
        where: { id: methodId },
        data: { isActive: false, isDefault: false },
      });

      logger.info('Payment method deleted', { userId, methodId });

      return { success: true, message: 'Méthode de paiement supprimée' };
    } catch (error) {
      logger.error('Error deleting payment method', {
        error: (error as Error).message,
        userId,
        methodId,
      });
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, methodId: string) {
    try {
      // Check if method belongs to user
      const existingMethod = await this.prisma.userPaymentMethod.findFirst({
        where: { id: methodId, userId, isActive: true },
      });

      if (!existingMethod) {
        throw new AppError(
          404,
          'Méthode de paiement non trouvée',
          'PAYMENT_METHOD_NOT_FOUND'
        );
      }

      // Unset all other defaults
      await this.prisma.userPaymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      // Set this one as default
      const method = await this.prisma.userPaymentMethod.update({
        where: { id: methodId },
        data: { isDefault: true },
      });

      logger.info('Default payment method set', { userId, methodId });

      return method;
    } catch (error) {
      logger.error('Error setting default payment method', {
        error: (error as Error).message,
        userId,
        methodId,
      });
      throw error;
    }
  }

  /**
   * Get user's referral code
   */
  async getReferralCode(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new AppError(404, 'Utilisateur non trouvé', 'USER_NOT_FOUND');
      }

      // Generate a simple referral code based on user ID
      // You can customize this logic
      const referralCode = `YPG${user.id.substring(0, 8).toUpperCase()}`;

      logger.info('Referral code retrieved', { userId });

      return {
        code: referralCode,
        shareUrl: `https://yapasgachis.com/invite/${referralCode}`,
        shareMessage: `Rejoins-moi sur YapaGachis et obtiens des réductions sur tes achats ! Utilise mon code: ${referralCode}`,
      };
    } catch (error) {
      logger.error('Error getting referral code', {
        error: (error as Error).message,
        userId,
      });
      throw error;
    }
  }
}

export default UserService;
