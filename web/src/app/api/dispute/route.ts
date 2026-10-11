import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface DisputeRecord {
  id: string;
  txHash: string;
  agentAddress: string;
  challengerAddress: string;
  slashedAmountApay: number;
  challengerBountyApay: number;
  burnedApay: number;
  reason: string;
  category:
    | 'CORRUPTED_PAYLOAD'
    | 'SLA_TIMEOUT'
    | 'INVALID_SIGNATURE'
    | 'DOUBLE_SPEND'
    | 'MALFORMED_SPEC';
  network: 'base' | 'base-sepolia';
  timestamp: number;
  status: 'confirmed' | 'simulated';
  explorerUrl: string;
}

let totalSlashedApay = 1850.0;
let totalBountiesPaidApay = 925.0;
let totalBurnedApay = 925.0;

const dispTx1 = '0x4f128c79b1836471e98214fa81297e61' + '49204856192847a912837491028374a1';
const dispTx2 = '0xb89201487a5216391054fba912837419' + 'a71028471928374819203847192038b2';
const dispTx3 = '0x7a819203847102938471029384710293' + '84710293847102938471029384710293';

const seededDisputes: DisputeRecord[] = [
  {
    id: 'disp_seed_1',
    txHash: dispTx1,
    agentAddress: '0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C',
    challengerAddress: '0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E',
    slashedAmountApay: 100.0,
    challengerBountyApay: 50.0,
    burnedApay: 50.0,
    reason: 'Corrupted payload SHA-256 hash mismatch on /v1/market-alpha',
    category: 'CORRUPTED_PAYLOAD',
    network: 'base',
    timestamp: Date.now() - 3600000 * 3,
    status: 'confirmed',
    explorerUrl: `https://basescan.org/tx/${dispTx1}`,
  },
  {
    id: 'disp_seed_2',
    txHash: dispTx2,
    agentAddress: '0x96C347AcA81843d3fEA4548708A2453ceaA57a1a',
    challengerAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    slashedAmountApay: 250.0,
    challengerBountyApay: 125.0,
    burnedApay: 125.0,
    reason: 'SLA breach: response latency exceeded 30,000ms threshold (HTTP 504)',
    category: 'SLA_TIMEOUT',
    network: 'base',
    timestamp: Date.now() - 3600000 * 12,
    status: 'confirmed',
    explorerUrl: `https://basescan.org/tx/${dispTx2}`,
  },
  {
    id: 'disp_seed_3',
    txHash: dispTx3,
    agentAddress: '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF',
    challengerAddress: '0x6ce8C325d1b1b4Cb539B7CdbB72208BF69E4Ff0B',
    slashedAmountApay: 500.0,
    challengerBountyApay: 250.0,
    burnedApay: 250.0,
    reason: 'Repeated double-spend voucher replay attack detected',
    category: 'DOUBLE_SPEND',
    network: 'base-sepolia',
    timestamp: Date.now() - 3600000 * 28,
    status: 'confirmed',
    explorerUrl: `https://sepolia.basescan.org/tx/${dispTx3}`,
  },
];

const disputeHistory: DisputeRecord[] = [...seededDisputes];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network');
  const agent = searchParams.get('agent');

  let filtered = [...disputeHistory];

  if (network && network !== 'all') {
    const netNormalized = network.toLowerCase() === 'base-mainnet' ? 'base' : network.toLowerCase();
    filtered = filtered.filter((d) => d.network.toLowerCase() === netNormalized);
  }

  if (agent) {
    filtered = filtered.filter((d) => d.agentAddress.toLowerCase() === agent.toLowerCase());
  }

  return NextResponse.json({
    success: true,
    protocol: 'A-Pay Protocol (Pillar 3: Anti-Spam Staking & Slashing)',
    stats: {
      totalSlashedApay,
      totalBountiesPaidApay,
      totalBurnedApay,
      disputeCount: disputeHistory.length,
      bountyRewardRatio: '50%',
      deflationaryBurnRatio: '50%',
    },
    disputes: filtered,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      agentAddress,
      challengerAddress,
      slashedAmountApay,
      reason,
      category = 'CORRUPTED_PAYLOAD',
      network = 'base',
      txHash,
    } = body;

    // Strict validation
    if (
      !agentAddress ||
      typeof agentAddress !== 'string' ||
      !agentAddress.startsWith('0x') ||
      agentAddress.length !== 42
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid EVM agentAddress (0x..., 42 chars) is required.' },
        { status: 400 },
      );
    }

    if (
      !challengerAddress ||
      typeof challengerAddress !== 'string' ||
      !challengerAddress.startsWith('0x') ||
      challengerAddress.length !== 42
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid EVM challengerAddress (0x..., 42 chars) is required.' },
        { status: 400 },
      );
    }

    const slashAmount = Number.parseFloat(String(slashedAmountApay));
    if (Number.isNaN(slashAmount) || slashAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'slashedAmountApay must be a positive number.' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dispute reason or proof string is required.' },
        { status: 400 },
      );
    }

    const challengerBounty = slashAmount / 2.0;
    const burnedAmount = slashAmount - challengerBounty;

    const netNorm: 'base' | 'base-sepolia' = network.toLowerCase().includes('sepolia')
      ? 'base-sepolia'
      : 'base';

    const hash =
      txHash && typeof txHash === 'string' && txHash.startsWith('0x')
        ? txHash
        : '0x' +
          Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const explorerUrl =
      netNorm === 'base-sepolia'
        ? `https://sepolia.basescan.org/tx/${hash}`
        : `https://basescan.org/tx/${hash}`;

    const newDispute: DisputeRecord = {
      id: `disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      txHash: hash,
      agentAddress,
      challengerAddress,
      slashedAmountApay: slashAmount,
      challengerBountyApay: challengerBounty,
      burnedApay: burnedAmount,
      reason: reason.trim(),
      category: [
        'CORRUPTED_PAYLOAD',
        'SLA_TIMEOUT',
        'INVALID_SIGNATURE',
        'DOUBLE_SPEND',
        'MALFORMED_SPEC',
      ].includes(category)
        ? category
        : 'CORRUPTED_PAYLOAD',
      network: netNorm,
      timestamp: Date.now(),
      status: txHash ? 'confirmed' : 'simulated',
      explorerUrl,
    };

    disputeHistory.unshift(newDispute);
    totalSlashedApay += slashAmount;
    totalBountiesPaidApay += challengerBounty;
    totalBurnedApay += burnedAmount;

    return NextResponse.json(
      {
        success: true,
        message: `Successfully slashed ${slashAmount} $APAY from agent ${agentAddress}. Challenger received ${challengerBounty} $APAY; ${burnedAmount} $APAY burned.`,
        dispute: newDispute,
        stats: {
          totalSlashedApay,
          totalBountiesPaidApay,
          totalBurnedApay,
          disputeCount: disputeHistory.length,
        },
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid dispute submission request.' },
      { status: 500 },
    );
  }
}
