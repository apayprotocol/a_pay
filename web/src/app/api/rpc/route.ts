import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC_ENDPOINTS: Record<string, string[]> = {
  'base-mainnet': [
    'https://mainnet.base.org',
    'https://base.drpc.org',
    'https://base.gateway.tenderly.co',
    'https://developer-access-mainnet.base.org',
  ],
  'base-sepolia': [
    'https://sepolia.base.org',
    'https://base-sepolia.drpc.org',
    'https://base-sepolia-rpc.publicnode.com',
  ],
};

// In-memory server-side cache for read-only RPC calls (capped at 500 items to prevent memory exhaustion)
const MAX_CACHE_ENTRIES = 500;
const serverRpcCache = new Map<string, { data: any; expiry: number }>();

function setBoundedCache(key: string, data: any, ttlMs: number) {
  if (serverRpcCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    // Prune expired entries first
    for (const [k, v] of serverRpcCache.entries()) {
      if (v.expiry <= now) {
        serverRpcCache.delete(k);
      }
    }
    // If still at capacity, drop oldest key
    if (serverRpcCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = serverRpcCache.keys().next().value;
      if (firstKey) serverRpcCache.delete(firstKey);
    }
  }
  serverRpcCache.set(key, { data, expiry: Date.now() + ttlMs });
}

function getCacheKey(network: string, body: any): string | null {
  if (Array.isArray(body)) return null;
  const method = body?.method;
  if (!method || typeof method !== 'string') return null;

  // Cache deterministic read-only methods
  if (
    method === 'eth_blockNumber' ||
    method === 'eth_gasPrice' ||
    method === 'eth_chainId' ||
    method === 'eth_call' ||
    method === 'eth_getCode'
  ) {
    return `${network}:${method}:${JSON.stringify(body?.params || [])}`;
  }
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'A-Pay High-Availability RPC Relay',
      version: '0.1.2',
      supportedNetworks: ['base-mainnet', 'base-sepolia'],
      timestamp: Date.now(),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'base-sepolia';
    const endpoints = RPC_ENDPOINTS[network] || RPC_ENDPOINTS['base-sepolia'];

    const body = await request.json();

    // Check server-side cache for fast idempotent read responses (10s TTL)
    const cacheKey = getCacheKey(network, body);
    const now = Date.now();
    if (cacheKey) {
      const cached = serverRpcCache.get(cacheKey);
      if (cached && cached.expiry > now) {
        return NextResponse.json(
          { ...cached.data, id: body?.id ?? cached.data?.id },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'X-APay-RPC-Cache': 'HIT',
            },
          },
        );
      }
    }

    // Sanitize eth_getLogs to guarantee no block range overflow (max 400 blocks)
    if (!Array.isArray(body) && body?.method === 'eth_getLogs' && body?.params?.[0]) {
      const filter = body.params[0];
      if (filter.fromBlock && filter.fromBlock !== 'latest' && filter.fromBlock !== 'earliest') {
        try {
          const from = BigInt(filter.fromBlock);
          const to =
            filter.toBlock && filter.toBlock !== 'latest' ? BigInt(filter.toBlock) : from + 400n;
          if (to - from > 400n) {
            filter.fromBlock = `0x${(to - 400n).toString(16)}`;
          }
        } catch {
          // If parse fails, leave as is
        }
      }
    }

    // Try upstreams with automatic failover
    let lastError: any = null;
    let responseData: any = null;

    for (const rpcUrl of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const upstreamRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'APay-RPC-Relay/1.0',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          responseData = data;

          // Save to bounded server cache if read-only
          if (cacheKey && data && !data.error) {
            setBoundedCache(cacheKey, data, 10_000);
          }
          break;
        }

        // If rate limited or server error, continue to next fallback
        lastError = new Error(`Upstream ${rpcUrl} returned HTTP ${upstreamRes.status}`);
      } catch (err: any) {
        lastError = err;
      }
    }

    if (responseData) {
      return NextResponse.json(responseData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-APay-RPC-Cache': 'MISS',
        },
      });
    }

    // If all upstreams failed, return JSON-RPC error format
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id || 1,
        error: {
          code: -32603,
          message: `All upstream Base RPC endpoints temporarily exhausted: ${lastError?.message || 'Timeout'}`,
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: `Internal RPC relay error: ${err?.message || 'Unknown'}`,
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
