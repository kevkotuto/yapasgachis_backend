import nodemailer, { Transporter } from 'nodemailer';

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
 * EmailService - Handles email notifications using SMTP (Nodemailer)
 *
 * Features:
 * - General email sending via SMTP
 * - Admin alert notifications
 * - HTML email support
 * - Development mode (mock sending)
 */
class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
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
   * Initialize SMTP transporter
   */
  private initialize(): void {
    const { smtp } = config.email;

    if (smtp.host && smtp.user && smtp.password) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure, // true for 465, false for other ports
        auth: {
          user: smtp.user,
          pass: smtp.password,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          logger.error('SMTP connection failed', { error: error.message });
          this.initialized = false;
        } else {
          logger.info('Email service initialized with SMTP', {
            host: smtp.host,
            port: smtp.port,
          });
          this.initialized = true;
        }
      });
    } else {
      logger.warn('SMTP not configured, email sending disabled');
    }
  }

  /**
   * Send an email
   */
  async send(params: SendEmailParams): Promise<boolean> {
    const { to, subject, body } = params;

    // In development without SMTP, just log
    if (!this.initialized || config.app.env === 'development') {
      logger.info('Email (mock/dev mode)', {
        to,
        subject,
        bodyPreview: body.substring(0, 100),
      });

      // In development, still try to send if SMTP is configured
      if (!this.transporter) {
        return true;
      }
    }

    try {
      const { smtp } = config.email;

      const info = await this.transporter.sendMail({
        from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: body,
      });

      logger.info('Email sent successfully', {
        to: Array.isArray(to) ? to.length + ' recipients' : to,
        subject,
        messageId: info.messageId,
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

    const adminEmail = config.email.adminEmail;

    const priorityBadge = this.getPriorityBadge(priority);
    const dataSection = data
      ? `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0;">Details:</h4>
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
          <h1 style="color: white; margin: 0;">YapaGachis Admin Alert</h1>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
          ${priorityBadge}

          <h2 style="margin-top: 15px;">${subject}</h2>

          <p style="line-height: 1.6;">${message}</p>

          ${dataSection}

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #666; font-size: 12px;">
            Cet email a ete envoye automatiquement par le systeme YapaGachis.
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
   * Send welcome email to new user
   */
  async sendWelcomeEmail(params: {
    to: string;
    firstName: string;
  }): Promise<boolean> {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenue sur YapaGachis</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Bienvenue sur YapaGachis!</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">Bonjour ${params.firstName}!</h2>

          <p style="line-height: 1.8; color: #555;">
            Nous sommes ravis de vous accueillir dans la communaute YapaGachis!
          </p>

          <p style="line-height: 1.8; color: #555;">
            YapaGachis est la premiere plateforme pan-africaine de lutte contre le gaspillage alimentaire.
            Ensemble, nous pouvons faire la difference!
          </p>

          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #4CAF50; margin-top: 0;">Ce que vous pouvez faire:</h3>
            <ul style="color: #555; line-height: 2;">
              <li>Decouvrir des paniers surprises a prix reduits</li>
              <li>Sauver des repas de la poubelle</li>
              <li>Soutenir les commercants locaux</li>
              <li>Contribuer a la protection de l'environnement</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.app.url}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Commencer maintenant
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            YapaGachis - Ensemble contre le gaspillage alimentaire
            <br>
            <a href="${config.app.url}" style="color: #4CAF50;">www.yapasgachis.com</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: params.to,
      subject: 'Bienvenue sur YapaGachis!',
      body: htmlBody,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(params: {
    to: string;
    firstName: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    pickupAddress?: string;
    pickupTime?: string;
  }): Promise<boolean> {
    const itemsHtml = params.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString()} FCFA</td>
        </tr>
      `
      )
      .join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmation de commande</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Commande confirmee!</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">Merci ${params.firstName}!</h2>

          <p style="color: #555;">
            Votre commande <strong>#${params.orderNumber}</strong> a ete confirmee.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left;">Article</th>
                <th style="padding: 10px; text-align: center;">Qte</th>
                <th style="padding: 10px; text-align: right;">Prix</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px; font-weight: bold;">Total</td>
                <td style="padding: 15px; text-align: right; font-weight: bold; color: #4CAF50;">
                  ${params.total.toLocaleString()} FCFA
                </td>
              </tr>
            </tfoot>
          </table>

          ${
            params.pickupAddress
              ? `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #2E7D32; margin-top: 0;">Informations de retrait</h3>
              <p style="margin: 5px 0;"><strong>Adresse:</strong> ${params.pickupAddress}</p>
              ${params.pickupTime ? `<p style="margin: 5px 0;"><strong>Creneau:</strong> ${params.pickupTime}</p>` : ''}
            </div>
          `
              : ''
          }

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            YapaGachis - Ensemble contre le gaspillage alimentaire
          </p>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: params.to,
      subject: `Commande #${params.orderNumber} confirmee`,
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
      subject: 'Echec de paiement fournisseur',
      message: `Le transfert de fonds vers le fournisseur a echoue et necessite une intervention manuelle.`,
      data: {
        'ID Commande': params.orderId,
        'ID Fournisseur': params.supplierId,
        'Nom Fournisseur': params.supplierName,
        Montant: `${params.amount} FCFA`,
        Raison: params.reason,
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
      message: `Une dispute a ete ouverte sur une commande et requiert votre attention.`,
      data: {
        'ID Commande': params.orderId,
        'ID Escrow': params.escrowId,
        Client: params.clientName,
        Fournisseur: params.supplierName,
        'Montant en jeu': `${params.amount} FCFA`,
        Raison: params.reason,
      },
      priority: 'high',
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    firstName: string;
    resetCode: string;
  }): Promise<boolean> {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reinitialisation du mot de passe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Reinitialisation du mot de passe</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">Bonjour ${params.firstName},</h2>

          <p style="color: #555; line-height: 1.8;">
            Vous avez demande la reinitialisation de votre mot de passe.
            Voici votre code de verification:
          </p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">
              ${params.resetCode}
            </span>
          </div>

          <p style="color: #555; line-height: 1.8;">
            Ce code expire dans 10 minutes.
          </p>

          <p style="color: #999; font-size: 14px;">
            Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            YapaGachis - Ensemble contre le gaspillage alimentaire
          </p>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: params.to,
      subject: 'Code de reinitialisation YapaGachis',
      body: htmlBody,
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

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('SMTP transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection test successful');
      return true;
    } catch (error) {
      logger.error('SMTP connection test failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
export default emailService;
