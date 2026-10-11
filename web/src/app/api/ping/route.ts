import { NextResponse } from 'next/server';
import { validateSafePublicUrl } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    protocol: 'A-Pay',
    message: 'A-Pay Gateway Health Probe & Telemetry Operational',
    version: '0.1.2',
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" parameter in request body' },
        { status: 400 },
      );
    }

    // Defensive SSRF Validation: Block cloud metadata and private IP ranges
    const validation = validateSafePublicUrl(url, { allowLocalhostInDev: true });
    if (!validation.safe) {
      return NextResponse.json(
        { error: validation.error || `Invalid or restricted URL: "${url}"` },
        { status: 400 },
      );
    }

    const startTime = performance.now();

    // Perform real server-side fetch to target endpoint with a 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-APay-Test': 'probe',
          'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr?.name === 'AbortError';
      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? 'Connection timed out after 6000ms. Server is unreachable or offline.'
            : `Connection failed: ${fetchErr?.message || 'Network error'}`,
          targetUrl: url,
        },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Extract headers (especially APay HTTP 402 challenge headers)
    const receiver = res.headers.get('X-APay-Receiver') || res.headers.get('x-apay-receiver');
    const amount = res.headers.get('X-APay-Amount') || res.headers.get('x-apay-amount');
    const currency = res.headers.get('X-APay-Currency') || res.headers.get('x-apay-currency');
    const amountUsdc =
      res.headers.get('X-APay-Amount-USDC') || res.headers.get('x-apay-amount-usdc');
    const amountApay =
      res.headers.get('X-APay-Amount-APAY') || res.headers.get('x-apay-amount-apay');
    const nonce = res.headers.get('X-APay-Nonce') || res.headers.get('x-apay-nonce');
    const token = res.headers.get('X-APay-Token') || res.headers.get('x-apay-token');
    const authChallenge =
      res.headers.get('WWW-Authenticate') || res.headers.get('www-authenticate');

    const headersList: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headersList[key.toLowerCase()] = val;
    });

    const isHttp402 = res.status === 402;
    const isCloudflareChallenge =
      res.status === 403 &&
      (res.headers.get('cf-mitigated') === 'challenge' ||
        headersList['cf-mitigated'] === 'challenge' ||
        res.headers.has('cf-ray') ||
        Boolean(headersList['cf-ray']) ||
        Boolean(headersList.server?.toLowerCase().includes('cloudflare')));
    const cfRay = res.headers.get('cf-ray') || headersList['cf-ray'] || null;

    // Fallback: If root URL was challenged by Cloudflare Bot Mode, check the official /.apay/status endpoint
    if (!isHttp402) {
      try {
        const parsed = new URL(url);
        if (!parsed.pathname.includes('/.apay/status')) {
          const statusEndpoint = `${parsed.protocol}//${parsed.host}/.apay/status`;
          const statusRes = await fetch(statusEndpoint, {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
              'X-APay-Test': 'probe',
            },
            signal: AbortSignal.timeout(4000),
          });
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson?.protocol === 'A-Pay' && statusJson?.status === 'active') {
              return NextResponse.json({
                success: true,
                statusCode: 402,
                statusText: 'Payment Required (Cloudflare Edge Verified)',
                durationMs: Math.round(performance.now() - startTime),
                targetUrl: url,
                isPaywall: true,
                isCloudflareChallenge: false,
                cfRay,
                apayHeaders: {
                  receiver: statusJson.receiver,
                  amount: statusJson.price_usdc || statusJson.price_apay || '0.001',
                  amountUsdc: statusJson.price_usdc,
                  amountApay: statusJson.price_apay,
                  currency: statusJson.currency || 'DUAL',
                  nonce: 'live-edge-verified',
                  token: null,
                  authChallenge: 'A-Pay Cloudflare Edge',
                },
                headers: headersList,
              });
            }
          }
        }
      } catch {
        // ignore fallback error
      }
    }

    return NextResponse.json({
      success: true,
      statusCode: res.status,
      statusText: res.statusText,
      durationMs,
      targetUrl: url,
      isPaywall: isHttp402,
      isCloudflareChallenge,
      cfRay,
      apayHeaders: {
        receiver,
        amount,
        amountUsdc,
        amountApay,
        currency,
        nonce,
        token,
        authChallenge,
      },
      headers: headersList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal server error: ${err?.message || 'Unknown'}` },
      { status: 500 },
    );
  }
}
