import crypto from 'crypto';

import axios, { AxiosInstance } from 'axios';

import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Wave Payment Service
 * Intégration complète avec l'API Wave pour:
 * - Création de checkout (paiement client)
 * - Vérification de paiement
 * - Transfert vers compte fournisseur
 * - Gestion des webhooks
 * - Remboursements
 */

// Types Wave API
export interface WaveCheckoutRequest {
  amount: string;
  currency: 'XOF' | 'XAF' | 'GNF' | 'SLL' | 'MRU';
  error_url: string;
  success_url: string;
  client_reference?: string;
}

export interface WaveCheckoutResponse {
  id: string;
  checkout_status: 'pending' | 'complete' | 'expired' | 'error';
  client_reference?: string;
  currency: string;
  amount: string;
  payment_status?: 'succeeded' | 'pending' | 'failed';
  transaction_id?: string;
  wave_launch_url: string;
  when_completed?: string;
  when_created: string;
  when_expires: string;
  last_payment_error?: {
    code: string;
    message: string;
  };
}

export interface WaveTransferRequest {
  amount: string;
  currency: 'XOF' | 'XAF' | 'GNF' | 'SLL' | 'MRU';
  recipient_mobile: string;
  client_reference?: string;
  name?: string;
}

export interface WaveTransferResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: string;
  currency: string;
  recipient_mobile: string;
  client_reference?: string;
  when_created: string;
  when_modified?: string;
  failure_code?: string;
  failure_description?: string;
}

export interface WaveRefundRequest {
  transaction_id: string;
  amount?: string; // Optionnel pour remboursement partiel
}

export interface WaveRefundResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: string;
  currency: string;
  transaction_id: string;
  when_created: string;
}

export interface WaveWebhookPayload {
  id: string; // Event ID
  type:
    | 'checkout.session.completed'
    | 'checkout.session.payment_failed'
    | 'payout.completed'
    | 'payout.failed';
  data: {
    id: string;
    amount: string;
    currency: string;
    checkout_status?: string;
    payment_status?: string;
    client_reference?: string;
    transaction_id?: string;
    status?: string;
    error_url?: string;
    success_url?: string;
    [key: string]: any;
  };
}

/**
 * Wave Payment Service Class
 */
export class WaveService {
  private static instance: WaveService;
  private client: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly businessId: string;

  private constructor() {
    this.apiUrl = config.payment.wave.apiUrl;
    this.apiKey = config.payment.wave.apiKey;
    this.webhookSecret = config.payment.wave.webhookSecret;
    this.businessId = config.payment.wave.businessId;

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Intercepteur pour logging
    this.client.interceptors.request.use((request) => {
      logger.debug('Wave API Request', {
        method: request.method,
        url: request.url,
        data: request.data,
      });
      return request;
    });

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Wave API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('Wave API Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      }
    );
  }

  static getInstance(): WaveService {
    if (!WaveService.instance) {
      WaveService.instance = new WaveService();
    }
    return WaveService.instance;
  }

