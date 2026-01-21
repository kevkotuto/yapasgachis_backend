import config from '@/config';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * PDF Generation Service
 * Uses PDFKit for generating PDF documents (receipts, certificates, invoices)
 *
 * Requires: pdfkit package (npm install pdfkit @types/pdfkit)
 */

// Types
export interface DonationReceiptData {
  donationId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donationType: 'FOOD' | 'FINANCIAL';
  amount?: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  productName?: string;
  associationName: string;
  associationAddress?: string;
  donationDate: Date;
  completedDate?: Date;
  receiptNumber: string;
}

export interface DonationCertificateData {
  donationId: string;
  donorName: string;
  donationType: 'FOOD' | 'FINANCIAL';
  amount?: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  productName?: string;
  associationName: string;
  associationLogo?: string;
  donationDate: Date;
  certificateNumber: string;
  impactDescription?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierName: string;
  supplierAddress?: string;
  supplierPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  deliveryFee?: number;
  commission?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentReference?: string;
  orderDate: Date;
  dueDate?: Date;
}

/**
 * PDF Service Class
 */
export class PDFService {
  private static instance: PDFService;
  private pdfKitAvailable: boolean = false;
  private PDFDocument: any;

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  /**
   * Initialize PDFKit
   */
  private async initialize(): Promise<void> {
    try {
      const pdfkit = await import('pdfkit');
      this.PDFDocument = pdfkit.default;
      this.pdfKitAvailable = true;
      logger.info('[PDFService] PDFKit initialized successfully');
    } catch (error) {
      logger.warn('[PDFService] PDFKit not available - PDF generation will be mocked', {
        error: (error as Error).message,
      });
      this.pdfKitAvailable = false;
    }
  }

  /**
   * Check if PDF generation is available
   */
  isAvailable(): boolean {
    return this.pdfKitAvailable;
  }

