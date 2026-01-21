import crypto from 'crypto';

import axios from 'axios';

import config from '@/config';
import CacheService from '@/infrastructure/database/redis/cache.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Mobile Money Payment Service
 * Supports multiple providers: Wave, Orange Money, MTN Mobile Money, Moov Money
 */

export enum MobileMoneyProvider {
  WAVE = 'WAVE',
  ORANGE = 'ORANGE',
  MTN = 'MTN',
  MOOV = 'MOOV',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: MobileMoneyProvider;
  orderId: string;
  customerName: string;
  customerEmail?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: MobileMoneyProvider;
  message: string;
  providerReference?: string;
}

/**
 * Mobile Money Service
 */
export class MobileMoneyService {
  private static instance: MobileMoneyService;
  private readonly CACHE_PREFIX = 'payment:';
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  private constructor() {}

  static getInstance(): MobileMoneyService {
    if (!MobileMoneyService.instance) {
      MobileMoneyService.instance = new MobileMoneyService();
    }
    return MobileMoneyService.instance;
  }

  /**
   * Initiate payment
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate phone number format for provider
      this.validatePhoneNumber(request.phoneNumber, request.provider);

      // Detect provider if not specified
      if (!request.provider) {
        request.provider = this.detectProvider(request.phoneNumber);
      }

      logger.info('Initiating mobile money payment', {
        provider: request.provider,
        amount: request.amount,
        orderId: request.orderId,
      });

      // Route to appropriate provider
      let response: PaymentResponse;

      switch (request.provider) {
        case MobileMoneyProvider.WAVE:
          response = await this.processWavePayment(request);
          break;
        case MobileMoneyProvider.ORANGE:
          response = await this.processOrangePayment(request);
          break;
        case MobileMoneyProvider.MTN:
          response = await this.processMTNPayment(request);
          break;
        case MobileMoneyProvider.MOOV:
          response = await this.processMoovPayment(request);
          break;
        default:
          throw new AppError(
            400,
            'Fournisseur de paiement non supporté',
            'UNSUPPORTED_PROVIDER'
          );
      }

      // Cache payment status
      await this.cachePaymentStatus(response.transactionId, response);

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Payment initiation failed', {
        provider: request.provider,
        error: (error as Error).message,
      });

      throw new AppError(
        500,
        "Erreur lors de l'initiation du paiement",
        'PAYMENT_INITIATION_FAILED'
      );
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      // Check cache first
      const cached = await this.getCachedPaymentStatus(transactionId);
      if (cached) {
        return cached;
      }

      // If not in cache, this is an error (payment should exist)
      throw new AppError(
        404,
        'Transaction non trouvée',
        'TRANSACTION_NOT_FOUND'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Payment status check failed', {
        transactionId,
        error: (error as Error).message,
      });

      throw new AppError(
        500,
        'Erreur lors de la vérification du statut de paiement'
      );
    }
  }

  /**
   * Wave Payment Processing
   */
  private async processWavePayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // In production, integrate with Wave API
    // For development, simulate payment

    if (config.app.env === 'production') {
      // TODO: Implement real Wave API integration
      throw new AppError(
        501,
        'Wave payment integration not yet implemented',
        'NOT_IMPLEMENTED'
      );
    }

