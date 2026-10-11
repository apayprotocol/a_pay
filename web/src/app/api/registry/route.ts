import { NextResponse } from 'next/server';
import { recoverMessageAddress } from 'viem';
import { CONTRACTS } from '@/config/contracts';
import { canonicalizeDomain, type MerchantRecord, registryStore } from '@/lib/registry-store';
import { isAuthorizedFounder, isPlaceholderOrDemoDomain } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet, targetDomain, price, network, version } = body;

    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "wallet" parameter' }, { status: 400 });
    }

    if (!targetDomain || isPlaceholderOrDemoDomain(targetDomain)) {
      return NextResponse.json(
        {
          error:
            'Cannot register placeholder or demo domain in the Global Protocol Registry. Please provide your live website or API domain.',
        },
        { status: 400 },
      );
    }

    // Clean target domain canonically
    const sanitizedDomain = canonicalizeDomain(targetDomain || 'unknown');

    const now = Date.now();
    const existingList = await registryStore.getMerchants();
    const existing = existingList.find(
      (m) =>
        m.wallet.toLowerCase() === wallet.toLowerCase() &&
        canonicalizeDomain(m.targetDomain).toLowerCase() === sanitizedDomain.toLowerCase(),
    );

    const record: MerchantRecord = {
      id: existing ? existing.id : `mch_${now}_${Math.floor(Math.random() * 1000)}`,
      wallet: wallet.toLowerCase(),
      targetDomain: sanitizedDomain,
      price: price || existing?.price || '0.001 USDC',
      network: network || existing?.network || 'base',
      version: version || existing?.version || '0.1.5',
      firstSeen: existing ? existing.firstSeen : now,
      lastHeartbeat: now,
      status: 'online',
    };

    await registryStore.saveMerchant(record);
    const stats = await registryStore.getStats();

    return NextResponse.json({
      success: true,
      registered: true,
      totalRegistered: stats.count,
      onlineCount: stats.onlineCount,
      storageEngine: stats.storageEngine,
      message: 'Gateway heartbeat synchronized with persistent A-Pay Protocol Registry.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: `Registry heartbeat error: ${message}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || undefined;

    // 1. Health / liveness check for multi-region load balancers & monitoring
    if (searchParams.get('health') === 'true') {
      const stats = await registryStore.getStats(network);
      return NextResponse.json({
        status: 'healthy',
        protocol: 'A-Pay',
        network: network || 'all',
        activeMerchantsCount: stats.count,
        onlineMerchantsCount: stats.onlineCount,
        storageEngine: stats.storageEngine,
        timestamp: Date.now(),
      });
    }

    // 2. Public Service Discovery for Autonomous AI Agents & Marketplace Explorer (Pillar 1.1)
    if (
      searchParams.get('public') === 'true' ||
      searchParams.has('category') ||
      searchParams.has('search') ||
      searchParams.has('bonded')
    ) {
      const categoryParam = searchParams.get('category');
      const searchParam = searchParams.get('search')?.toLowerCase();
      const bondedParam = searchParams.get('bonded') === 'true';

      interface EndpointItem {
        id: string;
        name: string;
        provider: string;
        targetDomain: string;
        wallet?: string;
        price: string;
        network: string;
        version: string;
        category: string;
        description: string;
        latencyMs: number;
        uptimePct: number;
        bonded: boolean;
        isBonded?: boolean;
        status: 'online' | 'idle';
        tags: string[];
        samplePayload: any;
      }

      const curatedEndpoints: EndpointItem[] = [
        {
          id: 'm2m_alpha_intel',
          name: 'AlphaMarket Institutional Intelligence',
          provider: 'AlphaMarket Prime',
          targetDomain: 'https://api.alphamarket.io/v1/alpha',
          wallet: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
          price: '$0.001 USDC',
          network: 'base',
          version: '0.1.8',
          category: 'FINANCE',
          description:
            'Real-time institutional order-flow analytics, dark-pool prints, and ETF inflow telemetry.',
          latencyMs: 38,
          uptimePct: 99.98,
          bonded: true,
          status: 'online' as const,
          tags: ['Order Flow', 'Institutional', 'BTC', 'Macro'],
          samplePayload: {
            source: 'AlphaMarket Institutional Feed',
            event: 'BTC ETF Inflow Alert',
            net_inflow_usd: '+$450,000,000',
            sentiment: 'Highly Bullish',
            timestamp: Date.now(),
          },
        },
        {
          id: 'm2m_deepseek_v3',
          name: 'DeepSeek-V3 Reasoning API',
          provider: 'DeepSeek AI Lab',
          targetDomain: 'https://router.apay-network.vercel.app/v1/deepseek-v3',
          wallet: '0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C',
          price: '$0.002 USDC',
          network: 'base',
          version: '0.1.8',
          category: 'AI_INFERENCE',
          description:
            'Ultra low-latency MoE reasoning completions paid per query via HTTP 402 EIP-712 vouchers.',
          latencyMs: 142,
          uptimePct: 99.95,
          bonded: true,
          status: 'online' as const,
          tags: ['LLM', 'Reasoning', 'MoE', 'Autonomous'],
          samplePayload: {
            model: 'deepseek-v3',
            prompt_tokens: 32,
            completion_tokens: 128,
            output: 'Deterministic execution: Base L2 EIP-712 signature verified in 12ms.',
            cost_usdc: 0.002,
          },
        },
        {
          id: 'm2m_web_extract',
          name: 'Multi-Agent Web Extractor Pro',
          provider: 'AgentNet Scraper',
          targetDomain: 'https://extract.agentnet.ai/v1/crawl',
          wallet: '0x96C347AcA81843d3fEA4548708A2453ceaA57a1a',
          price: '$0.0005 USDC',
          network: 'base',
          version: '0.1.8',
          category: 'SCRAPING',
          description:
            'Headless Chromium proxy with dynamic anti-bot bypass and Markdown DOM conversion.',
          latencyMs: 84,
          uptimePct: 99.9,
          bonded: true,
          status: 'online' as const,
          tags: ['DOM', 'Crawl', 'Markdown', 'Headless'],
          samplePayload: {
            url: 'https://base.org',
            title: 'Base | L2 Ethereum Network',
            word_count: 1420,
            content_type: 'text/markdown',
            status: '200 OK',
          },
        },
        {
          id: 'm2m_aero_radar',
          name: 'Aerodrome DEX Whale Radar',
          provider: 'Aerodrome Analytics',
          targetDomain: 'https://radar.aerodrome-analytics.io/v1/whales',
          wallet: '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF',
          price: '5.0 $APAY',
          network: 'base',
          version: '0.1.8',
          category: 'CRYPTO',
          description:
            'Real-time WebSocket and HTTP 402 monitoring of >$100k swaps on Base Aerodrome pools.',
          latencyMs: 45,
          uptimePct: 99.99,
          bonded: true,
          status: 'online' as const,
          tags: ['DEX', 'Aerodrome', 'Whale', 'Swaps'],
          samplePayload: {
            pool: '0x6933dd2B7D72d8561005E475AFa147E47A3c7777',
            pair: 'WETH / $APAY',
            swap_size_usdc: 145000,
            direction: 'BUY',
            price_impact: '-0.24%',
          },
        },
        {
          id: 'm2m_code_audit',
          name: 'CodeAudit Smart Contract Scanner',
          provider: 'SecureSwarm AI',
          targetDomain: 'https://audit.secureswarm.dev/v1/inspect',
          wallet: '0x6ce8C325d1b1b4Cb539B7CdbB72208BF69E4Ff0B',
          price: '$0.005 USDC',
          network: 'base',
          version: '0.1.8',
          category: 'DEVTOOLS',
          description:
            'Automated Slither, Mythril, and AST security analysis for EVM contracts on Base.',
          latencyMs: 210,
          uptimePct: 99.85,
          bonded: true,
          status: 'online' as const,
          tags: ['Security', 'Audit', 'Solidity', 'AST'],
          samplePayload: {
            target_contract: '0xd08c8a337e5339d1c083e06d74a9265956ceea16',
            compiler: '0.8.28',
            findings: 0,
            grade: 'A+ (Production Ready)',
          },
        },
        {
          id: 'm2m_weather_iot',
          name: 'Global Climate & Doppler Satellite',
          provider: 'BaseMesh Sensors',
          targetDomain: 'https://weather.iot-apay.net/v1/current',
          wallet: '0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E',
          price: '2.0 $APAY',
          network: 'base-sepolia',
          version: '0.1.8',
          category: 'DATA_FEEDS',
          description:
            'High-frequency Doppler radar, atmospheric pressure, and oceanic temperature telemetry.',
          latencyMs: 62,
          uptimePct: 99.92,
          bonded: false,
          status: 'online' as const,
          tags: ['Weather', 'Satellite', 'Radar', 'IoT'],
          samplePayload: {
            station: 'BaseMesh Radar #14',
            temperature_c: 21.4,
            pressure_hpa: 1013.25,
            precipitation_probability: 0.05,
          },
        },
      ];

      const allMerchants = await registryStore.getMerchants(network);
      const dynamicServices = allMerchants
        .filter((m) => m.status === 'online')
        .map((m) => ({
          id: m.id,
          name: m.targetDomain.replace(/^https?:\/\//, '').split('/')[0] + ' M2M API',
          provider: m.wallet ? `${m.wallet.slice(0, 6)}...${m.wallet.slice(-4)}` : 'Gateway Node',
          targetDomain: m.targetDomain,
          wallet: m.wallet,
          price: m.price,
          network: m.network || 'base',
          version: m.version,
          category: 'DEVTOOLS',
          description: `HTTP 402 Paywalled M2M microservice registered via A-Pay Gateway (${m.version}).`,
          latencyMs: 50,
          uptimePct: 99.9,
          bonded: true,
          isBonded: true,
          status: m.status,
          tags: ['M2M', 'Gateway', 'EIP-712'],
          samplePayload: {
            endpoint: m.targetDomain,
            status: 'verified_claim',
            payer_credit_remaining: '$0.4990',
            data: 'Decrypted authenticated response content.',
          },
        }));

      // Combined unique by canonical targetDomain (excluding tombstoned / deleted services)
      const tombstones = await registryStore.getTombstones();
      const seenDomains = new Set<string>();
      const combined: EndpointItem[] = [];

      for (const c of curatedEndpoints) {
        const key = canonicalizeDomain(c.targetDomain).toLowerCase();
        if (!tombstones.has(key) && !seenDomains.has(key)) {
          seenDomains.add(key);
          combined.push({
            ...c,
            targetDomain: canonicalizeDomain(c.targetDomain),
          });
        }
      }

      for (const d of dynamicServices) {
        const key = canonicalizeDomain(d.targetDomain).toLowerCase();
        if (!tombstones.has(key) && !seenDomains.has(key)) {
          seenDomains.add(key);
          combined.push({
            ...d,
            targetDomain: canonicalizeDomain(d.targetDomain),
          });
        }
      }

      let filtered = combined;

      if (network && network !== 'all') {
        const netNorm = network.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.network.toLowerCase() === netNorm ||
            (netNorm === 'base-mainnet' && s.network === 'base'),
        );
      }

      if (categoryParam && categoryParam !== 'ALL') {
        const catNorm = categoryParam.toUpperCase();
        filtered = filtered.filter(
          (s) =>
            s.category.toUpperCase() === catNorm ||
            (catNorm === 'AI' && s.category.toUpperCase() === 'AI_INFERENCE') ||
            (catNorm === 'DEV' && s.category.toUpperCase() === 'DEVTOOLS'),
        );
      }

      if (searchParam) {
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(searchParam) ||
            s.targetDomain.toLowerCase().includes(searchParam) ||
            s.description.toLowerCase().includes(searchParam) ||
            s.tags.some((t) => t.toLowerCase().includes(searchParam)),
        );
      }

      if (bondedParam) {
        filtered = filtered.filter((s) => s.bonded === true);
      }

      return NextResponse.json({
        success: true,
        network: network || 'all',
        count: filtered.length,
        services: filtered,
        categories: [
          'ALL',
          'FINANCE',
          'AI_INFERENCE',
          'SCRAPING',
          'CRYPTO',
          'DEVTOOLS',
          'DATA_FEEDS',
        ],
        timestamp: Date.now(),
      });
    }

    // 3. Founder-only Administrative Telemetry
    const isFounder = isAuthorizedFounder(request, CONTRACTS.founder);

    if (!isFounder) {
      return NextResponse.json(
        {
          error:
            'Access Restricted. Global Merchant Registry telemetry is strictly reserved for verified Protocol Admin.',
          count: 0,
          merchants: [],
        },
        { status: 403 },
      );
    }

    const merchantsList = (await registryStore.getMerchants(network)).filter(
      (m) => !isPlaceholderOrDemoDomain(m.targetDomain),
    );

    return NextResponse.json({
      success: true,
      founderAuthorized: true,
      network: network || 'all',
      totalCount: merchantsList.length,
      merchants: merchantsList,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json(
      { error: `Failed to fetch merchant registry: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDomain = searchParams.get('targetDomain');
    const targetWallet = searchParams.get('targetWallet') || '';
    const purgeStale = searchParams.get('purgeStale') === 'true';

    // 1. Check Bearer secret (if present)
    const adminSecret = process.env.ADMIN_SECRET || process.env.FOUNDER_SECRET_KEY;
    const authHeader = request.headers.get('authorization') || '';
    const isBearerAdmin =
      Boolean(adminSecret) &&
      (authHeader === `Bearer ${adminSecret}` ||
        request.headers.get('x-admin-key') === adminSecret);

    // 2. Cryptographic signature check (personal_sign)
    const signature = request.headers.get('x-signature') as `0x${string}` | null;
    const rawMessage = request.headers.get('x-message');
    const claimedWallet = request.headers.get('x-wallet-address') || '';

    let verifiedSigner: string | null = null;
    if (signature && rawMessage) {
      try {
        const decodedMessage = decodeURIComponent(rawMessage);
        const signer = await recoverMessageAddress({
          message: decodedMessage,
          signature,
        });
        if (signer && signer.toLowerCase() === claimedWallet.toLowerCase()) {
          verifiedSigner = signer.toLowerCase();
        }
      } catch {
        // Invalid signature
      }
    }

    // 3. Authorization check
    const isVerifiedFounder =
      (verifiedSigner && verifiedSigner === CONTRACTS.founder.toLowerCase()) ||
      Boolean(isBearerAdmin);
    const isVerifiedOwner =
      Boolean(verifiedSigner) &&
      Boolean(targetWallet) &&
      verifiedSigner === targetWallet.toLowerCase();

    // Dev/Test fallback (strictly non-production)
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const isDevFounder =
      isDevOrTest &&
      claimedWallet &&
      claimedWallet.toLowerCase() === CONTRACTS.founder.toLowerCase();
    const isDevOwner =
      isDevOrTest &&
      claimedWallet &&
      targetWallet &&
      claimedWallet.toLowerCase() === targetWallet.toLowerCase();

    const authorized = isVerifiedFounder || isVerifiedOwner || isDevFounder || isDevOwner;

    if (!authorized) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Deletion requires cryptographic signature verification from the Founder wallet or the Merchant wallet that registered this domain.',
        },
        { status: 403 },
      );
    }

    if (purgeStale) {
      if (!isVerifiedFounder && !isDevFounder && !isBearerAdmin) {
        return NextResponse.json(
          { error: 'Purging idle merchants requires Founder authorization.' },
          { status: 403 },
        );
      }
      const purgedCount = await registryStore.purgeStaleMerchants();
      return NextResponse.json({
        success: true,
        purgedCount,
        message: `Purged ${purgedCount} idle/stale merchant records from registry.`,
      });
    }

    if (!targetDomain) {
      return NextResponse.json({ error: 'Missing targetDomain parameter' }, { status: 400 });
    }

    await registryStore.deleteMerchant(targetWallet, canonicalizeDomain(targetDomain));
    return NextResponse.json({
      success: true,
      message: `Deleted merchant entry for ${canonicalizeDomain(targetDomain)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: `Failed to delete merchant: ${message}` }, { status: 500 });
  }
}
