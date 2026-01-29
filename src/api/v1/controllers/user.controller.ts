import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import UserService from '@/core/services/user.service';
import {
  UpdateProfileInput,
  UpdateAvatarInput,
  CheckContactsInput,
  AddPaymentMethodInput,
  UpdatePaymentMethodInput,
  DeletePaymentMethodInput,
  SetDefaultPaymentMethodInput,
} from '@/api/v1/validators/user.validator';
import { asyncHandler } from '@/utils/helpers';

const prisma = new PrismaClient();
const userService = new UserService(prisma);

/**
 * User Controller
 * Handles user profile and payment method management
 */
class UserController {
  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  updateProfile = asyncHandler(
    async (req: Request<{}, {}, UpdateProfileInput>, res: Response) => {
      const userId = (req as any).user.id;

      const user = await userService.updateProfile(userId, req.body);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: user,
      });
    }
  );

  /**
   * Update user avatar
   * PUT /api/v1/users/avatar
   */
  updateAvatar = asyncHandler(
    async (req: Request<{}, {}, UpdateAvatarInput>, res: Response) => {
      const userId = (req as any).user.id;

      const user = await userService.updateAvatar(userId, req.body);

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès',
        data: user,
      });
    }
  );

  /**
   * Check which contacts are on the platform (bulk)
   * POST /api/v1/users/contacts/check
   */
  checkContacts = asyncHandler(
    async (req: Request<{}, {}, CheckContactsInput>, res: Response) => {
      const results = await userService.checkContacts(req.body);

      const onPlatformCount = results.filter((r) => r.isOnPlatform).length;

      res.json({
        success: true,
        data: {
          contacts: results,
          summary: {
            total: results.length,
            onPlatform: onPlatformCount,
            notOnPlatform: results.length - onPlatformCount,
          },
        },
      });
    }
  );

  /**
   * Get user's payment methods
   * GET /api/v1/users/payment-methods
   */
  getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const methods = await userService.getPaymentMethods(userId);

    res.json({
      success: true,
      data: {
        paymentMethods: methods,
        total: methods.length,
      },
    });
  });

  /**
   * Add payment method
   * POST /api/v1/users/payment-methods
   */
  addPaymentMethod = asyncHandler(
    async (req: Request<{}, {}, AddPaymentMethodInput>, res: Response) => {
      const userId = (req as any).user.id;

      const method = await userService.addPaymentMethod(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Méthode de paiement ajoutée avec succès',
        data: method,
      });
    }
  );

  /**
   * Update payment method
   * PUT /api/v1/users/payment-methods/:methodId
   */
  updatePaymentMethod = asyncHandler(
    async (
      req: Request<
        UpdatePaymentMethodInput['params'],
        {},
        UpdatePaymentMethodInput['body']
      >,
      res: Response
    ) => {
      const userId = (req as any).user.id;
      const { methodId } = req.params;

      const method = await userService.updatePaymentMethod(
        userId,
        methodId,
        req.body
      );

      res.json({
        success: true,
        message: 'Méthode de paiement mise à jour',
        data: method,
      });
    }
  );

  /**
   * Delete payment method
   * DELETE /api/v1/users/payment-methods/:methodId
   */
  deletePaymentMethod = asyncHandler(
    async (req: Request<DeletePaymentMethodInput>, res: Response) => {
      const userId = (req as any).user.id;
      const { methodId } = req.params;

      const result = await userService.deletePaymentMethod(userId, methodId);

      res.json({
        success: true,
        message: result.message,
      });
    }
  );

  /**
   * Set default payment method
   * POST /api/v1/users/payment-methods/:methodId/default
   */
  setDefaultPaymentMethod = asyncHandler(
    async (req: Request<SetDefaultPaymentMethodInput>, res: Response) => {
      const userId = (req as any).user.id;
      const { methodId } = req.params;

      const method = await userService.setDefaultPaymentMethod(
        userId,
        methodId
      );

      res.json({
        success: true,
        message: 'Méthode de paiement par défaut définie',
        data: method,
      });
    }
  );

  /**
   * Get user's referral code
   * GET /api/v1/users/referral-code
   */
  getReferralCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const referralData = await userService.getReferralCode(userId);

    res.json({
      success: true,
      data: referralData,
    });
  });
}

export default new UserController();
