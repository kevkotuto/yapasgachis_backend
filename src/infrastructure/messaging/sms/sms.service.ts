import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

// Import SMS providers based on configuration
// For now, we'll create an interface and mock implementation

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<boolean>;
}

/**
 * Twilio SMS Provider
 */
class TwilioProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // TODO: Implement actual Twilio integration
      // const twilio = require('twilio');
      // const client = twilio(config.sms.twilio.accountSid, config.sms.twilio.authToken);
      // await client.messages.create({
      //   body: message,
      //   from: config.sms.twilio.phoneNumber,
      //   to
      // });

      logger.info('[Twilio] SMS sent (mocked)', { to, messageLength: message.length });
      return true;
    } catch (error) {
      logger.error('[Twilio] Failed to send SMS', {
        to,
        error: (error as Error).message,
      });
      return false;
    }
  }
}

/**
 * Africa's Talking SMS Provider
 */
class AfricasTalkingProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // TODO: Implement actual Africa's Talking integration
      // const AfricasTalking = require('africastalking');
      // const africastalking = AfricasTalking({
      //   apiKey: config.sms.africasTalking.apiKey,
      //   username: config.sms.africasTalking.username
      // });
      // const sms = africastalking.SMS;
      // await sms.send({
      //   to: [to],
      //   message
      // });

      logger.info('[AfricasTalking] SMS sent (mocked)', {
        to,
        messageLength: message.length,
      });
      return true;
    } catch (error) {
      logger.error('[AfricasTalking] Failed to send SMS', {
        to,
        error: (error as Error).message,
      });
      return false;
    }
  }
}

/**
 * Mock SMS Provider (for development/testing)
 */
class MockSMSProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<boolean> {
    logger.info('[Mock SMS] Message sent', {
      to,
      message,
      timestamp: new Date().toISOString(),
    });

    // In development, log the OTP to console for easy testing
    if (config.app.env === 'development') {
      console.log('\n' + '='.repeat(60));
      console.log('📱 SMS (MOCK)');
      console.log('='.repeat(60));
      console.log(`To: ${to}`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(60) + '\n');
    }

    return true;
  }
}

/**
 * SMS Service
 */
export class SMSService {
  private static provider: SMSProvider;

  /**
   * Initialize SMS provider based on configuration
   */
  private static getProvider(): SMSProvider {
    if (this.provider) {
      return this.provider;
    }

    // Use mock provider in development/test
    if (config.app.env === 'development' || config.app.env === 'test') {
      this.provider = new MockSMSProvider();
      return this.provider;
    }

    // Use Africa's Talking for Africa (default)
    if (config.sms.africasTalking.apiKey) {
      this.provider = new AfricasTalkingProvider();
      return this.provider;
    }

    // Fallback to Twilio
    if (config.sms.twilio.accountSid) {
      this.provider = new TwilioProvider();
      return this.provider;
    }

    // Default to mock if no provider configured
    this.provider = new MockSMSProvider();
    return this.provider;
  }

  /**
   * Send SMS
   */
  static async sendSMS(to: string, message: string): Promise<boolean> {
    const provider = this.getProvider();
    return provider.sendSMS(to, message);
  }

  /**
   * Send OTP SMS
   */
  static async sendOTP(to: string, code: string, expiresInMinutes: number = 10): Promise<boolean> {
    const message = `Votre code YapaGachis est: ${code}. Valide pendant ${expiresInMinutes} minutes. Ne partagez ce code avec personne.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send welcome SMS
   */
  static async sendWelcomeSMS(to: string, firstName: string): Promise<boolean> {
    const message = `Bienvenue ${firstName} sur YapaGachis ! 🌍 Ensemble, luttons contre le gaspillage alimentaire.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send order confirmation SMS
   */
  static async sendOrderConfirmationSMS(
    to: string,
    orderNumber: string,
    total: number
  ): Promise<boolean> {
    const message = `Commande ${orderNumber} confirmée ! Montant: ${total} FCFA. Merci d'avoir choisi YapaGachis.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send password reset SMS
   */
  static async sendPasswordResetSMS(to: string, code: string): Promise<boolean> {
    const message = `Code de réinitialisation YapaGachis: ${code}. Valide pendant 10 minutes.`;
    return this.sendSMS(to, message);
  }
}

export default SMSService;