  /**
   * Créer une session de checkout Wave
   * Le client sera redirigé vers Wave pour payer
   */
  async createCheckout(params: {
    amount: number;
    currency?: 'XOF' | 'XAF';
    orderId: string;
    successUrl: string;
    errorUrl: string;
  }): Promise<WaveCheckoutResponse> {
    try {
      // Mode simulation en développement
      if (config.app.env !== 'production') {
        return this.simulateCheckout(params);
      }

      const request: WaveCheckoutRequest = {
        amount: params.amount.toString(),
        currency: params.currency || 'XOF',
        success_url: params.successUrl,
        error_url: params.errorUrl,
        client_reference: params.orderId,
      };

      const response = await this.client.post<WaveCheckoutResponse>(
        '/checkout/sessions',
        request
      );

      logger.info('Wave checkout created', {
        checkoutId: response.data.id,
        orderId: params.orderId,
        amount: params.amount,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Wave checkout', {
        orderId: params.orderId,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        500,
        'Erreur lors de la création du paiement Wave',
        'WAVE_CHECKOUT_FAILED'
      );
    }
  }

  /**
   * Récupérer le statut d'un checkout
   */
  async getCheckoutStatus(checkoutId: string): Promise<WaveCheckoutResponse> {
    try {
      if (config.app.env !== 'production') {
        return this.simulateCheckoutStatus(checkoutId);
      }

      const response = await this.client.get<WaveCheckoutResponse>(
        `/checkout/sessions/${checkoutId}`
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Wave checkout status', {
        checkoutId,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        500,
        'Erreur lors de la vérification du paiement',
        'WAVE_STATUS_CHECK_FAILED'
      );
    }
  }

  /**
   * Effectuer un transfert vers le compte Wave d'un fournisseur
   */
  async transferToSupplier(params: {
    amount: number;
    currency?: 'XOF' | 'XAF';
    recipientMobile: string;
    orderId: string;
    supplierName?: string;
  }): Promise<WaveTransferResponse> {
    try {
      if (config.app.env !== 'production') {
        return this.simulateTransfer(params);
      }

      const request: WaveTransferRequest = {
        amount: params.amount.toString(),
        currency: params.currency || 'XOF',
        recipient_mobile: params.recipientMobile,
        client_reference: params.orderId,
        name: params.supplierName,
      };

      const response = await this.client.post<WaveTransferResponse>(
        '/payouts',
        request
      );

      logger.info('Wave transfer initiated', {
        transferId: response.data.id,
        orderId: params.orderId,
        amount: params.amount,
        recipient: params.recipientMobile,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to transfer to supplier', {
        orderId: params.orderId,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        500,
        'Erreur lors du transfert au fournisseur',
        'WAVE_TRANSFER_FAILED'
      );
    }
  }

  /**
   * Effectuer un remboursement
   */
  async refund(params: {
    transactionId: string;
    amount?: number;
    orderId: string;
  }): Promise<WaveRefundResponse> {
    try {
      if (config.app.env !== 'production') {
        return this.simulateRefund(params);
      }

      const request: WaveRefundRequest = {
        transaction_id: params.transactionId,
        ...(params.amount && { amount: params.amount.toString() }),
      };

      const response = await this.client.post<WaveRefundResponse>(
        '/refunds',
        request
      );

      logger.info('Wave refund initiated', {
        refundId: response.data.id,
        transactionId: params.transactionId,
        orderId: params.orderId,
        amount: params.amount,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to process Wave refund', {
        transactionId: params.transactionId,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        500,
        'Erreur lors du remboursement',
        'WAVE_REFUND_FAILED'
      );
    }
  }

  /**
   * Vérifier la signature d'un webhook Wave
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      logger.info('Webhook signature comparison', {
        receivedSignature: signature.substring(0, 20) + '...',
        expectedSignature: expectedSignature.substring(0, 20) + '...',
        payloadLength: payload.length,
        secretLength: this.webhookSecret.length,
      });

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Parser et valider un webhook
   */
  parseWebhook(payload: string, signature: string): WaveWebhookPayload | null {
    if (!this.verifyWebhookSignature(payload, signature)) {
      logger.warn('Invalid webhook signature received');
      return null;
    }

    try {
      return JSON.parse(payload) as WaveWebhookPayload;
    } catch (error) {
      logger.error('Failed to parse webhook payload', {
        error: (error as Error).message,
      });
      return null;
    }
  }

  // ==================== SIMULATIONS POUR DÉVELOPPEMENT ====================

  private simulateCheckout(params: {
    amount: number;
    currency?: string;
    orderId: string;
    successUrl: string;
    errorUrl: string;
  }): WaveCheckoutResponse {
    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Wave checkout', {
      checkoutId,
      orderId: params.orderId,
      amount: params.amount,
    });

    return {
      id: checkoutId,
      checkout_status: 'pending',
      client_reference: params.orderId,
      currency: params.currency || 'XOF',
      amount: params.amount.toString(),
      wave_launch_url: `https://pay.wave.com/checkout/${checkoutId}`,
      when_created: new Date().toISOString(),
      when_expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };
  }

  private simulateCheckoutStatus(checkoutId: string): WaveCheckoutResponse {
    // En simulation, on considère le paiement comme réussi après 5 secondes
    const isCompleted = Date.now() - parseInt(checkoutId.split('_')[1]) > 5000;

    return {
      id: checkoutId,
      checkout_status: isCompleted ? 'complete' : 'pending',
      currency: 'XOF',
      amount: '1000',
      payment_status: isCompleted ? 'succeeded' : 'pending',
      transaction_id: isCompleted ? `txn_${Date.now()}` : undefined,
      wave_launch_url: `https://pay.wave.com/checkout/${checkoutId}`,
      when_created: new Date().toISOString(),
      when_expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      when_completed: isCompleted ? new Date().toISOString() : undefined,
    };
  }

  private simulateTransfer(params: {
    amount: number;
    currency?: string;
    recipientMobile: string;
    orderId: string;
    supplierName?: string;
  }): WaveTransferResponse {
    const transferId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Wave transfer', {
      transferId,
      orderId: params.orderId,
      amount: params.amount,
      recipient: params.recipientMobile,
    });

    return {
      id: transferId,
      status: 'succeeded',
      amount: params.amount.toString(),
      currency: params.currency || 'XOF',
      recipient_mobile: params.recipientMobile,
      client_reference: params.orderId,
      when_created: new Date().toISOString(),
      when_modified: new Date().toISOString(),
    };
  }

  private simulateRefund(params: {
    transactionId: string;
    amount?: number;
    orderId: string;
  }): WaveRefundResponse {
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Simulating Wave refund', {
      refundId,
      transactionId: params.transactionId,
      orderId: params.orderId,
    });

    return {
      id: refundId,
      status: 'succeeded',
      amount: (params.amount || 1000).toString(),
      currency: 'XOF',
      transaction_id: params.transactionId,
      when_created: new Date().toISOString(),
    };
  }

  /**
   * Formater un montant pour affichage
   */
  formatAmount(amount: number, currency: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Vérifier si la configuration Wave est valide
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.webhookSecret);
  }
}

export default WaveService.getInstance();
