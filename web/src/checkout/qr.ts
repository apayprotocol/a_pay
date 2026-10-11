import QRCode from 'qrcode';

/**
 * Generates an SVG string representation of a QR code.
 */
export async function generateQrSvg(data: string, isDark: boolean = false): Promise<string> {
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 1,
      color: {
        dark: isDark ? '#ffffff' : '#0f172a',
        light: '#00000000', // transparent background
      },
      width: 200,
    });
    return svg;
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
    return `<div style="padding: 20px; color: red;">Failed to generate QR code</div>`;
  }
}
