import sgMail from '@sendgrid/mail';
import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

interface AdminAlertParams {
  subject: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * EmailService - Handles email notifications using SendGrid
 *
 * Features:
 * - General email sending
 * - Admin alert notifications
 * - HTML email support
 * - Development mode (mock sending)
 */
class EmailService {
  private static instance: EmailService;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize SendGrid with API key
   */
  private initialize(): void {
    if (config.email.sendgrid.apiKey) {
      sgMail.setApiKey(config.email.sendgrid.apiKey);
      this.initialized = true;
      logger.info('Email service initialized with SendGrid');
    } else {
      logger.warn('SendGrid API key not configured, email sending disabled');
    }
  }

  /**
   * Send an email
   */
  async send(params: SendEmailParams): Promise<boolean> {
    const { to, subject, body } = params;

    // In development without API key, just log
    if (!this.initialized || config.app.env === 'development') {
      logger.info('Email (mock/dev mode)', {
        to,
        subject,
        bodyPreview: body.substring(0, 100),
      });
      return true;
    }

    try {
      await sgMail.send({
        to,
        from: {
          email: config.email.sendgrid.fromEmail,
          name: config.email.sendgrid.fromName,
        },
        subject,
        html: body,
      });

      logger.info('Email sent successfully', {
        to: Array.isArray(to) ? to.length + ' recipients' : to,
        subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send admin alert email
   */
  async sendAdminAlert(params: AdminAlertParams): Promise<boolean> {
    const { subject, message, data, priority = 'normal' } = params;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yapasgachis.com';

    const priorityBadge = this.getPriorityBadge(priority);
    const dataSection = data
      ? `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0;">Détails:</h4>
          <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
        </div>
      `
      : '';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔔 YapaGachis Admin Alert</h1>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
          ${priorityBadge}

          <h2 style="margin-top: 15px;">${subject}</h2>

          <p style="line-height: 1.6;">${message}</p>

          ${dataSection}

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par le système YapaGachis.
            <br>
            Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}
          </p>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: adminEmail,
      subject: `[${priority.toUpperCase()}] ${subject}`,
      body: htmlBody,
    });
  }

  /**
   * Send payout failed alert to admins
   */
  async sendPayoutFailedAlert(params: {
    orderId: string;
    supplierId: string;
    supplierName: string;
    amount: number;
    reason: string;
  }): Promise<boolean> {
    return this.sendAdminAlert({
      subject: 'Échec de paiement fournisseur',
      message: `Le transfert de fonds vers le fournisseur a échoué et nécessite une intervention manuelle.`,
      data: {
        'ID Commande': params.orderId,
        'ID Fournisseur': params.supplierId,
        'Nom Fournisseur': params.supplierName,
        'Montant': `${params.amount} FCFA`,
        'Raison': params.reason,
      },
      priority: 'urgent',
    });
  }

  /**
   * Send dispute opened alert to admins
   */
  async sendDisputeAlert(params: {
    orderId: string;
    escrowId: string;
    clientName: string;
    supplierName: string;
    amount: number;
    reason: string;
  }): Promise<boolean> {
    return this.sendAdminAlert({
      subject: 'Nouvelle dispute ouverte',
      message: `Une dispute a été ouverte sur une commande et requiert votre attention.`,
      data: {
        'ID Commande': params.orderId,
        'ID Escrow': params.escrowId,
        'Client': params.clientName,
        'Fournisseur': params.supplierName,
        'Montant en jeu': `${params.amount} FCFA`,
        'Raison': params.reason,
      },
      priority: 'high',
    });
  }

  /**
   * Get priority badge HTML
   */
  private getPriorityBadge(priority: string): string {
    const colors: Record<string, { bg: string; text: string }> = {
      low: { bg: '#e3f2fd', text: '#1976d2' },
      normal: { bg: '#e8f5e9', text: '#388e3c' },
      high: { bg: '#fff3e0', text: '#f57c00' },
      urgent: { bg: '#ffebee', text: '#d32f2f' },
    };

    const color = colors[priority] || colors.normal;

    return `
      <span style="
        background: ${color.bg};
        color: ${color.text};
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      ">
        ${priority}
      </span>
    `;
  }
}

export const emailService = EmailService.getInstance();
export default emailService;
