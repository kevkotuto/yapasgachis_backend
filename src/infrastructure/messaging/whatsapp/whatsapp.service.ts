import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { EvolutionAPIService } from './evolution-api.service';

/**
 * WhatsApp Service - High-level abstraction for WhatsApp messaging
 * Uses Evolution API as the underlying provider
 */
export class WhatsAppService {
  private static evolutionApi: EvolutionAPIService;

  /**
   * Get Evolution API instance
   */
  private static getProvider(): EvolutionAPIService {
    if (!this.evolutionApi) {
      this.evolutionApi = EvolutionAPIService.getInstance();
    }
    return this.evolutionApi;
  }

  /**
   * Check if WhatsApp is configured and connected
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return await provider.isConnected();
    } catch (error) {
      logger.warn('[WhatsApp Service] Not available', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Initialize WhatsApp instance and get QR code for scanning
   */
  static async initialize(): Promise<{
    qrCode: string;
    qrCodeBase64: string;
    pairingCode: string | null;
  }> {
    const provider = this.getProvider();

    // Create or fetch instance
    await provider.createInstance();

    // Get QR code
    const qrResponse = await provider.getQRCode();

    return {
      qrCode: qrResponse.code,
      qrCodeBase64: qrResponse.base64,
      pairingCode: qrResponse.pairingCode,
    };
  }

  /**
   * Get current connection status
   */
  static async getStatus(): Promise<{
    connected: boolean;
    state: string;
  }> {
    const provider = this.getProvider();

    try {
      const state = await provider.getConnectionState();
      return {
        connected: state.state === 'open',
        state: state.state,
      };
    } catch (error) {
      return {
        connected: false,
        state: 'disconnected',
      };
    }
  }

  /**
   * Send OTP via WhatsApp
   */
  static async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();

      // Check if connected
      const isConnected = await provider.isConnected();
      if (!isConnected) {
        logger.warn('[WhatsApp Service] Not connected, cannot send OTP');
        return false;
      }

      // Check if number is on WhatsApp (optional, for better UX)
      const isOnWhatsApp = await provider.isOnWhatsApp(to);
      if (!isOnWhatsApp) {
        logger.warn('[WhatsApp Service] Number not on WhatsApp', {
          to: to.slice(-4),
        });
        return false;
      }

      return await provider.sendOTP(to, code, expiresInMinutes);
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to send OTP', {
        to: to.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send text message
   */
  static async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const provider = this.getProvider();
      await provider.sendTextMessage(to, message);
      return true;
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to send message', {
        to: to.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send welcome message
   */
  static async sendWelcome(to: string, firstName: string): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return await provider.sendWelcomeMessage(to, firstName);
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to send welcome', {
        to: to.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send order confirmation
   */
  static async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    total: number,
    storeName: string
  ): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return await provider.sendOrderConfirmation(
        to,
        orderNumber,
        total,
        storeName
      );
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to send order confirmation', {
        orderNumber,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send password reset code
   */
  static async sendPasswordReset(to: string, code: string): Promise<boolean> {
    const message = `*YapaGachis - Réinitialisation du mot de passe*\n\nVotre code de réinitialisation est: *${code}*\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce message.`;

    return this.sendMessage(to, message);
  }

  /**
   * Check if phone number is on WhatsApp
   */
  static async isOnWhatsApp(phone: string): Promise<boolean> {
    try {
      const provider = this.getProvider();
      return await provider.isOnWhatsApp(phone);
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to check WhatsApp status', {
        phone: phone.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Disconnect WhatsApp instance
   */
  static async disconnect(): Promise<void> {
    try {
      const provider = this.getProvider();
      await provider.logout();
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to disconnect', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Restart WhatsApp instance
   */
  static async restart(): Promise<void> {
    try {
      const provider = this.getProvider();
      await provider.restart();
    } catch (error) {
      logger.error('[WhatsApp Service] Failed to restart', {
        error: (error as Error).message,
      });
    }
  }
}

export default WhatsAppService;
