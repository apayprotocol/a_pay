import { NextResponse } from 'next/server';
import { type DomainEscrowRecord, domainEscrowStore } from '@/lib/domain-escrow-store';
import { canonicalizeDomain } from '@/lib/registry-store';
import { isPlaceholderOrDemoDomain } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, network = 'base-sepolia' } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "domain" parameter in request body' },
        { status: 400 },
      );
    }

    const cleanDomain = canonicalizeDomain(domain);
    if (!cleanDomain || cleanDomain.length < 3) {
      return NextResponse.json(
        { error: 'Domain must be a valid hostname or web URL' },
        { status: 400 },
      );
    }

    if (isPlaceholderOrDemoDomain(cleanDomain)) {
      return NextResponse.json(
        {
          error:
            'Placeholder or demo domains (e.g. example.com, yourdomain.com) cannot have real unclaimed escrow balances. Please enter your live website or API domain.',
        },
        { status: 400 },
      );
    }

    const targetNet = network === 'base-mainnet' ? 'base-mainnet' : 'base-sepolia';
    const escrowRecord: DomainEscrowRecord = await domainEscrowStore.getEscrow(
      cleanDomain,
      targetNet,
    );

    // Extract bare hostname for DNS record guide
    let bareHost = cleanDomain;
    try {
      if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
        bareHost = new URL(cleanDomain).hostname;
      } else {
        bareHost = cleanDomain.split('/')[0].split(':')[0];
      }
    } catch {
      bareHost = cleanDomain.split('/')[0].split(':')[0];
    }

    return NextResponse.json({
      success: true,
      domain: escrowRecord.domain,
      canonicalDomain: escrowRecord.canonicalDomain,
      domainHash: escrowRecord.domainHash,
      status: escrowRecord.status,
      accruedApay: escrowRecord.accruedApay,
      accruedUsdc: escrowRecord.accruedUsdc,
      totalRequestsBlocked: escrowRecord.totalRequestsBlocked,
      verificationToken: escrowRecord.verificationToken,
      claimedBy: escrowRecord.claimedBy || null,
      claimedAt: escrowRecord.claimedAt || null,
      claimTxHash: escrowRecord.claimTxHash || null,
      network: escrowRecord.network,
      dnsChallenge: {
        recordType: 'TXT',
        name: `_apay-challenge.${bareHost}`,
        fallbackName: '@',
        value: `apay-verification=${escrowRecord.verificationToken}`,
        walletPattern: 'apay-claim=<your-wallet-address>',
      },
      httpChallenge: {
        path: '/.well-known/apay-claim.txt',
        expectedContent: escrowRecord.verificationToken,
        alternativePath: '/.apay/status',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: `Domain lookup failed: ${message}` }, { status: 500 });
  }
}