  /**
   * Generate donation receipt PDF
   */
  async generateDonationReceipt(data: DonationReceiptData): Promise<Buffer> {
    if (!this.pdfKitAvailable) {
      logger.warn('[PDFService] Generating mock receipt');
      return this.generateMockPDF('receipt', data);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new this.PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Reçu de don - ${data.receiptNumber}`,
            Author: 'YapaGachis',
            Subject: 'Reçu de don',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc, 'REÇU DE DON');

        // Receipt number and date
        doc.fontSize(10)
          .fillColor('#666666')
          .text(`N° ${data.receiptNumber}`, { align: 'right' })
          .text(`Date: ${this.formatDate(data.donationDate)}`, { align: 'right' });

        doc.moveDown(2);

        // Donor information
        doc.fontSize(12)
          .fillColor('#333333')
          .text('Donateur:', { underline: true })
          .fontSize(11)
          .text(data.donorName);

        if (data.donorEmail) {
          doc.text(`Email: ${data.donorEmail}`);
        }
        if (data.donorPhone) {
          doc.text(`Téléphone: ${data.donorPhone}`);
        }

        doc.moveDown(1.5);

        // Association information
        doc.fontSize(12)
          .text('Bénéficiaire:', { underline: true })
          .fontSize(11)
          .text(data.associationName);

        if (data.associationAddress) {
          doc.text(data.associationAddress);
        }

        doc.moveDown(1.5);

        // Donation details
        doc.fontSize(12)
          .text('Détails du don:', { underline: true });

        doc.moveDown(0.5);

        if (data.donationType === 'FINANCIAL') {
          doc.fontSize(11)
            .text(`Type: Don financier`)
            .text(`Montant: ${this.formatAmount(data.amount || 0, data.currency || 'XOF')}`);
        } else {
          doc.fontSize(11)
            .text(`Type: Don alimentaire`);
          if (data.productName) {
            doc.text(`Produit: ${data.productName}`);
          }
          doc.text(`Quantité: ${data.quantity} ${data.unit || 'unités'}`);
        }

        doc.text(`Date de don: ${this.formatDate(data.donationDate)}`);

        if (data.completedDate) {
          doc.text(`Date de réception: ${this.formatDate(data.completedDate)}`);
        }

        doc.moveDown(3);

        // Footer note
        doc.fontSize(9)
          .fillColor('#666666')
          .text('Ce reçu a été généré automatiquement par la plateforme YapaGachis.', { align: 'center' })
          .text("Il peut être utilisé comme justificatif de votre don.", { align: 'center' });

        // Add footer with page number
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate donation certificate PDF
   */
  async generateDonationCertificate(data: DonationCertificateData): Promise<Buffer> {
    if (!this.pdfKitAvailable) {
      logger.warn('[PDFService] Generating mock certificate');
      return this.generateMockPDF('certificate', data);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new this.PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
          info: {
            Title: `Certificat de don - ${data.certificateNumber}`,
            Author: 'YapaGachis',
            Subject: 'Certificat de don',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Decorative border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
          .strokeColor('#2563eb')
          .lineWidth(3)
          .stroke();

        doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
          .strokeColor('#60a5fa')
          .lineWidth(1)
          .stroke();

        doc.moveDown(3);

        // Title
        doc.fontSize(28)
          .fillColor('#1e40af')
          .text('CERTIFICAT DE DON', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(12)
          .fillColor('#666666')
          .text(`N° ${data.certificateNumber}`, { align: 'center' });

        doc.moveDown(2);

        // Main text
        doc.fontSize(14)
          .fillColor('#333333')
          .text('Ce certificat atteste que', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(20)
          .fillColor('#1e40af')
          .text(data.donorName.toUpperCase(), { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(14)
          .fillColor('#333333')
          .text('a généreusement contribué à la lutte contre le gaspillage alimentaire', { align: 'center' })
          .text(`en effectuant un don au profit de`, { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(16)
          .fillColor('#059669')
          .text(data.associationName, { align: 'center' });

        doc.moveDown(1);

        // Donation details
        let donationDetail: string;
        if (data.donationType === 'FINANCIAL') {
          donationDetail = `Don financier de ${this.formatAmount(data.amount || 0, data.currency || 'XOF')}`;
        } else {
          donationDetail = `Don alimentaire${data.productName ? `: ${data.productName}` : ''} - ${data.quantity} ${data.unit || 'unités'}`;
        }

        doc.fontSize(12)
          .fillColor('#333333')
          .text(donationDetail, { align: 'center' })
          .text(`Le ${this.formatDate(data.donationDate)}`, { align: 'center' });

        doc.moveDown(1);

        // Impact message
        if (data.impactDescription) {
          doc.fontSize(11)
            .fillColor('#666666')
            .text(`Impact: ${data.impactDescription}`, { align: 'center' });
        }

        doc.moveDown(2);

        // Signature area
        doc.fontSize(10)
          .fillColor('#333333')
          .text('_______________________________', { align: 'center' })
          .text('YapaGachis - Plateforme Anti-Gaspillage', { align: 'center' });

        // Footer
        doc.fontSize(8)
          .fillColor('#999999')
          .text(`Généré le ${this.formatDate(new Date())} | yapasgachis.com`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    if (!this.pdfKitAvailable) {
      logger.warn('[PDFService] Generating mock invoice');
      return this.generateMockPDF('invoice', data);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new this.PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Facture - ${data.invoiceNumber}`,
            Author: 'YapaGachis',
            Subject: 'Facture',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc, 'FACTURE');

        // Invoice details
        const rightColumnX = 350;

        doc.fontSize(10)
          .fillColor('#333333')
          .text(`N° ${data.invoiceNumber}`, rightColumnX, 100)
          .text(`Date: ${this.formatDate(data.orderDate)}`, rightColumnX, 115)
          .text(`Commande: ${data.orderId}`, rightColumnX, 130);

        if (data.dueDate) {
          doc.text(`Échéance: ${this.formatDate(data.dueDate)}`, rightColumnX, 145);
        }

        // Customer info
        doc.fontSize(12)
          .text('Client:', 50, 100, { underline: true });

        doc.fontSize(10)
          .text(data.customerName, 50, 120);

        if (data.customerEmail) {
          doc.text(data.customerEmail, 50, 135);
        }
        if (data.customerPhone) {
          doc.text(data.customerPhone, 50, 150);
        }
        if (data.customerAddress) {
          doc.text(data.customerAddress, 50, 165, { width: 200 });
        }

        // Supplier info
        doc.fontSize(12)
          .text('Vendeur:', 50, 200, { underline: true });

        doc.fontSize(10)
          .text(data.supplierName, 50, 220);

        if (data.supplierPhone) {
          doc.text(data.supplierPhone, 50, 235);
        }
        if (data.supplierAddress) {
          doc.text(data.supplierAddress, 50, 250, { width: 200 });
        }

        // Items table
        const tableTop = 300;
        this.drawInvoiceTable(doc, data.items, tableTop);

        // Totals
        const totalsY = tableTop + 30 + (data.items.length * 25);

        doc.fontSize(10)
          .text(`Sous-total:`, rightColumnX, totalsY)
          .text(this.formatAmount(data.subtotal, data.currency), rightColumnX + 100, totalsY, { align: 'right' });

        let currentY = totalsY + 15;

        if (data.deliveryFee && data.deliveryFee > 0) {
          doc.text('Frais de livraison:', rightColumnX, currentY)
            .text(this.formatAmount(data.deliveryFee, data.currency), rightColumnX + 100, currentY, { align: 'right' });
          currentY += 15;
        }

        if (data.commission && data.commission > 0) {
          doc.text('Commission:', rightColumnX, currentY)
            .text(this.formatAmount(data.commission, data.currency), rightColumnX + 100, currentY, { align: 'right' });
          currentY += 15;
        }

        doc.fontSize(12)
          .fillColor('#1e40af')
          .text('TOTAL:', rightColumnX, currentY + 10)
          .text(this.formatAmount(data.total, data.currency), rightColumnX + 100, currentY + 10, { align: 'right' });

        // Payment info
        if (data.paymentMethod) {
          doc.fontSize(10)
            .fillColor('#333333')
            .text(`Moyen de paiement: ${data.paymentMethod}`, 50, currentY + 50);
        }
        if (data.paymentReference) {
          doc.text(`Référence: ${data.paymentReference}`, 50, currentY + 65);
        }

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload PDF to storage and return URL
   */
  async uploadPDF(buffer: Buffer, filename: string): Promise<string> {
    try {
      // Try to upload to Cloudinary
      if (config.cloudinary.cloudName && config.cloudinary.apiKey) {
        const result = await cloudinaryService.uploadPDF(buffer, filename);
        return result.url;
      }

      // Fallback: Save locally (in development)
      const fs = await import('fs/promises');
      const path = await import('path');

      const uploadDir = path.join(process.cwd(), 'uploads', 'pdfs');
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, `${filename}.pdf`);
      await fs.writeFile(filePath, buffer);

      return `/uploads/pdfs/${filename}.pdf`;
    } catch (error) {
      logger.error('[PDFService] Error uploading PDF', {
        filename,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors du téléchargement du PDF');
    }
  }

  /**
   * Generate and upload donation receipt
   */
  async createDonationReceipt(data: DonationReceiptData): Promise<string> {
    try {
      const buffer = await this.generateDonationReceipt(data);
      const filename = `receipt-${data.donationId}-${Date.now()}`;
      const url = await this.uploadPDF(buffer, filename);

      logger.info('[PDFService] Donation receipt created', {
        donationId: data.donationId,
        url,
      });

      return url;
    } catch (error) {
      logger.error('[PDFService] Error creating donation receipt', {
        donationId: data.donationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate and upload donation certificate
   */
  async createDonationCertificate(data: DonationCertificateData): Promise<string> {
    try {
      const buffer = await this.generateDonationCertificate(data);
      const filename = `certificate-${data.donationId}-${Date.now()}`;
      const url = await this.uploadPDF(buffer, filename);

      logger.info('[PDFService] Donation certificate created', {
        donationId: data.donationId,
        url,
      });

      return url;
    } catch (error) {
      logger.error('[PDFService] Error creating donation certificate', {
        donationId: data.donationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate and upload invoice
   */
  async createInvoice(data: InvoiceData): Promise<string> {
    try {
      const buffer = await this.generateInvoice(data);
      const filename = `invoice-${data.invoiceNumber}-${Date.now()}`;
      const url = await this.uploadPDF(buffer, filename);

      logger.info('[PDFService] Invoice created', {
        invoiceNumber: data.invoiceNumber,
        orderId: data.orderId,
        url,
      });

      return url;
    } catch (error) {
      logger.error('[PDFService] Error creating invoice', {
        invoiceNumber: data.invoiceNumber,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Helper methods

  private addHeader(doc: any, title: string): void {
    doc.fontSize(24)
      .fillColor('#1e40af')
      .text('YapaGachis', 50, 50);

    doc.fontSize(10)
      .fillColor('#666666')
      .text('Plateforme Anti-Gaspillage Alimentaire', 50, 80);

    doc.fontSize(18)
      .fillColor('#333333')
      .text(title, { align: 'right' });

    doc.moveTo(50, 100)
      .lineTo(doc.page.width - 50, 100)
      .strokeColor('#e5e7eb')
      .stroke();
  }

  private addFooter(doc: any): void {
    const bottomY = doc.page.height - 50;

    doc.moveTo(50, bottomY - 20)
      .lineTo(doc.page.width - 50, bottomY - 20)
      .strokeColor('#e5e7eb')
      .stroke();

    doc.fontSize(8)
      .fillColor('#999999')
      .text('YapaGachis - www.yapasgachis.com', 50, bottomY - 10, {
        align: 'center',
        width: doc.page.width - 100,
      })
      .text('contact@yapasgachis.com | Abidjan, Côte d\'Ivoire', 50, bottomY, {
        align: 'center',
        width: doc.page.width - 100,
      });
  }

  private drawInvoiceTable(
    doc: any,
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>,
    startY: number
  ): void {
    // Table header
    const tableHeaders = ['Article', 'Quantité', 'Prix unitaire', 'Total'];
    const columnWidths = [250, 70, 100, 100];
    const columnX = [50, 300, 370, 470];

    doc.fontSize(10)
      .fillColor('#ffffff')
      .rect(50, startY, doc.page.width - 100, 20)
      .fill('#1e40af');

    tableHeaders.forEach((header, i) => {
      doc.fillColor('#ffffff')
        .text(header, columnX[i], startY + 5, { width: columnWidths[i] });
    });

    // Table rows
    let y = startY + 25;
    items.forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb')
          .rect(50, y - 5, doc.page.width - 100, 20)
          .fill();
      }

      doc.fillColor('#333333')
        .text(item.name, columnX[0], y, { width: columnWidths[0] })
        .text(item.quantity.toString(), columnX[1], y, { width: columnWidths[1] })
        .text(this.formatAmount(item.unitPrice, 'XOF'), columnX[2], y, { width: columnWidths[2] })
        .text(this.formatAmount(item.total, 'XOF'), columnX[3], y, { width: columnWidths[3] });

      y += 25;
    });

    // Table border
    doc.rect(50, startY, doc.page.width - 100, y - startY)
      .strokeColor('#e5e7eb')
      .stroke();
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private generateMockPDF(type: string, data: any): Buffer {
    // Generate a simple text-based mock PDF for testing
    const content = `
    YapaGachis - ${type.toUpperCase()}
    ================================
    Type: ${type}
    Generated: ${new Date().toISOString()}
    Data: ${JSON.stringify(data, null, 2)}

    Note: This is a mock PDF. Install pdfkit for actual PDF generation.
    `;

    return Buffer.from(content, 'utf-8');
  }
}

export default PDFService.getInstance();
