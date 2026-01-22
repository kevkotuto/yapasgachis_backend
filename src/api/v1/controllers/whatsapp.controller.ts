import { Request, Response } from 'express';
import { WhatsAppService } from '@/infrastructure/messaging/whatsapp';
import { asyncHandler } from '@/middleware/error-handler.middleware';
import { APP_CONSTANTS } from '@/utils/constants';

/**
 * WhatsApp Controller
 * Manages WhatsApp instance configuration and QR code authentication
 */
export class WhatsAppController {
  /**
   * Get WhatsApp connection status
   * GET /api/v1/whatsapp/status
   */
  static getStatus = asyncHandler(async (req: Request, res: Response) => {
    const status = await WhatsAppService.getStatus();

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      data: status,
    });
  });

  /**
   * Initialize WhatsApp and get QR code for scanning
   * POST /api/v1/whatsapp/initialize
   */
  static initialize = asyncHandler(async (req: Request, res: Response) => {
    const result = await WhatsAppService.initialize();

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message:
        "Scannez le QR code avec votre WhatsApp pour connecter l'instance",
      data: {
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        pairingCode: result.pairingCode,
      },
    });
  });

  /**
   * Check if WhatsApp service is available
   * GET /api/v1/whatsapp/available
   */
  static checkAvailability = asyncHandler(
    async (req: Request, res: Response) => {
      const available = await WhatsAppService.isAvailable();

      res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
        success: true,
        data: {
          available,
          message: available
            ? 'WhatsApp est connecté et disponible'
            : "WhatsApp n'est pas connecté. Veuillez scanner le QR code.",
        },
      });
    }
  );

  /**
   * Disconnect WhatsApp instance
   * POST /api/v1/whatsapp/disconnect
   */
  static disconnect = asyncHandler(async (req: Request, res: Response) => {
    await WhatsAppService.disconnect();

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: 'WhatsApp déconnecté avec succès',
    });
  });

  /**
   * Restart WhatsApp instance
   * POST /api/v1/whatsapp/restart
   */
  static restart = asyncHandler(async (req: Request, res: Response) => {
    await WhatsAppService.restart();

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message: 'Instance WhatsApp redémarrée',
    });
  });

  /**
   * Check if a phone number is on WhatsApp
   * POST /api/v1/whatsapp/check-number
   */
  static checkNumber = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Le numéro de téléphone est requis',
      });
      return;
    }

    const isOnWhatsApp = await WhatsAppService.isOnWhatsApp(phoneNumber);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      data: {
        phoneNumber,
        isOnWhatsApp,
      },
    });
  });

  /**
   * Send test message (for admin testing)
   * POST /api/v1/whatsapp/test-message
   */
  static sendTestMessage = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      res.status(APP_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Le numéro de téléphone et le message sont requis',
      });
      return;
    }

    const success = await WhatsAppService.sendMessage(phoneNumber, message);

    res.status(APP_CONSTANTS.HTTP_STATUS.OK).json({
      success,
      message: success
        ? 'Message envoyé avec succès'
        : "Échec de l'envoi du message",
    });
  });
}

export default WhatsAppController;
