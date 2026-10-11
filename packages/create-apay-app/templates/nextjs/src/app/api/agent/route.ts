import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECEIVER = process.env.APAY_RECEIVER_WALLET || '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc';
const PRICE_USDC = parseFloat(process.env.APAY_PRICE_USDC || '0.002');
const NETWORK = process.env.APAY_NETWORK || 'base-mainnet';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || 'latest-insights';

  // If no authentic A-Pay authorization provided, return HTTP 402 challenge
  if (!authHeader.startsWith('APay ')) {
    const nonce = 'apay-nonce-' + Date.now();
    const amountBaseUnits = Math.round(PRICE_USDC * 1e6).toString(); // USDC has 6 decimals

    return NextResponse.json(
      {
        status: 402,
        error: 'Payment Required',
        pricing: {
          price: PRICE_USDC,
          currency: 'USDC',
          receiver: RECEIVER,
          network: NETWORK,
        },
        eip712: {
          domain: { name: 'APay Protocol', version: '1', chainId: NETWORK.includes('sepolia') ? 84532 : 8453 },
          primaryType: 'PaymentAuthorization',
          message: {
            receiver: RECEIVER,
            amount: amountBaseUnits,
            nonce,
          },
        },
      },
      {
        status: 402,
        headers: {
          'X-APay-Receiver': RECEIVER,
          'X-APay-Amount': amountBaseUnits,
          'X-APay-Currency': 'USDC',
          'X-APay-Nonce': nonce,
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Payment verified! Return proprietary payload
  return NextResponse.json(
    {
      status: 'success',
      query,
      result: `High-value proprietary intelligence result for "${query}".`,
      settled: true,
      timestamp: Date.now(),
    },
    {
      headers: {
        'X-APay-Settled': 'true',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
