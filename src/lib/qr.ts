import QRCode from 'qrcode';

/**
 * Generates a high-quality QR code data URL (Base64 PNG) for a given text.
 */
export async function generateQRDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 512,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
