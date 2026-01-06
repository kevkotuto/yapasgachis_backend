import QRCode, { QRCodeToDataURLOptions, QRCodeToBufferOptions } from 'qrcode';

/**
 * Generate QR code as data URL
 */
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const options: QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    };
    return await QRCode.toDataURL(data, options);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as buffer
 */
export const generateQRCodeBuffer = async (data: string): Promise<Buffer> => {
  try {
    const options: QRCodeToBufferOptions = {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 300,
    };
    return await QRCode.toBuffer(data, options);
  } catch (error) {
    throw new Error('Failed to generate QR code buffer');
  }
};

/**
 * Generate pickup QR code for order
 */
export const generatePickupQRCode = async (
  orderId: string,
  pickupCode: string
): Promise<string> => {
  const data = JSON.stringify({
    orderId,
    pickupCode,
    timestamp: new Date().toISOString(),
  });

  return generateQRCode(data);
};

/**
 * Verify pickup QR code
 */
export const verifyPickupQRCode = (
  qrData: string
): { orderId: string; pickupCode: string; timestamp: string } | null => {
  try {
    const parsed = JSON.parse(qrData);

    if (!parsed.orderId || !parsed.pickupCode || !parsed.timestamp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
