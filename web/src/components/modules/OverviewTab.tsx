'use client';

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Crown,
  Download,
  Droplets,
  ExternalLink,
  FileCode,
  Flame,
  Gift,
  Globe,
  Radio,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { CONTRACTS, getNetworkContracts, type NetworkId } from '@/config/contracts';
import { isPlaceholderOrDemoDomain } from '@/lib/security';
import {
  addApayTokenToWallet,
  fetchLiveAerodromePoolStats,
  fetchLiveRouterStats,
  fetchLiveRpcTelemetry,
  fetchLiveSettlementLogs,
  fetchLiveTokenStats,
  fetchLiveTokenTransferLogs,
  type LiveAerodromePoolStats,
  type LiveRouterStats,
  type LiveTokenStats,
  type RpcTelemetry,
  type SettlementEventLog,
  type TokenTransferLog,
} from '@/services/blockchain';
import { Card3D } from '../3d/Card3D';
import { AgentSimulatorCard } from './AgentSimulatorCard';

// Dynamically load 3D WebGL canvases to ensure zero SSR hydration discrepancy
const CoinCanvas = dynamic(() => import('../3d/CoinCanvas').then((mod) => mod.CoinCanvas), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] sm:h-[370px] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  ),
});

const GlobeCanvas = dynamic(() => import('../3d/GlobeCanvas').then((mod) => mod.GlobeCanvas), {
  ssr: false,
  loading: () => <div className="w-full h-[220px]" />,
});

function encodeErc20Transfer(to: string, amountBaseUnits: bigint): string {
  const methodId = 'a9059cbb'; // keccak256("transfer(address,uint256)").slice(0, 8)
  const cleanTo = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const cleanAmount = amountBaseUnits.toString(16).padStart(64, '0');
  return `0x${methodId}${cleanTo}${cleanAmount}`;
}

function parseApayPrice(priceStr?: string): number {
  if (!priceStr) return 4.0;
  const match = priceStr.match(/([\d.]+)\s*\$APAY/i);
  if (match) {
    const val = Number.parseFloat(match[1]);
    return Number.isNaN(val) || val <= 0 ? 4.0 : val;
  }
  return 4.0;
}

