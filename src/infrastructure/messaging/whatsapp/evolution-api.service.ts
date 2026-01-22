import axios, { AxiosInstance } from 'axios';
import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Evolution API Service for WhatsApp Integration
 * Documentation: https://doc.evolution-api.com
 *
 * Anti-ban best practices implemented:
 * - Random delays between messages
 * - Typing simulation
 * - Rate limiting
 * - Human-like behavior patterns
 */

interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

interface QRCodeResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

interface ConnectionState {
  instance: string;
  state: 'open' | 'close' | 'connecting';
}

interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: string;
  status: string;
}

interface InstanceInfo {
  instanceName: string;
  instanceId: string;
  status: string;
  serverUrl: string;
  apikey: string;
  owner: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export class EvolutionAPIService {
  private client: AxiosInstance;
  private config: EvolutionConfig;
  private static instance: EvolutionAPIService;

  // Anti-ban: Rate limiting
  private lastMessageTime: number = 0;
  private static readonly MIN_MESSAGE_INTERVAL = 3000; // 3 seconds minimum between messages
  private static readonly MAX_RANDOM_DELAY = 2000; // Additional random delay up to 2 seconds

  private constructor() {
    this.config = {
      baseUrl:
        config.whatsapp?.evolutionApi?.baseUrl ||
        process.env.EVOLUTION_API_URL ||
        'http://localhost:8080',
      apiKey:
        config.whatsapp?.evolutionApi?.apiKey ||
        process.env.EVOLUTION_API_KEY ||
        '',
      instanceName:
        config.whatsapp?.evolutionApi?.instanceName ||
        process.env.EVOLUTION_INSTANCE_NAME ||
        'yapasgachis',
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.config.apiKey,
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        logger.debug('[Evolution API] Request', {
          method: request.method,
          url: request.url,
        });
        return request;
      },
      (error) => {
        logger.error('[Evolution API] Request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('[Evolution API] Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('[Evolution API] Response error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): EvolutionAPIService {
    if (!EvolutionAPIService.instance) {
      EvolutionAPIService.instance = new EvolutionAPIService();
    }
    return EvolutionAPIService.instance;
  }

  /**
   * Anti-ban: Add random delay between messages
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    if (timeSinceLastMessage < EvolutionAPIService.MIN_MESSAGE_INTERVAL) {
      const waitTime =
        EvolutionAPIService.MIN_MESSAGE_INTERVAL - timeSinceLastMessage;
      await this.sleep(waitTime);
    }

    // Add random delay for human-like behavior
    const randomDelay = Math.floor(
      Math.random() * EvolutionAPIService.MAX_RANDOM_DELAY
    );
    await this.sleep(randomDelay);

    this.lastMessageTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format phone number to WhatsApp format
   * Supports pan-African numbers
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, it's a local number - need country code
    // For now, assume Ivory Coast (+225) as default
    if (cleaned.startsWith('0')) {
      cleaned = '225' + cleaned.substring(1);
    }

    // If doesn't start with country code, add default
    if (cleaned.length <= 10) {
      cleaned = '225' + cleaned;
    }

    // WhatsApp format: country code + number (no + sign, ends with @s.whatsapp.net)
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Create a new WhatsApp instance
   */
  async createInstance(instanceName?: string): Promise<InstanceInfo> {
    const name = instanceName || this.config.instanceName;

    try {
      const response = await this.client.post('/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });

      logger.info('[Evolution API] Instance created', { instanceName: name });
      return response.data;
    } catch (error: any) {
      // If instance already exists, fetch it
      if (
        error.response?.status === 403 ||
        error.response?.data?.message?.includes('already')
      ) {
        logger.info('[Evolution API] Instance already exists, fetching...', {
          instanceName: name,
        });
        return this.fetchInstance(name);
      }
      throw error;
    }
  }

  /**
   * Fetch existing instance
   */
  async fetchInstance(instanceName?: string): Promise<InstanceInfo> {
    const name = instanceName || this.config.instanceName;
    const response = await this.client.get(`/instance/fetchInstances`, {
      params: { instanceName: name },
    });
    return response.data?.[0] || response.data;
  }

  /**
   * Get QR Code for WhatsApp connection
   * Returns base64 encoded QR code image
   */
  async getQRCode(instanceName?: string): Promise<QRCodeResponse> {
    const name = instanceName || this.config.instanceName;

    try {
      const response = await this.client.get(`/instance/connect/${name}`);
      logger.info('[Evolution API] QR Code generated', { instanceName: name });
      return response.data;
    } catch (error: any) {
      logger.error('[Evolution API] Failed to get QR Code', {
        instanceName: name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check connection state
   */
  async getConnectionState(instanceName?: string): Promise<ConnectionState> {
    const name = instanceName || this.config.instanceName;
    const response = await this.client.get(`/instance/connectionState/${name}`);
    return response.data;
  }

  /**
   * Check if instance is connected
   */
  async isConnected(instanceName?: string): Promise<boolean> {
    try {
      const state = await this.getConnectionState(instanceName);
      return state.state === 'open';
    } catch {
      return false;
    }
  }

  /**
   * Send text message via WhatsApp
   * Implements anti-ban measures
   */
  async sendTextMessage(
    to: string,
    message: string,
    instanceName?: string
  ): Promise<SendMessageResponse> {
    const name = instanceName || this.config.instanceName;
    const formattedNumber = this.formatPhoneNumber(to);

    // Anti-ban: Enforce rate limiting
    await this.enforceRateLimit();

    try {
      // Anti-ban: Simulate typing before sending (optional, improves authenticity)
      await this.simulateTyping(
        formattedNumber.replace('@s.whatsapp.net', ''),
        name
      );

      const response = await this.client.post(`/message/sendText/${name}`, {
        number: formattedNumber.replace('@s.whatsapp.net', ''),
        text: message,
        delay: 1000, // Evolution API built-in delay
      });

      logger.info('[Evolution API] Message sent', {
        to: to.slice(-4), // Log only last 4 digits for privacy
        instanceName: name,
      });

      return response.data;
    } catch (error: any) {
      logger.error('[Evolution API] Failed to send message', {
        to: to.slice(-4),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Anti-ban: Simulate typing indicator
   */
  private async simulateTyping(
    to: string,
    instanceName: string
  ): Promise<void> {
    try {
      await this.client.post(`/chat/presence/${instanceName}`, {
        number: to,
        presence: 'composing',
      });
      // Wait a bit to simulate actual typing
      await this.sleep(1500 + Math.random() * 1000);
      await this.client.post(`/chat/presence/${instanceName}`, {
        number: to,
        presence: 'paused',
      });
    } catch (error) {
      // Non-critical, just log and continue
      logger.debug('[Evolution API] Typing simulation failed', { error });
    }
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 10,
    instanceName?: string
  ): Promise<boolean> {
    const message = `*YapaGachis - Code de vérification*\n\nVotre code est: *${code}*\n\nCe code expire dans ${expiresInMinutes} minutes.\n\n_Ne partagez jamais ce code avec personne._`;

    try {
      await this.sendTextMessage(to, message, instanceName);
      return true;
    } catch (error) {
      logger.error('[Evolution API] Failed to send OTP via WhatsApp', {
        to: to.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send welcome message via WhatsApp
   */
  async sendWelcomeMessage(
    to: string,
    firstName: string,
    instanceName?: string
  ): Promise<boolean> {
    const message = `Bienvenue *${firstName}* sur YapaGachis !\n\nEnsemble, luttons contre le gaspillage alimentaire en Afrique.\n\nTéléchargez notre application et commencez à économiser dès maintenant !`;

    try {
      await this.sendTextMessage(to, message, instanceName);
      return true;
    } catch (error) {
      logger.error('[Evolution API] Failed to send welcome message', {
        to: to.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    total: number,
    storeName: string,
    instanceName?: string
  ): Promise<boolean> {
    const message = `*YapaGachis - Confirmation de commande*\n\nCommande: *#${orderNumber}*\nMagasin: ${storeName}\nMontant: *${total} FCFA*\n\nMerci d'avoir choisi YapaGachis !`;

    try {
      await this.sendTextMessage(to, message, instanceName);
      return true;
    } catch (error) {
      logger.error('[Evolution API] Failed to send order confirmation', {
        orderNumber,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Disconnect and logout from WhatsApp
   */
  async logout(instanceName?: string): Promise<void> {
    const name = instanceName || this.config.instanceName;
    await this.client.delete(`/instance/logout/${name}`);
    logger.info('[Evolution API] Instance logged out', { instanceName: name });
  }

  /**
   * Restart instance
   */
  async restart(instanceName?: string): Promise<void> {
    const name = instanceName || this.config.instanceName;
    await this.client.put(`/instance/restart/${name}`);
    logger.info('[Evolution API] Instance restarted', { instanceName: name });
  }

  /**
   * Delete instance
   */
  async deleteInstance(instanceName?: string): Promise<void> {
    const name = instanceName || this.config.instanceName;
    await this.client.delete(`/instance/delete/${name}`);
    logger.info('[Evolution API] Instance deleted', { instanceName: name });
  }

  /**
   * Check if a phone number is registered on WhatsApp
   */
  async isOnWhatsApp(phone: string, instanceName?: string): Promise<boolean> {
    const name = instanceName || this.config.instanceName;
    const cleaned = phone.replace(/\D/g, '');

    try {
      const response = await this.client.post(`/chat/whatsappNumbers/${name}`, {
        numbers: [cleaned],
      });

      const result = response.data?.[0];
      return result?.exists === true;
    } catch (error) {
      logger.error('[Evolution API] Failed to check WhatsApp number', {
        phone: phone.slice(-4),
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export default EvolutionAPIService;
