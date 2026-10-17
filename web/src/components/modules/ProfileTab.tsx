'use client';

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Key,
  Lock,
  LogOut,
  QrCode,
  RefreshCw,
  ScanLine,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { generateQrDataUrl, parsePaymentQrData } from '@/checkout/qr';
import { QrScannerModal } from '@/components/QrScannerModal';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import {
  addApayTokenToWallet,
  fetchLiveWalletBalances,
  getBasename,
  transferTokensOrEth,
} from '@/services/blockchain';

interface ProfileTabProps {
  walletAddress: string | null;
  tokenBalance: string;
  isFounder?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  activeNetwork?: NetworkId;
  onSelectNetwork?: (networkId: NetworkId) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function ProfileTab({
  walletAddress,
  tokenBalance,
  isFounder,
  onConnect,
  onDisconnect,
  activeNetwork = 'base-sepolia',
  onSelectNetwork,
  onNavigateToTab,
}: ProfileTabProps) {
  const contracts = getNetworkContracts(activeNetwork);

  // Identity & Basename
  const [resolvedBasename, setResolvedBasename] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live Balances
  const [balances, setBalances] = useState({
    eth: '0.0000',
    apay: tokenBalance || '0',
    usdc: '0.00',
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // Payment Terminal Tabs
  const [paymentTab, setPaymentTab] = useState<'receive' | 'send'>('receive');

  // Receive State
  const [receiveAsset, setReceiveAsset] = useState<'APAY' | 'ETH'>('APAY');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Send State
  const [sendRecipient, setSendRecipient] = useState<string>('');
  const [sendAmount, setSendAmount] = useState<string>('');
  const [sendAsset, setSendAsset] = useState<'APAY' | 'ETH'>('APAY');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<{
    txHash: string;
    explorerUrl: string;
    amount: string;
    asset: string;
  } | null>(null);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  // Resolve Basename
  useEffect(() => {
    let isCancelled = false;
    if (!walletAddress) {
      setResolvedBasename(null);
      return;
    }
    getBasename(walletAddress, activeNetwork)
      .then((name) => {
        if (!isCancelled) setResolvedBasename(name);
      })
      .catch(() => {
        if (!isCancelled) setResolvedBasename(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [walletAddress, activeNetwork]);

  // Load Balances
  const reloadBalances = async () => {
    if (!walletAddress) return;
    setIsRefreshingBalances(true);
    try {
      const data = await fetchLiveWalletBalances(walletAddress as `0x${string}`, activeNetwork);
      setBalances({
        eth: data.eth,
        apay: data.apay,
        usdc: data.usdc,
      });
    } catch (err) {
      console.warn('Error loading balances:', err);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  useEffect(() => {
    reloadBalances();
  }, [walletAddress, activeNetwork]);

  // Generate QR Code for Receive
  useEffect(() => {
    if (!walletAddress) {
      setQrDataUrl('');
      return;
    }

    let isCancelled = false;
    let paymentUri = `ethereum:${walletAddress}`;

    const num = Number(receiveAmount);
    if (num && num > 0) {
      paymentUri += `?amount=${receiveAmount}&asset=${receiveAsset}`;
    }

    generateQrDataUrl(paymentUri, false).then((dataUrl) => {
      if (!isCancelled) {
        setQrDataUrl(dataUrl);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [walletAddress, receiveAmount, receiveAsset]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle scanned QR payload
  const handleScanSuccess = (decodedText: string) => {
    const parsed = parsePaymentQrData(decodedText);
    if (parsed.address) {
      setSendRecipient(parsed.address);
    } else {
      setSendRecipient(decodedText.trim());
    }

    if (parsed.amount) {
      setSendAmount(parsed.amount);
    }
    if (parsed.asset) {
      setSendAsset(parsed.asset);
    }

    setPaymentTab('send');
    setSendError(null);
  };

  // Handle On-Chain Send
  const handleExecuteSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setSendError('Please connect your wallet first.');
      return;
    }

    const cleanRecipient = sendRecipient.trim();
    if (!cleanRecipient || !/^0x[a-fA-F0-9]{40}$/.test(cleanRecipient)) {
      setSendError('Please enter or scan a valid 42-character EVM address (0x...).');
      return;
    }

    const numAmount = Number(sendAmount);
    if (!numAmount || numAmount <= 0 || Number.isNaN(numAmount)) {
      setSendError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const result = await transferTokensOrEth({
        recipient: cleanRecipient as `0x${string}`,
        amount: sendAmount.trim(),
        asset: sendAsset,
        networkId: activeNetwork,
        fromAddress: walletAddress as `0x${string}`,
      });

      setSendSuccess({
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        amount: sendAmount.trim(),
        asset: sendAsset,
      });

      setSendAmount('');
      // Reload balances after successful transfer
      setTimeout(reloadBalances, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction was rejected or failed.';
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Dynamic Avatar Styling based on wallet address
  const getAvatarGradient = () => {
    if (isFounder) {
      return 'from-amber-500 via-orange-600 to-yellow-400 text-amber-950 shadow-amber-500/20';
    }
    return 'from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-blue-500/20';
  };

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Autonomous Identity & Operator Profile Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2">
              Connect your Web3 wallet (MetaMask, Coinbase Wallet, Trust Wallet, Rabby) to manage
              your Basename identity, generate dynamic payment QR codes, scan QR codes to send
              instant micro-payments, and inspect non-custodial treasury balances.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onConnect}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all duration-200 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet to Access Profile</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-6 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Zero Private Key Leakage
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Base L2 Native Settlement
            </span>
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-purple-500" />
              P2P & M2M Instant QR Rail
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ── 1. IDENTITY & OPERATOR STATUS CARD ──────────────────────────── */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xl overflow-hidden backdrop-blur-xl">
        {/* Futuristic Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Identity Left: Avatar & Names */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {/* Holographic Glowing Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${getAvatarGradient()} flex items-center justify-center font-spatial font-bold text-xl sm:text-2xl shadow-xl ring-4 ring-white dark:ring-slate-900`}
              >
                {isFounder ? (
                  <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-md" />
                ) : (
                  <span className="text-white drop-shadow-md">
                    {shortAddr?.slice(2, 4).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Online Pulse Dot */}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </span>
            </div>

            {/* Address & Badges */}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    isFounder
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-400/40'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400/40'
                  }`}
                >
                  {isFounder ? 'PROTOCOL FOUNDER' : 'AUTONOMOUS OPERATOR'}
                </span>

                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-400/30">
                  {activeNetwork === 'base-mainnet'
                    ? 'BASE MAINNET (8453)'
                    : 'BASE SEPOLIA (84532)'}
                </span>

                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-500" />
                  100% Solvency
                </span>
              </div>

              {/* Resolved Basename / Address */}
              <div className="flex items-center gap-2">
                {resolvedBasename ? (
                  <a
                    href={`https://base.org/name/${resolvedBasename.replace('.base.eth', '').replace('.basetest.eth', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5 group truncate"
                  >
                    <span>{resolvedBasename}</span>
                    <ExternalLink className="w-4 h-4 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                  </a>
                ) : (
                  <h2 className="text-lg sm:text-2xl font-mono font-bold text-slate-900 dark:text-white truncate">
                    {shortAddr}
                  </h2>
                )}
              </div>

              {/* Raw Address with Copy and BaseScan */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[200px] sm:max-w-xs">{walletAddress}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(walletAddress, 'wallet_address')}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Copy full EVM address"
                >
                  {copiedField === 'wallet_address' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`${contracts.chain.explorerUrl}/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                  title="View on BaseScan Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Identity Right: Disconnect & Quick Switch Network */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {onSelectNetwork && (
              <button
                type="button"
                onClick={() =>
                  onSelectNetwork(
                    activeNetwork === 'base-mainnet' ? 'base-sepolia' : 'base-mainnet',
                  )
                }
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch between Base Sepolia Testnet and Base Mainnet"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Switch to {activeNetwork === 'base-mainnet' ? 'Sepolia' : 'Mainnet'}</span>
              </button>
            )}

            {onDisconnect && (
              <button
                type="button"
                onClick={onDisconnect}
                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Disconnect Web3 wallet session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MULTI-ASSET TREASURY & PORTFOLIO BALANCES ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* $APAY Token Balance Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
              <span>A-PAY PROTOCOL TOKEN</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                $APAY
              </span>
            </div>
            <div className="text-2xl font-bold font-spatial text-slate-900 dark:text-white">
              {balances.apay}{' '}
              <span className="text-sm font-sans font-semibold text-blue-500">$APAY</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Fixed 100M Cap • Fee Burn Eligible
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => addApayTokenToWallet(activeNetwork)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              title="Import $APAY token directly into MetaMask"
            >
              <span>🦊</span>
              <span>Import to Wallet</span>
            </button>
            {activeNetwork === 'base-mainnet' ? (
              <a
                href="https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Swap on Aerodrome</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToTab?.('overview')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Free Faucet</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Native ETH Balance Card (Base L2 Gas) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
              <span>BASE L2 GAS BALANCE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                ETH
              </span>
            </div>
            <div className="text-2xl font-bold font-spatial text-slate-900 dark:text-white">
              {balances.eth}{' '}
              <span className="text-sm font-sans font-semibold text-slate-400">ETH</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Avg. Transaction Fee: &lt;$0.001
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Fast Sub-Second Finality</span>
            <button
              type="button"
              onClick={reloadBalances}
              disabled={isRefreshingBalances}
              className="text-xs text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* USDC Balance Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
              <span>USD COIN (NATIVE CIRCLE)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                USDC
              </span>
            </div>
            <div className="text-2xl font-bold font-spatial text-slate-900 dark:text-white">
              ${balances.usdc}{' '}
              <span className="text-sm font-sans font-semibold text-emerald-500">USDC</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">M2M Micro-Settlement Unit</p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Zero Chargeback Risk</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              1:1 Backed
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. HIGH-TECH P2P & M2M PAYMENT TERMINAL (QR PAY & RECEIVE) ─── */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xl overflow-hidden backdrop-blur-xl">
        {/* Terminal Header & Mode Switcher */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Instant Payment Terminal (P2P & M2M)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-300 border border-blue-500/20">
                  QR RAIL
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Send or receive Base L2 micro-payments instantly via QR scan & cryptographic
                settlement
              </p>
            </div>
          </div>

          {/* Sub-Tabs: Receive vs Send */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => setPaymentTab('receive')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paymentTab === 'receive'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive (QR Code)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentTab('send')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paymentTab === 'send'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Send (Scan QR)</span>
            </button>
          </div>
        </div>

        {/* ── TERMINAL BODY: RECEIVE TAB ─────────────────────────────────── */}
        {paymentTab === 'receive' && (
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Dynamic QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="relative p-4 rounded-2xl bg-white shadow-lg border border-slate-200/80">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="EVM Payment QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
                {/* Center Protocol Brand Badge inside QR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 border-2 border-white flex items-center justify-center shadow-md">
                    <span className="font-spatial font-bold text-white text-xs">A</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Base L2 EVM Destination</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1 break-all max-w-xs">
                  {walletAddress}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(walletAddress, 'receive_addr')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  {copiedField === 'receive_addr' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Address!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>

                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`apay-receive-qr-${shortAddr}.png`}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                    title="Download QR code as PNG image"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right: Payment Request Configuration */}
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Request Specific Amount (Optional)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Generate a standard EIP-681 payment invoice QR code so the payer's mobile or Web3
                  wallet automatically pre-fills the exact token and amount upon scanning.
                </p>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80">
                {/* Select Asset */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Select Currency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiveAsset('APAY')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        receiveAsset === 'APAY'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      $APAY Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiveAsset('ETH')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        receiveAsset === 'ETH'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Native ETH
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Requested Amount ({receiveAsset})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder={receiveAsset === 'APAY' ? 'e.g. 50' : 'e.g. 0.005'}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                      {receiveAsset}
                    </span>
                  </div>
                </div>

                {/* Live EIP-681 URI Preview */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>EIP-681 Payment Request URI:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `ethereum:${walletAddress}${receiveAmount ? `?amount=${receiveAmount}&asset=${receiveAsset}` : ''}`,
                          'payment_uri',
                        )
                      }
                      className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'payment_uri' ? 'Copied URI!' : 'Copy URI'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-sky-300 break-all">
                    ethereum:{walletAddress}
                    {receiveAmount ? `?amount=${receiveAmount}&asset=${receiveAsset}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TERMINAL BODY: SEND TAB ────────────────────────────────────── */}
        {paymentTab === 'send' && (
          <div className="p-6 sm:p-8">
            <form onSubmit={handleExecuteSend} className="max-w-2xl mx-auto space-y-6">
              {/* Scan or Paste Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ScanLine className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Scan Recipient QR Code:
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      Use your camera or upload a QR image to auto-fill recipient and amount.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Launch Camera Scanner</span>
                </button>
              </div>

              {/* Recipient Address Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Recipient EVM Address</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Base L2 0x...)</span>
                  </label>
                  {sendRecipient && (
                    <button
                      type="button"
                      onClick={() => setSendRecipient('')}
                      className="text-[11px] font-mono text-slate-400 hover:text-rose-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    placeholder="0x... (e.g. 0xd08c8a337e5339d1c083e06d74a9265956ceea16)"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-2 top-2 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Scan QR Code"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              {/* Currency Selector & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asset Choice */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Currency to Send
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendAsset('APAY')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        sendAsset === 'APAY'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4 text-blue-500" />
                      <span>$APAY Token</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendAsset('ETH')}
                      className={`p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        sendAsset === 'ETH'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <span>Native ETH</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Amount ({sendAsset})
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      Avail:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {sendAsset === 'APAY' ? balances.apay : balances.eth}
                      </strong>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder={sendAsset === 'APAY' ? 'e.g. 10' : 'e.g. 0.001'}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const raw =
                          sendAsset === 'APAY' ? balances.apay.replace(/,/g, '') : balances.eth;
                        setSendAmount(raw);
                      }}
                      className="absolute right-2 top-2 px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {sendError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Success Message Card */}
              {sendSuccess && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      Successfully Transferred {sendSuccess.amount} {sendSuccess.asset}!
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    Confirmed on Base L2 blockchain. Transaction Hash:
                  </p>
                  <div className="flex items-center gap-2 font-mono text-[10px] break-all">
                    <span>{sendSuccess.txHash}</span>
                    <a
                      href={sendSuccess.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1 font-bold shrink-0"
                    >
                      <span>BaseScan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Submit Transfer Button */}
              <button
                type="submit"
                disabled={isSending || !sendRecipient || !sendAmount}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing & Broadcasting Transaction...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Instant On-Chain Transfer</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── 4. AGENT SECURITY & TELEMETRY PROTOCOL MATRIX ───────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span>Protocol Security & Autonomous Capabilities</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Item 1: Non-Custodial Session Keys */}
          <div
            onClick={() => onNavigateToTab?.('vaults')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-mono text-[10px] uppercase">Session Keys Escrow</span>
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
              Sub-Agent Vaults
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Spend caps & non-custodial session authorization.
            </p>
          </div>

          {/* Item 2: M2M Gateway API Keys */}
          <div
            onClick={() => onNavigateToTab?.('apikeys')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-mono text-[10px] uppercase">Developer Gateway</span>
              <Key className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
              EIP-712 M2M API Keys
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Webhook signatures & machine merchant routing.
            </p>
          </div>

          {/* Item 3: Staking & Slash Protection */}
          <div
            onClick={() => onNavigateToTab?.('staking')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-mono text-[10px] uppercase">Governance & Staking</span>
              <Coins className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
              Staking & 500 APAY Bond
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Earn fee burn distributions and validator status.
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. LIVE QR CODE SCANNER MODAL ──────────────────────────────── */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </div>
  );
}
