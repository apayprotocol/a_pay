import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { validateSafePublicUrl } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, amount, currency, secretKey, orderId, network = 'base-sepolia' } = body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "webhookUrl" parameter' },
        { status: 400 },
      );
    }

    const urlCheck = validateSafePublicUrl(webhookUrl, { allowLocalhostInDev: true });
    if (!urlCheck.safe) {
      return NextResponse.json(
        { error: urlCheck.error || `Invalid or restricted webhook URL: "${webhookUrl}"` },
        { status: 400 },
      );
    }

    const targetNetwork = network === 'base-mainnet' ? 'base-mainnet' : 'base-sepolia';
    const targetChainId = targetNetwork === 'base-mainnet' ? 8453 : 84532;

    const payload = {
      event: 'payment.successful',
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      created: Math.floor(Date.now() / 1000),
      data: {
        order_id: orderId || `ord_${Date.now()}`,
        amount: amount || '10.00',
        currency: currency || 'USDC',
        network: targetNetwork,
        chainId: targetChainId,
        settled_at: new Date().toISOString(),
        payment_rail: 'A-Pay HTTP 402 Autonomous Router',
      },
    };

    const payloadString = JSON.stringify(payload);
    const keyToUse = secretKey || 'sk_live_default_secret';
    const signature = crypto.createHmac('sha256', keyToUse).update(payloadString).digest('hex');

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    let responseBodyText = '';
    try {
      res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'APay-Webhook-Dispatcher/1.0',
          'X-APay-Signature': `sha256=${signature}`,
          'X-APay-Event': 'payment.successful',
          'X-APay-Timestamp': String(payload.created),
        },
        body: payloadString,
        signal: controller.signal,
      });

      try {
        responseBodyText = (await res.text()).slice(0, 1000);
      } catch {
        responseBodyText = '';
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr?.name === 'AbortError';
      return NextResponse.json({
        success: false,
        error: isTimeout
          ? 'Webhook delivery timed out after 6000ms.'
          : `Delivery failed: ${fetchErr?.message || 'Network error'}`,
        webhookUrl,
        sentPayload: payload,
        signature: `sha256=${signature}`,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const durationMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      delivered: true,
      statusCode: res.status,
      statusText: res.statusText,
      durationMs,
      responseBody: responseBodyText,
      sentPayload: payload,
      signature: `sha256=${signature}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook dispatch failed: ${err?.message || 'Unknown'}` },
      { status: 500 },
    );
  }
}
