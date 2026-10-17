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

/**
 * Generates a high-resolution base64 PNG data URL of a QR code.
 */
export async function generateQrDataUrl(data: string, isDark: boolean = false): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      margin: 1,
      color: {
        dark: isDark ? '#ffffff' : '#0f172a',
        light: '#00000000',
      },
      width: 360,
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    return '';
  }
}

/**
 * Parses payment-related information from scanned QR text.
 * Supports:
 * - Plain EVM addresses (0x...)
 * - EIP-681 URIs (ethereum:0x...?amount=...&asset=...)
 * - A-Pay payment URLs (https://apayprotocol.org/...?)
 */
export function parsePaymentQrData(raw: string): {
  address: string;
  amount?: string;
  asset?: 'APAY' | 'ETH';
} {
  const clean = raw.trim();
  let address = '';
  let amount = '';
  let asset: 'APAY' | 'ETH' = 'APAY';

  if (clean.startsWith('ethereum:')) {
    const withoutPrefix = clean.replace(/^ethereum:/i, '');
    const [addrPart, queryPart] = withoutPrefix.split('?');
    if (addrPart.startsWith('0x') && addrPart.length >= 42) {
      address = addrPart.slice(0, 42);
    }
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      if (params.get('amount')) amount = params.get('amount') || '';
      if (params.get('value')) {
        const val = Number(params.get('value'));
        if (val > 1e12) amount = (val / 1e18).toString();
        else amount = String(val);
      }
      if (params.get('asset')) {
        asset = params.get('asset')?.toUpperCase() === 'ETH' ? 'ETH' : 'APAY';
      }
    }
  } else if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    address = clean;
  } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const u = new URL(clean);
      const to =
        u.searchParams.get('to') ||
        u.searchParams.get('address') ||
        u.searchParams.get('recipient') ||
        u.searchParams.get('payTo');
      if (to && /^0x[a-fA-F0-9]{40}$/.test(to)) address = to;
      if (u.searchParams.get('amount')) amount = u.searchParams.get('amount') || '';
      if (u.searchParams.get('asset')) {
        asset = u.searchParams.get('asset')?.toUpperCase() === 'ETH' ? 'ETH' : 'APAY';
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return { address, amount, asset };
}
