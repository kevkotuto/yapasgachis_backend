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

  private async verifyWaveCallback(data: any): Promise<PaymentResponse> {
    // TODO: Implement Wave callback verification
    throw new AppError(501, 'Wave callback not implemented');
  }

  private async verifyOrangeCallback(data: any): Promise<PaymentResponse> {
    // TODO: Implement Orange Money callback verification
    throw new AppError(501, 'Orange Money callback not implemented');
  }

  private async verifyMTNCallback(data: any): Promise<PaymentResponse> {
    // TODO: Implement MTN callback verification
    throw new AppError(501, 'MTN callback not implemented');
  }

  private async verifyMoovCallback(data: any): Promise<PaymentResponse> {
    // TODO: Implement Moov Money callback verification
    throw new AppError(501, 'Moov Money callback not implemented');
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