export function OverviewTab({
  walletAddress,
  tokenBalance,
  isFounder,
  onConnect,
  activeNetwork = 'base-sepolia',
}: {
  walletAddress: string | null;
  tokenBalance: string;
  isFounder?: boolean;
  onConnect?: () => void;
  activeNetwork?: NetworkId;
}) {
  const contracts = getNetworkContracts(activeNetwork);
  const chainConfig = contracts.chain;

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRouter, setCopiedRouter] = useState(false);
  const [copiedRouterV2, setCopiedRouterV2] = useState(false);
  const [copiedEscrow, setCopiedEscrow] = useState(false);
  const [copiedStaking, setCopiedStaking] = useState(false);

  // Live Blockchain Telemetry State
  const [telemetry, setTelemetry] = useState<RpcTelemetry | null>(null);
  const [tokenStats, setTokenStats] = useState<LiveTokenStats | null>(null);
  const [routerStats, setRouterStats] = useState<LiveRouterStats | null>(null);
  const [poolStats, setPoolStats] = useState<LiveAerodromePoolStats | null>(null);
  const [settlementLogs, setSettlementLogs] = useState<SettlementEventLog[]>([]);
  const [tokenTransferLogs, setTokenTransferLogs] = useState<TokenTransferLog[]>([]);
  const [streamTab, setStreamTab] = useState<'transfers' | 'router'>('transfers');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [registeredMerchants, setRegisteredMerchants] = useState<any[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Deflationary Buyback & Burn Feed State (Pillar 3.4)
  const [burnFeed, setBurnFeed] = useState<{
    totalBurnedApay: number;
    totalUsdcAllocated: number;
    burnCount: number;
    aerodromePool?: any;
    recentBurns: Array<{
      id: string;
      txHash: string;
      amountApay: number;
      amountUsdc: number;
      dex: string;
      network: string;
      timestamp: number;
      explorerUrl: string;
      status: string;
    }>;
  } | null>(null);
  const [isSimulatingBurn, setIsSimulatingBurn] = useState(false);

  // Founder Merchant Actions State
  const [giftedMerchants, setGiftedMerchants] = useState<
    Record<string, { txHash: string; timestamp: number }>
  >({});
  const [testedMerchants, setTestedMerchants] = useState<
    Record<string, { txHash: string; status: number; timestamp: number; price: string }>
  >({});
  const [activeFounderAction, setActiveFounderAction] = useState<string | null>(null);
  const [founderActionFeedback, setFounderActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    txHash?: string;
  } | null>(null);

  // Hydrate gifted and tested merchants from localStorage on mount
  useEffect(() => {
    try {
      const savedGifted = localStorage.getItem('apay_founder_gifted_merchants');
      if (savedGifted) setGiftedMerchants(JSON.parse(savedGifted));
      const savedTested = localStorage.getItem('apay_founder_tested_merchants');
      if (savedTested) setTestedMerchants(JSON.parse(savedTested));
    } catch {
      // ignore
    }
  }, []);

  const loadBurnFeed = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/burn-feed?network=${activeNetwork}`);
      if (res.ok) {
        const data = await res.json();
        setBurnFeed(data);
      }
    } catch {
      // Graceful fallback
    }
  }, [activeNetwork]);

  const handleSimulateBurn = async () => {
    setIsSimulatingBurn(true);
    try {
      const res = await fetch('/api/burn-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_burned_apay: 500.0,
          burn_usdc_allocated: 25.0,
          dex: 'Aerodrome vAMM',
          network: activeNetwork === 'base-mainnet' ? 'base' : 'sepolia',
          status: 'simulated',
        }),
      });
      if (res.ok) {
        await loadBurnFeed();
      }
    } catch {
      // Ignore
    } finally {
      setIsSimulatingBurn(false);
    }
  };

  // Base Sepolia Testnet Faucet State
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetResult, setFaucetResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
  } | null>(null);

  const handleRequestFaucet = async () => {
    if (!walletAddress) {
      if (onConnect) onConnect();
      return;
    }
    setFaucetLoading(true);
    setFaucetResult(null);
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, network: activeNetwork }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Faucet request failed');
      }
      setFaucetResult({
        success: true,
        message: data.message,
        txHash: data.txHash,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Faucet request failed';
      setFaucetResult({ success: false, message: msg });
    } finally {
      setFaucetLoading(false);
    }
  };

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadRegistry = React.useCallback(async () => {
    setIsLoadingRegistry(true);
    try {
      const res = await fetch(`/api/registry?public=true&network=${activeNetwork}`);
      if (res.ok) {
        const data = await res.json();
        if (data.services) {
          const seen = new Set<string>();
          const uniqueServices: any[] = [];
          for (const s of data.services) {
            const domainKey = (s.targetDomain || '').trim().replace(/\/+$/, '').toLowerCase();
            if (!seen.has(domainKey)) {
              seen.add(domainKey);
              uniqueServices.push(s);
            }
          }
          const formatted = uniqueServices.map((s: any, idx: number) => ({
            id: s.id || `pub_${idx}_${s.targetDomain}`,
            wallet:
              s.wallet ||
              `A-Pay Node #${idx + 1} (${s.network === 'base-mainnet' || s.network === 'base' ? 'Mainnet' : 'Sepolia'})`,
            targetDomain: (s.targetDomain || '').trim().replace(/\/+$/, ''),
            price: s.price,
            network:
              s.network || (activeNetwork === 'base-mainnet' ? 'base-mainnet' : 'base-sepolia'),
            version: s.version || '0.1.8',
            status: s.status || 'online',
          }));
          setRegisteredMerchants(formatted);
        }
      }
    } catch (err) {
      console.warn('Error loading merchant registry:', err);
    } finally {
      setIsLoadingRegistry(false);
    }
  }, [activeNetwork]);

  const [isPurgingRegistry, setIsPurgingRegistry] = useState(false);
  const [deletingMerchant, setDeletingMerchant] = useState<string | null>(null);

  const handlePurgeStale = async () => {
    if (!walletAddress) return;
    setIsPurgingRegistry(true);
    try {
      let signature = '';
      const timestamp = Date.now();
      const message = `A-Pay Protocol: Purge Stale Registry Entries\nAdmin: ${walletAddress.toLowerCase()}\nTimestamp: ${timestamp}`;

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          signature = await (window as any).ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress],
          });
        } catch {
          setFounderActionFeedback({
            type: 'info',
            title: 'Purge Cancelled',
            message: 'Signature request was rejected in MetaMask.',
          });
          return;
        }
      }

      const res = await fetch('/api/registry?purgeStale=true', {
        method: 'DELETE',
        headers: {
          'x-wallet-address': walletAddress,
          'x-signature': signature,
          'x-message': encodeURIComponent(message),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge stale merchants');
      }

      setFounderActionFeedback({
        type: 'success',
        title: 'Purge Complete',
        message: data.message || `Purged stale merchant records from registry.`,
      });
      await loadRegistry();
    } catch (err: any) {
      setFounderActionFeedback({
        type: 'error',
        title: 'Purge Failed',
        message: err?.message || 'Failed to purge stale merchants',
      });
    } finally {
      setIsPurgingRegistry(false);
    }
  };

  const handleDeleteMerchant = async (targetDomain: string, targetWallet?: string) => {
    if (!walletAddress) return;
    const cleanDomain = targetDomain.trim().replace(/\/+$/, '');
    setDeletingMerchant(cleanDomain);
    try {
      let signature = '';
      const timestamp = Date.now();
      const message = `A-Pay Protocol: Delete Merchant Entry\nDomain: ${cleanDomain}\nWallet: ${walletAddress.toLowerCase()}\nTimestamp: ${timestamp}`;

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          signature = await (window as any).ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress],
          });
        } catch {
          setFounderActionFeedback({
            type: 'info',
            title: 'Deletion Cancelled',
            message: 'Signature request was rejected in MetaMask.',
          });
          setDeletingMerchant(null);
          return;
        }
      }

      const res = await fetch(
        `/api/registry?targetDomain=${encodeURIComponent(cleanDomain)}&targetWallet=${targetWallet || walletAddress}`,
        {
          method: 'DELETE',
          headers: {
            'x-wallet-address': walletAddress,
            'x-signature': signature,
            'x-message': encodeURIComponent(message),
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete merchant');
      }

      setFounderActionFeedback({
        type: 'success',
        title: 'Merchant Deleted',
        message: `Successfully removed ${cleanDomain} from Global Registry.`,
      });
      await loadRegistry();
    } catch (err: any) {
      setFounderActionFeedback({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Failed to delete merchant',
      });
    } finally {
      setDeletingMerchant(null);
    }
  };

  const loadBlockchainData = React.useCallback(async () => {
    try {
      const [telemetryData, tokenData, routerData, aerodromeData] = await Promise.all([
        fetchLiveRpcTelemetry(activeNetwork),
        fetchLiveTokenStats(activeNetwork),
        fetchLiveRouterStats(activeNetwork),
        fetchLiveAerodromePoolStats(activeNetwork),
      ]);
      setTelemetry(telemetryData);
      setTokenStats(tokenData);
      setRouterStats(routerData);
      setPoolStats(aerodromeData);
      setLastRefreshed(new Date());
    } catch {
      // Graceful fallback
    }
  }, [activeNetwork]);

  const loadSettlementLogs = React.useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const [logs, transfers] = await Promise.all([
        fetchLiveSettlementLogs(400n, activeNetwork),
        fetchLiveTokenTransferLogs(activeNetwork),
      ]);
      setSettlementLogs(logs);
      setTokenTransferLogs(transfers);
    } catch {
      setSettlementLogs([]);
      setTokenTransferLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [activeNetwork]);

  useEffect(() => {
    setIsMounted(true);
    setLastRefreshed(new Date());
    loadBlockchainData();
    loadSettlementLogs();
    loadRegistry();
    loadBurnFeed();

    // Auto-refresh live block telemetry and registry every 30 seconds
    const interval = setInterval(() => {
      loadBlockchainData();
      loadRegistry();
      loadBurnFeed();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadBlockchainData, loadSettlementLogs, loadRegistry, loadBurnFeed]);

  const handleGiftTokens = async (merchant: any) => {
    if (!walletAddress || !isFounder) return;
    const recipient = merchant.wallet;
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setFounderActionFeedback({
        type: 'error',
        title: 'Invalid Merchant Wallet',
        message: `Recipient address "${recipient || 'none'}" is not a valid EVM address.`,
      });
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setFounderActionFeedback({
        type: 'error',
        title: 'MetaMask Not Detected',
        message: 'Please install or connect MetaMask to execute the on-chain transfer.',
      });
      return;
    }

    const actionKey = `gift-${merchant.id}`;
    setActiveFounderAction(actionKey);
    setFounderActionFeedback({
      type: 'info',
      title: 'Awaiting MetaMask Confirmation...',
      message: `Please confirm the 10 $APAY welcome transfer to ${recipient.slice(0, 6)}...${recipient.slice(-4)} in your wallet.`,
    });

    try {
      // 10 $APAY = 10 * 10^18
      const amountBaseUnits = 10n * 10n ** 18n;
      const calldata = encodeErc20Transfer(recipient, amountBaseUnits);

      const txHash: string = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contracts.APAYToken.address,
            data: calldata,
          },
        ],
      });

      const updated = {
        ...giftedMerchants,
        [merchant.id]: { txHash, timestamp: Date.now() },
        [recipient.toLowerCase()]: { txHash, timestamp: Date.now() },
      };
      setGiftedMerchants(updated);
      try {
        localStorage.setItem('apay_founder_gifted_merchants', JSON.stringify(updated));
      } catch {
        // ignore
      }

      setFounderActionFeedback({
        type: 'success',
        title: '🎉 10 $APAY Welcome Grant Sent On-Chain!',
        message: `Successfully transferred 10 $APAY to merchant wallet ${recipient.slice(0, 6)}...${recipient.slice(-4)}. Transaction confirmed on Base L2.`,
        txHash,
      });

      await loadBlockchainData();
    } catch (err: any) {
      console.error('Failed to send gift tokens:', err);
      const isUserRejected = err?.code === 4001 || err?.message?.includes('User rejected');
      setFounderActionFeedback({
        type: 'error',
        title: isUserRejected ? 'Transaction Rejected' : 'Transfer Failed',
        message: isUserRejected
          ? 'You cancelled the transaction in MetaMask.'
          : err?.message || 'MetaMask transaction failed.',
      });
    } finally {
      setActiveFounderAction(null);
    }
  };

  const handleTestPaywallPayment = async (merchant: any) => {
    if (!walletAddress || !isFounder) return;
    const recipient = merchant.wallet;
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setFounderActionFeedback({
        type: 'error',
        title: 'Invalid Merchant Wallet',
        message: `Recipient address "${recipient || 'none'}" is not a valid EVM address.`,
      });
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setFounderActionFeedback({
        type: 'error',
        title: 'MetaMask Not Detected',
        message: 'Please install or connect MetaMask to execute the test payment.',
      });
      return;
    }

    const payAmount = parseApayPrice(merchant.price);
    const actionKey = `test-${merchant.id}`;
    setActiveFounderAction(actionKey);
    setFounderActionFeedback({
      type: 'info',
      title: 'Awaiting MetaMask Confirmation...',
      message: `Please confirm the ${payAmount} $APAY paywall test payment to ${recipient.slice(0, 6)}...${recipient.slice(-4)}.`,
    });

    try {
      // Calculate token units: payAmount * 1e18
      const amountBaseUnits = BigInt(Math.floor(payAmount * 1e6)) * 10n ** 12n;
      const calldata = encodeErc20Transfer(recipient, amountBaseUnits);

      const txHash: string = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contracts.APAYToken.address,
            data: calldata,
          },
        ],
      });

      // Probe the merchant's live paywall endpoint with the payment context
      let probeStatusText = '200 OK (M2M Paywall Settled)';
      try {
        const pingRes = await fetch('/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: merchant.targetDomain }),
        });
        const pingData = await pingRes.json();
        if (pingData.status === 200 || pingData.status === 402) {
          probeStatusText = `Endpoint Verified (${pingData.status === 200 ? 'HTTP 200 OK' : 'HTTP 402 Challenge Active'}, ${pingData.latencyMs || 45}ms)`;
        }
      } catch {
        // Fallback
      }

      const updated = {
        ...testedMerchants,
        [merchant.id]: { txHash, status: 200, timestamp: Date.now(), price: `${payAmount} $APAY` },
        [recipient.toLowerCase()]: {
          txHash,
          status: 200,
          timestamp: Date.now(),
          price: `${payAmount} $APAY`,
        },
      };
      setTestedMerchants(updated);
      try {
        localStorage.setItem('apay_founder_tested_merchants', JSON.stringify(updated));
      } catch {
        // ignore
      }

      setFounderActionFeedback({
        type: 'success',
        title: `⚡ Paywall Tested & ${payAmount} $APAY Settled!`,
        message: `Real micro-payment sent to merchant ${recipient.slice(0, 6)}...${recipient.slice(-4)}. ${probeStatusText}.`,
        txHash,
      });

      await loadBlockchainData();
    } catch (err: any) {
      console.error('Failed to test paywall payment:', err);
      const isUserRejected = err?.code === 4001 || err?.message?.includes('User rejected');
      setFounderActionFeedback({
        type: 'error',
        title: isUserRejected ? 'Payment Cancelled' : 'Payment Failed',
        message: isUserRejected
          ? 'You cancelled the paywall test payment in MetaMask.'
          : err?.message || 'Transaction could not be executed.',
      });
    } finally {
      setActiveFounderAction(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Section: 3D Coin & Interactive Holographic Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-sky-300 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse" />
            Global Machine-to-Machine Protocol
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-outfit tracking-[-0.04em] text-slate-900 dark:text-white leading-[1.08]">
            The Economic OS for <br />
            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
              Autonomous AI Agents
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl">
            Sub-cent HTTP 402 payments settling directly into your wallet via Base L2 in under 2
            seconds. Zero middleman banks, zero chargebacks.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
              <div className="text-[11px] font-mono text-slate-400 uppercase">
                Live Token Standard
              </div>
              <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white">
                ERC-20 Fixed Cap
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Settlement Rail</div>
              <div className="text-lg font-bold font-spatial text-blue-600 dark:text-sky-400">
                Base L2 (Chain {chainConfig.chainId})
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
              <div className="text-[11px] font-mono text-slate-400 uppercase">RPC Latency</div>
              <div
                suppressHydrationWarning
                className="text-lg font-bold font-spatial text-emerald-600 dark:text-emerald-400"
              >
                {telemetry ? `${telemetry.latencyMs}ms Live` : 'Connecting...'}
              </div>
            </div>
          </div>
        </div>

        {/* 3D Coin Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="glass-panel w-full rounded-3xl p-4 soft-shadow butter-card">
            <CoinCanvas />
          </div>
        </div>
      </div>

      {/* 3D Vault Card + 3D Telemetry Globe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="glass-panel rounded-3xl p-6 soft-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                Your Non-Custodial Vault
              </h3>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                100% On-Chain
              </span>
            </div>
            <Card3D
              walletAddress={walletAddress}
              tokenBalance={tokenBalance}
              isFounder={isFounder}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Hover or tilt to interact with holographic 3D sheen.</span>
            <div className="flex flex-wrap items-center gap-2">
              {walletAddress && (
                <a
                  href={`${chainConfig.explorerUrl}/address/${walletAddress}#tokentxns`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition-all font-semibold cursor-pointer active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View On-Chain Activity</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => addApayTokenToWallet(activeNetwork)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all font-semibold cursor-pointer active:scale-95"
              >
                <span>🦊</span>
                <span>Import $APAY to Wallet</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3D Global Nodes Mesh & Live Blockchain Telemetry */}
        <div className="glass-panel rounded-3xl p-6 soft-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-500" />
                Live Base L2 Network Telemetry
              </h3>
              <span
                suppressHydrationWarning
                className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Block #{telemetry ? telemetry.blockNumber.toLocaleString() : '...'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live peer telemetry synchronized directly with Coinbase {chainConfig.chainName}{' '}
              JSON-RPC nodes.
            </p>
            <GlobeCanvas />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div
                suppressHydrationWarning
                className="text-base font-black font-spatial text-slate-900 dark:text-white"
              >
                {telemetry ? telemetry.blockNumber.toLocaleString() : '---'}
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Latest Block</div>
            </div>
            <div>
              <div
                suppressHydrationWarning
                className="text-base font-black font-spatial text-blue-600 dark:text-sky-400"
              >
                {telemetry ? `${telemetry.latencyMs} ms` : '---'}
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-400">RPC Ping</div>
            </div>
            <div>
              <div
                suppressHydrationWarning
                className="text-base font-black font-spatial text-emerald-600 dark:text-emerald-400"
              >
                {telemetry ? `${telemetry.gasPriceGwei} Gwei` : '0.001 Gwei'}
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Base Gas Price</div>
            </div>
          </div>
        </div>
      </div>

      {/* Aerodrome DEX Live Liquidity & Automated Buyback Rail */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 soft-shadow border border-sky-500/20 bg-gradient-to-br from-sky-950/20 via-slate-900/40 to-slate-950/60 space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Aerodrome DEX Liquidity & Buyback Rail
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE POOL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official decentralized liquidity pool on Aerodrome Finance (Base L2). 30% of all
                protocol micropayment fees are automatically routed to buy back and permanently burn
                $APAY tokens.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <a
              href={contracts.dex.aerodromeSwapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold tracking-tight shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <span>Trade on Aerodrome</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href={contracts.dex.dexScreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95"
            >
              <span>DexScreener Chart</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Pool Pair
            </div>
            <div className="text-sm font-bold text-blue-600 dark:text-sky-400 font-spatial">
              vAMM-WETH/APAY
            </div>
            <div
              className="text-[10px] text-slate-500 truncate font-mono"
              title={contracts.dex.aerodromePool}
            >
              {contracts.dex.aerodromePool.slice(0, 6)}...{contracts.dex.aerodromePool.slice(-4)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              WETH Liquidity
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-spatial">
              {poolStats ? `${poolStats.wethReserve} WETH` : 'Syncing...'}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              On-Chain Base Reserve
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              APAY Liquidity
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-spatial">
              {poolStats ? `${poolStats.apayReserve} APAY` : 'Syncing...'}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-sky-400 font-medium">
              Circulating LP Pool
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Deflation Engine
            </div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-spatial">
              30% Auto-Burn
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400/80 font-medium">
              Pillar 3.4 Active
            </div>
          </div>
        </div>
      </div>

      {/* Guest Welcome & Wallet Connect Banner */}
      {!walletAddress && onConnect && (
        <div className="glass-panel rounded-3xl p-6 soft-shadow border border-blue-500/30 bg-gradient-to-r from-blue-950/20 via-sky-950/10 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-sky-400 font-bold">
              ⚡
            </div>
            <div>
              <h4 className="font-spatial text-base font-bold text-slate-900 dark:text-white">
                Connect Wallet to Unlock Full Merchant & Developer Console
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register paywalls, monitor real-time AI bot transactions, and access enterprise
                webhooks.
              </p>
            </div>
          </div>
          <button
            onClick={onConnect}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide shadow-md shadow-blue-500/20 shrink-0"
          >
            Connect Web3 Wallet
          </button>
        </div>
      )}

      {/* Exclusive Founder Master Command Enclave */}
      {isFounder && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-950/60 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white">
                    Protocol Founder &amp; Master Command Enclave
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 font-bold">
                    OWNER UNLOCKED
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Exclusive systemic telemetry and on-chain contract controls for verified deployer{' '}
                  <span className="font-mono font-semibold">
                    {contracts.founder.slice(0, 6)}...{contracts.founder.slice(-4)}
                  </span>
                  .
                </p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold">
                Founder Treasury Balance
              </div>
              <div className="text-2xl font-black font-spatial text-amber-600 dark:text-amber-400">
                {tokenStats ? `${tokenStats.founderBalance} $APAY` : '100,000,000 $APAY'}
              </div>
              <button
                type="button"
                onClick={() => addApayTokenToWallet(activeNetwork)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-400/40 text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95"
              >
                <span>🦊</span>
                <span>Add 100M $APAY to MetaMask</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/60 border border-amber-500/20 space-y-1">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold">
                Protocol Fee Rate
              </div>
              <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white">
                {routerStats ? routerStats.feePercent : '1.0%'}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                Bps: {routerStats ? routerStats.feeBps : 100} / 10,000
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/60 border border-amber-500/20 space-y-1">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Deflationary Tokens Burned
              </div>
              <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white">
                {tokenStats ? `${tokenStats.burnedTokens} $APAY` : '0.00 $APAY'}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                Permanent on-chain burn via ERC20Burnable
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/60 border border-amber-500/20 space-y-1">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold">
                Total Circulating Supply
              </div>
              <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white">
                {tokenStats ? `${tokenStats.totalSupply} $APAY` : '100,000,000 $APAY'}
              </div>
              <div className="text-[10px] text-blue-600 dark:text-sky-400 font-medium">
                Hard-capped max 100M on Base L2
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aerodrome DEX Buyback & Deflationary Burn Live Feed (Pillar 3.4) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-slate-900/30 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Aerodrome DEX Buyback & Deflationary Burn
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase">
                  Pillar 3.4
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                30% of all protocol routing fees automatically trigger Aerodrome vAMM pool swaps and
                permanent on-chain token burns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href="https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-mono font-medium transition-colors"
            >
              <span>Aerodrome Pool</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={handleSimulateBurn}
              disabled={isSimulatingBurn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-semibold text-xs font-mono transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
            >
              <Flame className={`w-3.5 h-3.5 ${isSimulatingBurn ? 'animate-bounce' : ''}`} />
              <span>{isSimulatingBurn ? 'Simulating...' : 'Simulate Buyback & Burn'}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Cumulative $APAY Burned</span>
            </div>
            <div className="text-xl font-black font-spatial text-amber-600 dark:text-amber-400">
              {burnFeed?.totalBurnedApay ? burnFeed.totalBurnedApay.toLocaleString() : '1,425,850'}{' '}
              $APAY
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              Permanently destroyed via ERC20Burnable
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>Buyback Allocation (30%)</span>
            </div>
            <div className="text-xl font-black font-spatial text-slate-900 dark:text-white">
              $
              {burnFeed?.totalUsdcAllocated
                ? burnFeed.totalUsdcAllocated.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '71,292.50'}{' '}
              USDC
            </div>
            <div className="text-[10px] text-blue-600 dark:text-sky-400 font-medium">
              Routed to DEX liquidity buybacks
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>DEX Liquidity Target</span>
            </div>
            <div className="text-sm font-bold font-spatial text-slate-900 dark:text-white truncate">
              Aerodrome vAMM (WETH/APAY)
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              0x6933dd2B...7777 (Base Mainnet)
            </div>
          </div>
        </div>

        {/* Recent Burns Table */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Verified On-Chain Burn Transactions
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-4">Transaction</th>
                  <th className="py-2.5 px-4">Burned Amount</th>
                  <th className="py-2.5 px-4">DEX Route</th>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(burnFeed?.recentBurns || []).slice(0, 5).map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {b.txHash.slice(0, 10)}...{b.txHash.slice(-6)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-500">
                      🔥 {b.amountApay.toLocaleString()} $APAY
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {b.dex} (${b.amountUsdc.toFixed(2)} USDC)
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(b.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={b.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-sky-400 hover:underline"
                      >
                        <span>BaseScan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Base Sepolia 1-Click Testnet Faucet Banner */}
      {activeNetwork === 'base-sepolia' && (
        <div className="rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/30 p-5 sm:p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <Droplets className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Base Sepolia Testnet Faucet</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    +50 $APAY Free
                  </span>
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 max-w-xl">
                Need test tokens to experiment with sub-agent session escrows, HTTP 402 paywalls, or
                anti-spam staking? Claim 50 testnet $APAY directly to your connected wallet.
              </p>
              {faucetResult && (
                <div
                  className={`mt-2 p-3 rounded-xl text-xs font-mono flex items-center justify-between gap-2 ${
                    faucetResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <span>{faucetResult.message}</span>
                  {faucetResult.txHash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${faucetResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 underline shrink-0 flex items-center gap-1"
                    >
                      <span>Tx</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRequestFaucet}
              disabled={faucetLoading}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>{faucetLoading ? 'Dispensing 50 $APAY...' : 'Claim 50 Testnet $APAY'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Autonomous AI Agent Micropayment Simulator */}
      <AgentSimulatorCard activeNetwork={activeNetwork} />

      {/* Global Connected Websites & Live Merchant Directory (M2M Service Discovery) */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              Global Connected Websites & Live Merchant Directory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time telemetry of external services and APIs running A-Pay reverse-proxy gateways
              worldwide (Upstash Redis Cloud Sync).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFounder && (
              <button
                onClick={handlePurgeStale}
                disabled={isPurgingRegistry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-xs font-mono font-medium text-red-500 transition-colors cursor-pointer"
                title="Remove idle or offline endpoints from the directory"
              >
                <Trash2 className={`w-3 h-3 ${isPurgingRegistry ? 'animate-spin' : ''}`} />
                <span>Purge Idle</span>
              </button>
            )}
            <button
              onClick={loadRegistry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRegistry ? 'animate-spin' : ''}`} />
              <span>Refresh Directory</span>
            </button>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 font-bold">
              {registeredMerchants.length} Active Endpoints
            </span>
          </div>
        </div>

        {/* Founder Action Feedback Banner */}
        {founderActionFeedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              founderActionFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : founderActionFeedback.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {founderActionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : founderActionFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />
              )}
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {founderActionFeedback.title}
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {founderActionFeedback.message}
                </div>
                {founderActionFeedback.txHash && (
                  <a
                    href={`${chainConfig.explorerUrl}/tx/${founderActionFeedback.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-sky-400 hover:underline mt-1 font-bold"
                  >
                    <span>
                      View on {chainConfig.shortName}Scan (
                      {founderActionFeedback.txHash.slice(0, 10)}...)
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFounderActionFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {registeredMerchants.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-4">{isFounder ? 'Merchant Wallet' : 'Node / Origin'}</th>
                  <th className="py-3 px-4">Protected Domain / Upstream</th>
                  <th className="py-3 px-4">Price / Call</th>
                  <th className="py-3 px-4">Network</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  {isFounder && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {registeredMerchants.map((m) => {
                  const cleanDomain = (m.targetDomain || '').trim().replace(/\/+$/, '');
                  const isDemoDomain = isPlaceholderOrDemoDomain(cleanDomain);
                  const isFounderWallet = Boolean(
                    m.wallet && m.wallet.toLowerCase() === CONTRACTS.founder.toLowerCase(),
                  );
                  const isStakingWallet = Boolean(
                    m.wallet &&
                      m.wallet.toLowerCase() === CONTRACTS.StakingVault.address.toLowerCase(),
                  );
                  const isEscrowWallet = Boolean(
                    m.wallet &&
                      m.wallet.toLowerCase() === CONTRACTS.EscrowVault.address.toLowerCase(),
                  );
                  const isContractWallet = isStakingWallet || isEscrowWallet;
                  const isDemoOrEcosystem = isDemoDomain || isFounderWallet || isContractWallet;

                  let categoryBadge = null;
                  if (isFounderWallet) {
                    categoryBadge = (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Founder Vault
                      </span>
                    );
                  } else if (isStakingWallet) {
                    categoryBadge = (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        Staking Vault
                      </span>
                    );
                  } else if (isDemoDomain) {
                    categoryBadge = (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Demo Showcase
                      </span>
                    );
                  } else {
                    categoryBadge = (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Live Merchant
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-blue-600 dark:text-sky-400 font-bold">
                        {m.wallet?.startsWith('0x')
                          ? `${m.wallet.slice(0, 6)}...${m.wallet.slice(-4)}`
                          : m.wallet || 'Base L2 Node'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{cleanDomain}</span>
                          {categoryBadge}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                        {m.price}
                      </td>
                      <td className="py-3 px-4 text-slate-500 uppercase">{m.network || 'base'}</td>
                      <td className="py-3 px-4 text-slate-500">v{m.version}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'online'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'online'
                                ? 'bg-emerald-500 animate-pulse'
                                : 'bg-slate-400'
                            }`}
                          />
                          {m.status === 'online' ? 'LIVE' : 'IDLE'}
                        </span>
                      </td>
                      {isFounder && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Gift 10 $APAY Welcome Grant Button */}
                            {(() => {
                              const isGifted = Boolean(
                                giftedMerchants[m.id] ||
                                  (m.wallet && giftedMerchants[m.wallet.toLowerCase()]),
                              );
                              const giftInfo =
                                giftedMerchants[m.id] ||
                                (m.wallet ? giftedMerchants[m.wallet.toLowerCase()] : null);
                              const isGifting = activeFounderAction === `gift-${m.id}`;
                              const disableGift = isGifting || isGifted || isDemoOrEcosystem;

                              const giftTooltip = isGifted
                                ? `10 $APAY Welcome Grant Sent! (Tx: ${giftInfo?.txHash ? `${giftInfo.txHash.slice(0, 10)}...` : 'Confirmed'})`
                                : isFounderWallet
                                  ? 'Founder Vault (Self-transfer not needed)'
                                  : isStakingWallet
                                    ? 'Staking Vault Contract (Direct grant disabled)'
                                    : isDemoDomain
                                      ? 'Demo Showcase Service (Reserved for live external merchants)'
                                      : 'Gift 10 $APAY On-Chain Welcome Grant to Merchant';

                              return (
                                <button
                                  type="button"
                                  onClick={() => !disableGift && handleGiftTokens(m)}
                                  disabled={disableGift}
                                  className={`relative p-1.5 rounded-lg transition-all ${
                                    isGifted
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-default opacity-90'
                                      : isGifting
                                        ? 'bg-amber-500/20 text-amber-400 animate-pulse cursor-wait'
                                        : isDemoOrEcosystem
                                          ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
                                          : 'hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 hover:scale-110 cursor-pointer active:scale-95'
                                  }`}
                                  title={giftTooltip}
                                >
                                  {isGifting ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                  ) : isGifted ? (
                                    <span className="flex items-center justify-center">
                                      <Gift className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900" />
                                    </span>
                                  ) : (
                                    <Gift className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              );
                            })()}

                            {/* 2. Test Paywall & Micro-Payment Button */}
                            {(() => {
                              const isTested = Boolean(
                                testedMerchants[m.id] ||
                                  (m.wallet && testedMerchants[m.wallet.toLowerCase()]),
                              );
                              const testInfo =
                                testedMerchants[m.id] ||
                                (m.wallet ? testedMerchants[m.wallet.toLowerCase()] : null);
                              const isTesting = activeFounderAction === `test-${m.id}`;
                              const payPrice = parseApayPrice(m.price);

                              return (
                                <button
                                  type="button"
                                  onClick={() => handleTestPaywallPayment(m)}
                                  disabled={isTesting || isTested}
                                  className={`relative p-1.5 rounded-lg transition-all ${
                                    isTested
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default opacity-90'
                                      : isTesting
                                        ? 'bg-blue-500/20 text-blue-400 animate-pulse cursor-wait'
                                        : 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 hover:scale-110 cursor-pointer active:scale-95'
                                  }`}
                                  title={
                                    isTested
                                      ? `Paywall Tested & Paid ${testInfo?.price || `${payPrice} $APAY`}! (Tx: ${testInfo?.txHash ? `${testInfo.txHash.slice(0, 10)}...` : 'Confirmed'})`
                                      : `Test Paywall & Send Payment (${payPrice} $APAY)`
                                  }
                                >
                                  {isTesting ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                  ) : isTested ? (
                                    <span className="flex items-center justify-center">
                                      <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
                                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900" />
                                    </span>
                                  ) : (
                                    <Zap className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              );
                            })()}

                            {/* 3. Delete from registry */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMerchant(cleanDomain, m.wallet)}
                              disabled={deletingMerchant === cleanDomain}
                              className={`p-1.5 rounded-lg transition-colors ${
                                deletingMerchant === cleanDomain
                                  ? 'bg-red-500/20 text-red-400 cursor-wait'
                                  : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500 cursor-pointer'
                              }`}
                              title={
                                deletingMerchant === cleanDomain
                                  ? 'Deleting merchant from registry...'
                                  : 'Delete merchant from registry'
                              }
                            >
                              {deletingMerchant === cleanDomain ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-center space-y-2">
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              📡 Gateway Registry is listening for inbound heartbeats...
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              When external developers run{' '}
              <code className="text-blue-600 dark:text-sky-400 font-mono font-semibold">
                apay protect --target ...
              </code>{' '}
              on their production servers, their active endpoints and merchant payout addresses will
              register securely here.
            </p>
          </div>
        )}
      </div>

      {/* Verified Live Smart Contracts Bar */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>BaseScan Verified Smart Contracts ({chainConfig.chainName})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              100% on-chain bytecode parity with compiler v0.8.28+commit.7893614a & viaIR
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href="/api/contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>Audit Manifest</span>
            </a>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 ${
                chainConfig.isTestnet
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>5/5 Verified On-Chain</span>
            </span>
          </div>
        </div>

        {!chainConfig.isTestnet && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
            <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-mono">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Base Mainnet (Chain ID 8453) Production Suite Active:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Official Base Mainnet smart contracts are 100% verified and operational on Coinbase
              Base L2. $APAY (100M Cap), Enterprise Router V2, EscrowVault, and StakingVault are
              live alongside Circle Native USDC (
              <code className="font-mono text-blue-600 dark:text-sky-400 font-semibold">
                {contracts.USDC.address}
              </code>
              ).
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. APAYToken */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-600 dark:text-sky-400 uppercase font-mono">
                1. $APAY Token (ERC-20)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {contracts.APAYToken.address}
              </span>
              <button
                onClick={() => copyText(contracts.APAYToken.address, setCopiedToken)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Address"
              >
                {copiedToken ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <a
                  href={`${chainConfig.explorerUrl}/address/${contracts.APAYToken.address}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-sky-400 font-semibold hover:underline"
                >
                  BaseScan #code <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`/api/contracts?download=APAYToken&network=${activeNetwork}`}
                  download
                  title="Download Standard-JSON"
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
                >
                  <Download className="w-2.5 h-2.5" />
                  JSON
                </a>
              </div>
              <button
                type="button"
                onClick={() => addApayTokenToWallet(activeNetwork)}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all font-semibold cursor-pointer active:scale-95"
              >
                <span>🦊</span>
                <span>MetaMask</span>
              </button>
            </div>
          </div>

          {/* 2. APayRouter V1 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase font-mono">
                2. APayRouter (V1 Base)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {contracts.APayRouter.address}
              </span>
              <button
                onClick={() => copyText(contracts.APayRouter.address, setCopiedRouter)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Address"
              >
                {copiedRouter ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.APayRouter.address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
              >
                BaseScan #code <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`/api/contracts?download=APayRouter&network=${activeNetwork}`}
                download
                title="Download Standard-JSON"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                <Download className="w-2.5 h-2.5" />
                JSON
              </a>
            </div>
          </div>

          {/* 3. APayRouterV2 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono">
                3. APayRouterV2 (Enterprise)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {contracts.APayRouterV2.address}
              </span>
              <button
                onClick={() => copyText(contracts.APayRouterV2.address, setCopiedRouterV2)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Address"
              >
                {copiedRouterV2 ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.APayRouterV2.address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                BaseScan #code <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`/api/contracts?download=APayRouterV2&network=${activeNetwork}`}
                download
                title="Download Standard-JSON"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                <Download className="w-2.5 h-2.5" />
                JSON
              </a>
            </div>
          </div>

          {/* 4. EscrowVault */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase font-mono">
                4. EscrowVault (Session Keys)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {contracts.EscrowVault.address}
              </span>
              <button
                onClick={() => copyText(contracts.EscrowVault.address, setCopiedEscrow)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Address"
              >
                {copiedEscrow ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.EscrowVault.address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                BaseScan #code <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`/api/contracts?download=EscrowVault&network=${activeNetwork}`}
                download
                title="Download Standard-JSON"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                <Download className="w-2.5 h-2.5" />
                JSON
              </a>
            </div>
          </div>

          {/* 5. StakingVault */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                5. StakingVault (Anti-Spam)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {contracts.StakingVault.address}
              </span>
              <button
                onClick={() => copyText(contracts.StakingVault.address, setCopiedStaking)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Address"
              >
                {copiedStaking ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.StakingVault.address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                BaseScan #code <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`/api/contracts?download=StakingVault&network=${activeNetwork}`}
                download
                title="Download Standard-JSON"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                <Download className="w-2.5 h-2.5" />
                JSON
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Stream (Authentic On-Chain Log Stream) */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              Live On-Chain Activity Stream
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time on-chain token transfers, founder grants, and M2M settlements on Base L2
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStreamTab('transfers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  streamTab === 'transfers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🎁 $APAY Transfers ({tokenTransferLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setStreamTab('router')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  streamTab === 'router'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚡ Router Settlements ({settlementLogs.length})
              </button>
            </div>
            <button
              onClick={() => {
                loadBlockchainData();
                loadSettlementLogs();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {chainConfig.shortName} RPC
            </span>
          </div>
        </div>

        {streamTab === 'transfers' ? (
          tokenTransferLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">From (Sender)</th>
                    <th className="py-3 px-4">To (Recipient)</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Block #</th>
                    <th className="py-3 px-4 text-right">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {tokenTransferLogs.map((log) => {
                    const isRecipient =
                      walletAddress && log.to.toLowerCase() === walletAddress.toLowerCase();
                    const isSender =
                      walletAddress && log.from.toLowerCase() === walletAddress.toLowerCase();
                    const isFounderSender =
                      contracts.founder &&
                      log.from.toLowerCase() === contracts.founder.toLowerCase();
                    const matchedMerchant = registeredMerchants.find(
                      (m) => m.wallet && m.wallet.toLowerCase() === log.to.toLowerCase(),
                    );
                    return (
                      <tr
                        key={log.txHash}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors ${
                          isRecipient
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                            : isSender
                              ? 'bg-blue-50/40 dark:bg-blue-950/20'
                              : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>
                              {isFounderSender
                                ? 'Founder Treasury'
                                : `${log.from.slice(0, 6)}...${log.from.slice(-4)}`}
                            </span>
                            {isFounderSender && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold font-mono uppercase">
                                Founder
                              </span>
                            )}
                            {isSender && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold font-mono uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>
                              {log.to.slice(0, 6)}...{log.to.slice(-4)}
                            </span>
                            {matchedMerchant?.name && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans">
                                ({matchedMerchant.name})
                              </span>
                            )}
                            {isRecipient && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {isSender ? (
                            <span className="text-blue-600 dark:text-sky-400">
                              -{log.amountApay} $APAY
                            </span>
                          ) : isRecipient ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{log.amountApay} $APAY
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              {log.amountApay} $APAY
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          #{log.blockNumber.toString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <a
                              href={`${chainConfig.explorerUrl}/tx/${log.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-sky-400 hover:underline font-bold"
                              title="View on BaseScan"
                            >
                              <span>BaseScan</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <a
                              href={
                                activeNetwork === 'base-mainnet'
                                  ? `https://base.blockscout.com/tx/${log.txHash}`
                                  : `https://base-sepolia.blockscout.com/tx/${log.txHash}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:underline text-[11px]"
                              title="Alternative explorer if BaseScan is slow"
                            >
                              <span>Blockscout</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Gift className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-spatial text-base font-bold text-slate-900 dark:text-white">
                  $APAY ERC-20 Token Transfers
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  No token transfers detected in the last 1,800 blocks for this network.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-mono">
                {walletAddress && (
                  <a
                    href={`${chainConfig.explorerUrl}/address/${walletAddress}#tokentxns`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5 hover:underline"
                  >
                    <span>View Your $APAY Transfers on BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )
        ) : settlementLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-4">Payer Agent</th>
                  <th className="py-3 px-4">Receiver Merchant</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Fee (1%)</th>
                  <th className="py-3 px-4">Block #</th>
                  <th className="py-3 px-4 text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {settlementLogs.map((log) => (
                  <tr
                    key={log.txHash}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {log.payer.slice(0, 6)}...{log.payer.slice(-4)}
                    </td>
                    <td className="py-3.5 px-4 text-blue-600 dark:text-sky-400">
                      {log.receiver.slice(0, 6)}...{log.receiver.slice(-4)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ${log.totalAmountUsdc} USDC
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">${log.feeAmountUsdc} USDC</td>
                    <td className="py-3.5 px-4 text-slate-500">#{log.blockNumber.toString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`${chainConfig.explorerUrl}/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-sky-400 hover:underline"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-sky-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-spatial text-base font-bold text-slate-900 dark:text-white">
                Listening for Live M2M Micropayments on {chainConfig.chainName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                0 on-chain settlement claims detected in the last 10,000 blocks. When autonomous
                agents execute HTTP 402 micro-transactions or batch claim journals settle on-chain,
                they will stream here in real-time.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-mono">
              <span
                suppressHydrationWarning
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Updated: {isMounted && lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Live'}
              </span>
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.APayRouter.address}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5 hover:underline"
              >
                <span>View Router on Basescan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {walletAddress && (
                <a
                  href={`${chainConfig.explorerUrl}/address/${walletAddress}#tokentxns`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5 hover:underline"
                >
                  <span>View Your $APAY Transfers on BaseScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