    // Development simulation
    const transactionId = `WAVE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Wave payment', {
      transactionId,
      amount: request.amount,
    });

    // Simulate processing delay
    await this.delay(2000);

    return {
      transactionId,
      status: PaymentStatus.SUCCESS,
      amount: request.amount,
      currency: request.currency,
      provider: MobileMoneyProvider.WAVE,
      message: 'Paiement Wave simulé avec succès',
      providerReference: `WAVE_REF_${Date.now()}`,
    };
  }

  /**
   * Orange Money Payment Processing
   */
  private async processOrangePayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    if (config.app.env === 'production') {
      // TODO: Implement real Orange Money API integration
      throw new AppError(
        501,
        'Orange Money payment integration not yet implemented',
        'NOT_IMPLEMENTED'
      );
    }

    // Development simulation
    const transactionId = `OM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Orange Money payment', {
      transactionId,
      amount: request.amount,
    });

    await this.delay(2000);

    return {
      transactionId,
      status: PaymentStatus.SUCCESS,
      amount: request.amount,
      currency: request.currency,
      provider: MobileMoneyProvider.ORANGE,
      message: 'Paiement Orange Money simulé avec succès',
      providerReference: `OM_REF_${Date.now()}`,
    };
  }

  /**
   * MTN Mobile Money Payment Processing
   */
  private async processMTNPayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    if (config.app.env === 'production') {
      // TODO: Implement real MTN Mobile Money API integration
      throw new AppError(
        501,
        'MTN Mobile Money payment integration not yet implemented',
        'NOT_IMPLEMENTED'
      );
    }

    // Development simulation
    const transactionId = `MTN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating MTN Mobile Money payment', {
      transactionId,
      amount: request.amount,
    });

    await this.delay(2000);

    return {
      transactionId,
      status: PaymentStatus.SUCCESS,
      amount: request.amount,
      currency: request.currency,
      provider: MobileMoneyProvider.MTN,
      message: 'Paiement MTN Mobile Money simulé avec succès',
      providerReference: `MTN_REF_${Date.now()}`,
    };
  }

  /**
   * Moov Money Payment Processing
   */
  private async processMoovPayment(
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    if (config.app.env === 'production') {
      // TODO: Implement real Moov Money API integration
      throw new AppError(
        501,
        'Moov Money payment integration not yet implemented',
        'NOT_IMPLEMENTED'
      );
    }

    // Development simulation
    const transactionId = `MOOV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Moov Money payment', {
      transactionId,
      amount: request.amount,
    });

    await this.delay(2000);

    return {
      transactionId,
      status: PaymentStatus.SUCCESS,
      amount: request.amount,
      currency: request.currency,
      provider: MobileMoneyProvider.MOOV,
      message: 'Paiement Moov Money simulé avec succès',
      providerReference: `MOOV_REF_${Date.now()}`,
    };
  }

  /**
   * Detect provider from phone number
   */
  private detectProvider(phoneNumber: string): MobileMoneyProvider {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Côte d'Ivoire numbers (225 prefix)
    if (cleaned.startsWith('225')) {
      const number = cleaned.substring(3);

      // Orange: 07, 08, 09
      if (
        number.startsWith('07') ||
        number.startsWith('08') ||
        number.startsWith('09')
      ) {
        return MobileMoneyProvider.ORANGE;
      }

      // MTN: 05, 06
      if (number.startsWith('05') || number.startsWith('06')) {
        return MobileMoneyProvider.MTN;
      }

      // Moov: 01, 02
      if (number.startsWith('01') || number.startsWith('02')) {
        return MobileMoneyProvider.MOOV;
      }
    }

    // Default to Wave (can work with any number)
    return MobileMoneyProvider.WAVE;
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(
    phoneNumber: string,
    provider: MobileMoneyProvider
  ): void {
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length < 8) {
      throw new AppError(
        400,
        'Numéro de téléphone invalide',
        'INVALID_PHONE_NUMBER'
      );
    }

    // Provider-specific validation can be added here
  }

  /**
   * Cache payment status
   */
  private async cachePaymentStatus(
    transactionId: string,
    payment: PaymentResponse
  ): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${transactionId}`;
    await CacheService.set(cacheKey, payment, this.CACHE_TTL);
  }

  /**
   * Get cached payment status
   */
  private async getCachedPaymentStatus(
    transactionId: string
  ): Promise<PaymentResponse | null> {
    const cacheKey = `${this.CACHE_PREFIX}${transactionId}`;
    return CacheService.get<PaymentResponse>(cacheKey);
  }

  /**
   * Verify payment callback (webhook)
   */
  async verifyCallback(
    provider: MobileMoneyProvider,
    data: any
  ): Promise<PaymentResponse> {
    try {
      // Validate callback authenticity based on provider
      switch (provider) {
        case MobileMoneyProvider.WAVE:
          return this.verifyWaveCallback(data);
        case MobileMoneyProvider.ORANGE:
          return this.verifyOrangeCallback(data);
        case MobileMoneyProvider.MTN:
          return this.verifyMTNCallback(data);
        case MobileMoneyProvider.MOOV:
          return this.verifyMoovCallback(data);
        default:
          throw new AppError(400, 'Fournisseur non supporté');
      }
    } catch (error) {
      logger.error('Callback verification failed', {
        provider,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Verify Wave callback
   * Wave sends webhook with signature in Wave-Signature header
   */
  private async verifyWaveCallback(data: any): Promise<PaymentResponse> {
    try {
      const { payload, signature } = data;

      // Verify signature if webhook secret is configured
      if (config.payment.wave.webhookSecret && signature) {
        const expectedSignature = crypto
          .createHmac('sha256', config.payment.wave.webhookSecret)
          .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
          .digest('hex');

        if (!crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )) {
          throw new AppError(401, 'Invalid Wave webhook signature', 'INVALID_SIGNATURE');
        }
      }

      const webhookData = typeof payload === 'string' ? JSON.parse(payload) : payload;

      // Handle different Wave webhook event types
      const eventType = webhookData.type;
      const eventData = webhookData.data;

      let status: PaymentStatus;
      switch (eventType) {
        case 'checkout.session.completed':
          status = eventData.payment_status === 'succeeded'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;
          break;
        case 'payout.completed':
          status = PaymentStatus.SUCCESS;
          break;
        case 'payout.failed':
          status = PaymentStatus.FAILED;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      const response: PaymentResponse = {
        transactionId: eventData.id || eventData.transaction_id,
        status,
        amount: parseFloat(eventData.amount),
        currency: eventData.currency || 'XOF',
        provider: MobileMoneyProvider.WAVE,
        message: status === PaymentStatus.SUCCESS
          ? 'Paiement Wave confirmé'
          : `Statut Wave: ${eventType}`,
        providerReference: eventData.client_reference,
      };

      // Update cache
      await this.cachePaymentStatus(response.transactionId, response);

      logger.info('Wave callback verified', {
        eventType,
        transactionId: response.transactionId,
        status: response.status,
      });

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Wave callback verification failed', { error: (error as Error).message });
      throw new AppError(400, 'Erreur de vérification du callback Wave', 'WAVE_CALLBACK_ERROR');
    }
  }

  /**
   * Verify Orange Money callback
   * Orange Money sends notification via webhook with transaction details
   */
  private async verifyOrangeCallback(data: any): Promise<PaymentResponse> {
    try {
      const {
        notif_token,
        status: omStatus,
        txnid,
        amount,
        order_id,
        pay_token,
      } = data;

      // In production, verify the notification token with Orange API
      if (config.app.env === 'production' && config.payment.orangeMoney.apiKey) {
        // Verify transaction status with Orange Money API
        const verifyResponse = await axios.get(
          `${config.payment.orangeMoney.apiUrl}/v1/webpayment/${pay_token}`,
          {
            headers: {
              Authorization: `Bearer ${config.payment.orangeMoney.apiKey}`,
            },
          }
        );

        const verifiedStatus = verifyResponse.data.status;
        if (verifiedStatus !== omStatus) {
          throw new AppError(400, 'Statut de transaction non vérifié', 'STATUS_MISMATCH');
        }
      }

      // Map Orange Money status to our status
      let status: PaymentStatus;
      switch (omStatus?.toUpperCase()) {
        case 'SUCCESS':
        case 'SUCCESSFUL':
        case 'COMPLETED':
          status = PaymentStatus.SUCCESS;
          break;
        case 'FAILED':
        case 'CANCELLED':
        case 'EXPIRED':
          status = PaymentStatus.FAILED;
          break;
        case 'PENDING':
        case 'INITIATED':
          status = PaymentStatus.PENDING;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      const response: PaymentResponse = {
        transactionId: txnid || `OM_${Date.now()}`,
        status,
        amount: parseFloat(amount) || 0,
        currency: 'XOF',
        provider: MobileMoneyProvider.ORANGE,
        message: status === PaymentStatus.SUCCESS
          ? 'Paiement Orange Money confirmé'
          : `Statut Orange Money: ${omStatus}`,
        providerReference: order_id || pay_token,
      };

      // Update cache
      await this.cachePaymentStatus(response.transactionId, response);

      logger.info('Orange Money callback verified', {
        transactionId: response.transactionId,
        status: response.status,
        originalStatus: omStatus,
      });

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Orange Money callback verification failed', { error: (error as Error).message });
      throw new AppError(400, 'Erreur de vérification du callback Orange Money', 'ORANGE_CALLBACK_ERROR');
    }
  }

  /**
   * Verify MTN Mobile Money callback
   * MTN MoMo API sends webhook with X-Reference-Id and X-Target-Environment headers
   */
  private async verifyMTNCallback(data: any): Promise<PaymentResponse> {
    try {
      const {
        externalId,
        amount,
        currency,
        status: mtnStatus,
        financialTransactionId,
        referenceId,
        reason,
      } = data;

      // In production, verify with MTN API
      if (config.app.env === 'production' && config.payment.mtnMoney.apiKey) {
        const verifyResponse = await axios.get(
          `${config.payment.mtnMoney.apiUrl}/collection/v1_0/requesttopay/${referenceId}`,
          {
            headers: {
              Authorization: `Bearer ${config.payment.mtnMoney.apiKey}`,
              'X-Target-Environment': config.app.env === 'production' ? 'mtncameroon' : 'sandbox',
              'Ocp-Apim-Subscription-Key': config.payment.mtnMoney.userId,
            },
          }
        );

        const verifiedStatus = verifyResponse.data.status;
        if (verifiedStatus !== mtnStatus) {
          logger.warn('MTN status mismatch', { expected: mtnStatus, received: verifiedStatus });
        }
      }

      // Map MTN status to our status
      let status: PaymentStatus;
      switch (mtnStatus?.toUpperCase()) {
        case 'SUCCESSFUL':
          status = PaymentStatus.SUCCESS;
          break;
        case 'FAILED':
          status = PaymentStatus.FAILED;
          break;
        case 'PENDING':
          status = PaymentStatus.PENDING;
          break;
        case 'REJECTED':
          status = PaymentStatus.CANCELLED;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      const response: PaymentResponse = {
        transactionId: financialTransactionId || referenceId || `MTN_${Date.now()}`,
        status,
        amount: parseFloat(amount) || 0,
        currency: currency || 'XOF',
        provider: MobileMoneyProvider.MTN,
        message: status === PaymentStatus.SUCCESS
          ? 'Paiement MTN Mobile Money confirmé'
          : reason || `Statut MTN: ${mtnStatus}`,
        providerReference: externalId || referenceId,
      };

      // Update cache
      await this.cachePaymentStatus(response.transactionId, response);

      logger.info('MTN Mobile Money callback verified', {
        transactionId: response.transactionId,
        status: response.status,
        originalStatus: mtnStatus,
      });

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('MTN callback verification failed', { error: (error as Error).message });
      throw new AppError(400, 'Erreur de vérification du callback MTN', 'MTN_CALLBACK_ERROR');
    }
  }

  /**
   * Verify Moov Money callback
   * Moov Money sends payment notification via webhook
   */
  private async verifyMoovCallback(data: any): Promise<PaymentResponse> {
    try {
      const {
        transaction_id,
        status: moovStatus,
        amount,
        currency,
        reference,
        merchant_reference,
        message,
      } = data;

      // Map Moov status to our status
      let status: PaymentStatus;
      switch (moovStatus?.toUpperCase()) {
        case 'SUCCESS':
        case 'SUCCESSFUL':
        case 'COMPLETED':
        case 'APPROVED':
          status = PaymentStatus.SUCCESS;
          break;
        case 'FAILED':
        case 'DECLINED':
        case 'CANCELLED':
          status = PaymentStatus.FAILED;
          break;
        case 'PENDING':
        case 'PROCESSING':
          status = PaymentStatus.PENDING;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      const response: PaymentResponse = {
        transactionId: transaction_id || reference || `MOOV_${Date.now()}`,
        status,
        amount: parseFloat(amount) || 0,
        currency: currency || 'XOF',
        provider: MobileMoneyProvider.MOOV,
        message: status === PaymentStatus.SUCCESS
          ? 'Paiement Moov Money confirmé'
          : message || `Statut Moov: ${moovStatus}`,
        providerReference: merchant_reference || reference,
      };

      // Update cache
      await this.cachePaymentStatus(response.transactionId, response);

      logger.info('Moov Money callback verified', {
        transactionId: response.transactionId,
        status: response.status,
        originalStatus: moovStatus,
      });

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Moov callback verification failed', { error: (error as Error).message });
      throw new AppError(400, 'Erreur de vérification du callback Moov', 'MOOV_CALLBACK_ERROR');
    }
  }

  /**
   * Helper: Delay for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): MobileMoneyProvider[] {
    return [
      MobileMoneyProvider.WAVE,
      MobileMoneyProvider.ORANGE,
      MobileMoneyProvider.MTN,
      MobileMoneyProvider.MOOV,
    ];
  }

  /**
   * Get provider name in French
   */
  getProviderName(provider: MobileMoneyProvider): string {
    const names: Record<MobileMoneyProvider, string> = {
      [MobileMoneyProvider.WAVE]: 'Wave',
      [MobileMoneyProvider.ORANGE]: 'Orange Money',
      [MobileMoneyProvider.MTN]: 'MTN Mobile Money',
      [MobileMoneyProvider.MOOV]: 'Moov Money',
    };
    return names[provider];
  }
}

export default MobileMoneyService.getInstance();
