/**
 * Type declarations for optional dynamic imports
 * These modules are loaded dynamically at runtime when available
 */

// Twilio SMS module
declare module 'twilio' {
  export default function(accountSid: string, authToken: string): {
    messages: {
      create(options: {
        body: string;
        from: string;
        to: string;
      }): Promise<{
        sid: string;
        status: string;
      }>;
    };
  };
}

// Africa's Talking SMS module
declare module 'africastalking' {
  interface SMS {
    send(options: {
      to: string[];
      message: string;
      from?: string;
    }): Promise<{
      SMSMessageData?: {
        Recipients?: Array<{
          messageId?: string;
          status?: string;
          statusCode?: number;
        }>;
      };
    }>;
  }

  interface AfricasTalkingInstance {
    SMS: SMS;
  }

  export default function(config: {
    apiKey: string;
    username: string;
  }): AfricasTalkingInstance;
}

// PDFKit module
declare module 'pdfkit' {
  import { Writable } from 'stream';

  interface PDFDocumentOptions {
    size?: string | [number, number];
    layout?: 'portrait' | 'landscape';
    margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
    };
  }

  interface PDFPage {
    width: number;
    height: number;
  }

  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);

    page: PDFPage;

    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, x?: number, y?: number, options?: {
      width?: number;
      align?: 'left' | 'center' | 'right';
      underline?: boolean;
    }): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    strokeColor(color: string): this;
    stroke(): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(color?: string): this;
    lineWidth(width: number): this;
    end(): void;

    on(event: 'data', callback: (chunk: Buffer) => void): this;
    on(event: 'end', callback: () => void): this;
    on(event: 'error', callback: (error: Error) => void): this;
  }

  export default PDFDocument;
}
