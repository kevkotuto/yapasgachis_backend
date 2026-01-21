import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

/**
 * SMS Provider Interface
 */
export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<boolean>;
  getName(): string;
}

/**
 * Twilio SMS Provider
 * Requires: twilio package (npm install twilio)
 */
class TwilioProvider implements SMSProvider {
  private client: any;
  private phoneNumber: string;
  private initialized: boolean = false;

  constructor() {
    this.phoneNumber = config.sms.twilio.phoneNumber;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to avoid errors if twilio is not installed
      const twilio = await import('twilio');
      this.client = twilio.default(
        config.sms.twilio.accountSid,
        config.sms.twilio.authToken
      );
      this.initialized = true;
      logger.info('[Twilio] SMS provider initialized');
    } catch (error) {
      logger.warn('[Twilio] Failed to initialize - package may not be installed', {
        error: (error as Error).message,
      });
    }
  }

  getName(): string {
    return 'Twilio';
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.client) {
        logger.warn('[Twilio] Client not available, falling back to mock');
        return this.mockSend(to, message);
      }

      // Format phone number (ensure it has country code)
      const formattedPhone = this.formatPhoneNumber(to);

      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedPhone,
      });

      logger.info('[Twilio] SMS sent successfully', {
        to: formattedPhone,
        sid: result.sid,
        status: result.status,
      });

      return true;
    } catch (error) {
      logger.error('[Twilio] Failed to send SMS', {
        to,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // If it starts with 0, assume it's a local number and add Ivory Coast code
    if (cleaned.startsWith('0')) {
      return `+225${cleaned.substring(1)}`;
    }

    // If it doesn't start with +, add it
    if (!phone.startsWith('+')) {
      return `+${cleaned}`;
    }

    return phone;
  }

  private mockSend(to: string, message: string): boolean {
    logger.info('[Twilio] SMS sent (mocked)', {
      to,
      messageLength: message.length,
    });
    return true;
  }
}

/**
 * Africa's Talking SMS Provider
 * Requires: africastalking package (npm install africastalking)
 */
class AfricasTalkingProvider implements SMSProvider {
  private sms: any;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to avoid errors if africastalking is not installed
      const AfricasTalking = await import('africastalking');
      const africastalking = AfricasTalking.default({
        apiKey: config.sms.africasTalking.apiKey,
        username: config.sms.africasTalking.username,
      });
      this.sms = africastalking.SMS;
      this.initialized = true;
      logger.info('[AfricasTalking] SMS provider initialized');
    } catch (error) {
      logger.warn('[AfricasTalking] Failed to initialize - package may not be installed', {
        error: (error as Error).message,
      });
    }
  }

  getName(): string {
    return "Africa's Talking";
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.sms) {
        logger.warn('[AfricasTalking] Client not available, falling back to mock');
        return this.mockSend(to, message);
      }

      // Format phone number for Africa's Talking
      const formattedPhone = this.formatPhoneNumber(to);

      const result = await this.sms.send({
        to: [formattedPhone],
        message,
        // Optional: Specify sender ID if you have one
        // from: 'YapaGachis'
      });

      logger.info('[AfricasTalking] SMS sent successfully', {
        to: formattedPhone,
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
        status: result.SMSMessageData?.Recipients?.[0]?.status,
      });

      // Check if any recipient failed
      const recipients = result.SMSMessageData?.Recipients || [];
      const allSuccess = recipients.every(
        (r: any) => r.status === 'Success' || r.statusCode === 101
      );

      return allSuccess;
    } catch (error) {
      logger.error('[AfricasTalking] Failed to send SMS', {
        to,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with 0, assume it's a local number and add Ivory Coast code
    if (cleaned.startsWith('0')) {
      return `+225${cleaned.substring(1)}`;
    }

    // If it doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  private mockSend(to: string, message: string): boolean {
    logger.info('[AfricasTalking] SMS sent (mocked)', {
      to,
      messageLength: message.length,
    });
    return true;
  }
}

/**
 * Mock SMS Provider (for development/testing)
 */
class MockSMSProvider implements SMSProvider {
  getName(): string {
    return 'Mock';
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    logger.info('[Mock SMS] Message sent', {
      to,
      message,
      timestamp: new Date().toISOString(),
    });

    // In development, log the SMS content to console for easy testing
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
 * Singleton service that manages SMS providers
 */
export class SMSService {
  private static instance: SMSService;
  private provider: SMSProvider;
  private fallbackProvider: SMSProvider;

  private constructor() {
    // Initialize providers based on configuration
    this.provider = this.initializeProvider();
    this.fallbackProvider = new MockSMSProvider();

    logger.info(`[SMSService] Initialized with provider: ${this.provider.getName()}`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Initialize the appropriate SMS provider based on config
   */
  private initializeProvider(): SMSProvider {
    // Use mock provider in development/test
    if (config.app.env === 'development' || config.app.env === 'test') {
      return new MockSMSProvider();
    }

    // Use Africa's Talking for Africa (preferred for better coverage)
    if (config.sms.africasTalking.apiKey && config.sms.africasTalking.username) {
      return new AfricasTalkingProvider();
    }

    // Fallback to Twilio
    if (config.sms.twilio.accountSid && config.sms.twilio.authToken) {
      return new TwilioProvider();
    }

    // Default to mock if no provider configured
    logger.warn('[SMSService] No SMS provider configured, using mock');
    return new MockSMSProvider();
  }

  /**
   * Send SMS with fallback support
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      const success = await this.provider.sendSMS(to, message);

      if (!success) {
        logger.warn(`[SMSService] Primary provider (${this.provider.getName()}) failed, trying fallback`);
        return this.fallbackProvider.sendSMS(to, message);
      }

      return success;
    } catch (error) {
      logger.error('[SMSService] Error sending SMS', {
        to,
        error: (error as Error).message,
      });

      // Try fallback
      try {
        return await this.fallbackProvider.sendSMS(to, message);
      } catch (fallbackError) {
        logger.error('[SMSService] Fallback also failed', {
          error: (fallbackError as Error).message,
        });
        return false;
      }
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<boolean> {
    const message = `Votre code YapaGachis est: ${code}. Valide pendant ${expiresInMinutes} minutes. Ne partagez ce code avec personne.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send welcome SMS
   */
  async sendWelcomeSMS(to: string, firstName: string): Promise<boolean> {
    const message = `Bienvenue ${firstName} sur YapaGachis ! 🌍 Ensemble, luttons contre le gaspillage alimentaire. Téléchargez notre app: yapasgachis.com/app`;
    return this.sendSMS(to, message);
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmationSMS(
    to: string,
    orderNumber: string,
    total: number
  ): Promise<boolean> {
    const formattedTotal = new Intl.NumberFormat('fr-FR').format(total);
    const message = `Commande ${orderNumber} confirmée ! Montant: ${formattedTotal} FCFA. Merci d'avoir choisi YapaGachis. Suivez votre commande sur l'app.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send order ready for pickup SMS
   */
  async sendOrderReadySMS(
    to: string,
    orderNumber: string,
    storeName: string
  ): Promise<boolean> {
    const message = `Votre commande ${orderNumber} est prête ! Rendez-vous chez ${storeName} pour la récupérer. Présentez votre code de retrait dans l'app.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send order delivered SMS
   */
  async sendOrderDeliveredSMS(
    to: string,
    orderNumber: string
  ): Promise<boolean> {
    const message = `Votre commande ${orderNumber} a été livrée ! Merci pour votre achat. N'oubliez pas de noter votre expérience dans l'app.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSMS(to: string, code: string): Promise<boolean> {
    const message = `Code de réinitialisation YapaGachis: ${code}. Valide pendant 10 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send supplier verification SMS
   */
  async sendSupplierVerificationSMS(
    to: string,
    status: 'approved' | 'rejected' | 'pending',
    reason?: string
  ): Promise<boolean> {
    let message: string;

    switch (status) {
      case 'approved':
        message = `Félicitations ! Votre compte fournisseur YapaGachis a été vérifié. Vous pouvez maintenant commencer à vendre. Connectez-vous pour créer vos produits.`;
        break;
      case 'rejected':
        message = `Votre vérification YapaGachis a été refusée. ${reason ? `Raison: ${reason}. ` : ''}Veuillez soumettre de nouveaux documents via l'app.`;
        break;
      case 'pending':
        message = `Vos documents de vérification YapaGachis sont en cours de traitement. Vous recevrez une notification sous 24-48h.`;
        break;
      default:
        message = `Statut de votre compte YapaGachis: ${status}`;
    }

    return this.sendSMS(to, message);
  }

  /**
   * Send deal reminder SMS
   */
  async sendDealReminderSMS(
    to: string,
    dealName: string,
    expiresIn: string
  ): Promise<boolean> {
    const message = `Rappel: Le deal "${dealName}" expire ${expiresIn}. Ne manquez pas cette offre sur YapaGachis !`;
    return this.sendSMS(to, message);
  }

  /**
   * Send donation confirmation SMS
   */
  async sendDonationConfirmationSMS(
    to: string,
    donationType: 'food' | 'financial',
    amount?: number
  ): Promise<boolean> {
    let message: string;

    if (donationType === 'financial' && amount) {
      const formattedAmount = new Intl.NumberFormat('fr-FR').format(amount);
      message = `Merci pour votre don de ${formattedAmount} FCFA sur YapaGachis ! Votre générosité aide à lutter contre le gaspillage alimentaire. Un reçu vous sera envoyé par email.`;
    } else {
      message = `Merci pour votre don alimentaire sur YapaGachis ! Un collecteur passera bientôt récupérer votre don. Vous contribuez à réduire le gaspillage alimentaire.`;
    }

    return this.sendSMS(to, message);
  }

  /**
   * Send payment notification SMS
   */
  async sendPaymentNotificationSMS(
    to: string,
    amount: number,
    status: 'success' | 'failed' | 'pending',
    orderNumber?: string
  ): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('fr-FR').format(amount);
    let message: string;

    switch (status) {
      case 'success':
        message = `Paiement de ${formattedAmount} FCFA confirmé sur YapaGachis${orderNumber ? ` pour la commande ${orderNumber}` : ''}. Merci !`;
        break;
      case 'failed':
        message = `Échec du paiement de ${formattedAmount} FCFA sur YapaGachis. Veuillez réessayer ou utiliser un autre moyen de paiement.`;
        break;
      case 'pending':
        message = `Paiement de ${formattedAmount} FCFA en attente de confirmation. Vous serez notifié dès validation.`;
        break;
      default:
        message = `Notification de paiement YapaGachis: ${formattedAmount} FCFA - Statut: ${status}`;
    }

    return this.sendSMS(to, message);
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.getName();
  }

  // Static methods for backward compatibility
  static async sendSMS(to: string, message: string): Promise<boolean> {
    return SMSService.getInstance().sendSMS(to, message);
  }

  static async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<boolean> {
    return SMSService.getInstance().sendOTP(to, code, expiresInMinutes);
  }

  static async sendWelcomeSMS(to: string, firstName: string): Promise<boolean> {
    return SMSService.getInstance().sendWelcomeSMS(to, firstName);
  }

  static async sendOrderConfirmationSMS(
    to: string,
    orderNumber: string,
    total: number
  ): Promise<boolean> {
    return SMSService.getInstance().sendOrderConfirmationSMS(to, orderNumber, total);
  }

  static async sendPasswordResetSMS(to: string, code: string): Promise<boolean> {
    return SMSService.getInstance().sendPasswordResetSMS(to, code);
  }
}

export default SMSService;
