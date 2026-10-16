'use client';

import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { NetworkId } from '@/config/contracts';
import {
  ensureNetwork,
  initEIP6963Discovery,
  resolveSpecificWalletProvider,
  setActiveEthereum,
} from '@/services/blockchain';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string) => Promise<void>;
  activeNetwork?: NetworkId;
}

type SupportedWallet =
  | 'MetaMask'
  | 'Coinbase Wallet'
  | 'Trust Wallet'
  | 'Rainbow'
  | 'Browser Wallet';

function getDappDeepLink(wallet: 'metamask' | 'coinbase' | 'trust' | 'rainbow'): string {
  if (typeof window === 'undefined') return 'https://metamask.io/download/';
  const fullUrl = window.location.href;
  const noProtocolUrl = fullUrl.replace(/^https?:\/\//, '');

  switch (wallet) {
    case 'metamask':
      return `https://metamask.app.link/dapp/${noProtocolUrl}`;
    case 'coinbase':
      return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(fullUrl)}`;
    case 'trust':
      return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(fullUrl)}`;
    case 'rainbow':
      return `https://rainbow.me/dapp/${noProtocolUrl}`;
  }
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  onConnected,
  activeNetwork = 'base-sepolia',
}: ConnectWalletModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [lastAttemptedProvider, setLastAttemptedProvider] = useState<SupportedWallet>('MetaMask');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isMetaMaskDetected, setIsMetaMaskDetected] = useState(false);
  const [isCoinbaseDetected, setIsCoinbaseDetected] = useState(false);
  const [isTrustDetected, setIsTrustDetected] = useState(false);
  const [isRainbowDetected, setIsRainbowDetected] = useState(false);
  const [isOtherWeb3Detected, setIsOtherWeb3Detected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanup = initEIP6963Discovery();
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMob = mobileRegex.test(navigator.userAgent);
      setIsMobileDevice(isMob);

      const checkProviders = () => {
        const meta = resolveSpecificWalletProvider('MetaMask');
        const cb = resolveSpecificWalletProvider('Coinbase Wallet');
        const tw = resolveSpecificWalletProvider('Trust Wallet');
        const rb = resolveSpecificWalletProvider('Rainbow');
        const other = resolveSpecificWalletProvider('Browser Wallet');
        const any = Boolean((window as any).ethereum);

        setHasInjected(any);
        setIsMetaMaskDetected(Boolean(meta));
        setIsCoinbaseDetected(Boolean(cb));
        setIsTrustDetected(Boolean(tw));
        setIsRainbowDetected(Boolean(rb));
        setIsOtherWeb3Detected(Boolean(other));
      };

      checkProviders();
      const timer = setTimeout(checkProviders, 400);

      return () => {
        cleanup();
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cancelConnection = () => {
    setIsConnecting(false);
    setConnectingProvider(null);
    setErrorMessage('Connection request was cancelled. You can retry anytime.');
  };

  const handleConnectInjected = async (providerName: string, ethProvider: any) => {
    setErrorMessage(null);
    setIsConnecting(true);
    setConnectingProvider(providerName);

    try {
      // 1. Lock the active provider for the entire app session (eliminates collision)
      setActiveEthereum(ethProvider, providerName);

      // 2. Standard EIP-1193 with 25s watchdog timeout to prevent indefinite spinning
      // when extension is locked or waiting in browser toolbar
      const accountsPromise = ethProvider.request({ method: 'eth_requestAccounts' });

      let timerId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          const timeoutErr: any = new Error(
            `${providerName} did not respond within 25 seconds. Please check your browser toolbar or extension popup to unlock and approve.`,
          );
          timeoutErr.code = 'ETIMEDOUT';
          reject(timeoutErr);
        }, 25000);
      });

      const accounts: string[] = await Promise.race([accountsPromise, timeoutPromise]).finally(
        () => {
          clearTimeout(timerId);
        },
      );

      if (accounts?.[0]) {
        // Ensure user is routed to the active settlement network
        try {
          await ensureNetwork(ethProvider, activeNetwork);
        } catch (netErr) {
          console.warn('Network switch warning:', netErr);
        }

        // Callback to app
        await onConnected(accounts[0]);
        onClose();
      } else {
        setErrorMessage('No accounts returned from wallet.');
      }
    } catch (err: any) {
      if (err.code === -32002 || err?.message?.toLowerCase()?.includes('already pending')) {
        setErrorMessage(
          `${providerName} approval prompt is already pending. Check your browser toolbar or extension popup to approve.`,
        );
      } else if (err.code === 4001 || err?.message?.toLowerCase()?.includes('user rejected')) {
        setErrorMessage('Connection request was cancelled in your wallet. Click to try again.');
      } else if (err.code === 'ETIMEDOUT') {
        setErrorMessage(
          `${providerName} did not respond within 25 seconds. Please check your browser toolbar or click your extension icon to unlock, then click Retry.`,
        );
      } else {
        console.warn('Wallet connection error:', err);
        setErrorMessage(err?.message || 'Failed to connect Web3 wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  const handleConnect = async (providerName: SupportedWallet) => {
    setErrorMessage(null);
    setLastAttemptedProvider(providerName);

    // 1. Resolve exact target provider (EIP-6963 / providerMap / true provider filtering)
    const specificProvider = resolveSpecificWalletProvider(providerName);

    if (specificProvider) {
      await handleConnectInjected(providerName, specificProvider);
      return;
    }

    // 2. If user is on a mobile device outside an in-app browser (e.g. Mobile Chrome or Safari)
    if (isMobileDevice) {
      setIsConnecting(true);
      setConnectingProvider(providerName);

      if (providerName === 'MetaMask') {
        const link = getDappDeepLink('metamask');
        window.location.href = link;
        setTimeout(() => {
          setIsConnecting(false);
          setConnectingProvider(null);
        }, 3500);
        return;
      }

      if (providerName === 'Coinbase Wallet') {
        const link = getDappDeepLink('coinbase');
        window.location.href = link;
        setTimeout(() => {
          setIsConnecting(false);
          setConnectingProvider(null);
        }, 3500);
        return;
      }

      if (providerName === 'Trust Wallet') {
        const link = getDappDeepLink('trust');
        window.location.href = link;
        setTimeout(() => {
          setIsConnecting(false);
          setConnectingProvider(null);
        }, 3500);
        return;
      }

      if (providerName === 'Rainbow') {
        const link = getDappDeepLink('rainbow');
        window.location.href = link;
        setTimeout(() => {
          setIsConnecting(false);
          setConnectingProvider(null);
        }, 3500);
        return;
      }

      // Default fallback
      window.location.href = getDappDeepLink('metamask');
      setTimeout(() => {
        setIsConnecting(false);
        setConnectingProvider(null);
      }, 3500);
      return;
    }

    // 3. Desktop without extension: open download or show instruction
    if (providerName === 'MetaMask') {
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }
    if (providerName === 'Coinbase Wallet') {
      window.open('https://www.coinbase.com/wallet/downloads', '_blank', 'noopener,noreferrer');
      return;
    }
    if (providerName === 'Trust Wallet') {
      window.open('https://trustwallet.com/browser-extension', '_blank', 'noopener,noreferrer');
      return;
    }
    if (providerName === 'Rainbow') {
      window.open('https://rainbow.me/', '_blank', 'noopener,noreferrer');
      return;
    }
    if (providerName === 'Browser Wallet') {
      window.open('https://rabby.io/', '_blank', 'noopener,noreferrer');
      return;
    }

    setErrorMessage(
      'No Web3 wallet extension detected in this browser. Please install MetaMask, Coinbase, or Trust Wallet from official stores, or use a Web3-compatible browser like Brave.',
    );
  };

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={isConnecting ? undefined : onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 space-y-5 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 transition-all max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 text-blue-600 dark:text-sky-400" />
              Base L2 Settlement
            </div>
            <h3 className="font-spatial text-xl font-black text-slate-900 dark:text-white">
              Connect Web3 Wallet
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Connect your non-custodial Web3 wallet to authorize autonomous micropayments, manage API
          paywalls, and claim merchant settlement journals on{' '}
          {activeNetwork === 'base-mainnet' ? 'Base Mainnet' : 'Base Sepolia'}.
        </p>

        {/* Mobile Detection Guidance Notice */}
        {isMobileDevice && !hasInjected && (
          <div className="p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-sky-200 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-sky-300">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Mobile Browser Detected</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Mobile Chrome/Safari cannot run browser extensions. Tap below to launch A-Pay directly
              inside your installed wallet app, or copy the link to paste into your wallet&apos;s
              browser.
            </p>
          </div>
        )}

        {/* Active Connecting / Approval Pending Indicator */}
        {isConnecting && connectingProvider && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Waiting for {connectingProvider}...</span>
              </div>
              <button
                type="button"
                onClick={cancelConnection}
                className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel ✕
              </button>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              If a popup didn&apos;t appear automatically, check your browser toolbar or click your{' '}
              <span className="font-semibold">{connectingProvider}</span> extension icon to unlock
              and approve.
            </p>
          </div>
        )}

        {/* Error / Pending Notice */}
        {errorMessage && !isConnecting && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-sans leading-normal text-[11px]">{errorMessage}</div>
            </div>
            <button
              onClick={() => handleConnect(lastAttemptedProvider)}
              disabled={isConnecting}
              className="text-[11px] font-mono font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              🔄 Retry {lastAttemptedProvider}
            </button>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3">
          {/* 1. MetaMask */}
          <button
            onClick={() => handleConnect('MetaMask')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🦊
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 flex items-center gap-1.5">
                  <span>MetaMask</span>
                  {isMetaMaskDetected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Detected
                    </span>
                  )}
                  {isMobileDevice && !hasInjected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 font-semibold">
                      App Link
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMetaMaskDetected
                    ? 'Dedicated MetaMask Extension ready'
                    : isMobileDevice
                      ? 'Launch directly in MetaMask Mobile App'
                      : 'Browser extension for Chrome, Brave, Firefox'}
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'MetaMask' ? (
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all">
                {isMetaMaskDetected ? 'Connect →' : isMobileDevice ? 'Open App ↗' : 'Install →'}
              </span>
            )}
          </button>

          {/* 2. Coinbase Wallet */}
          <button
            onClick={() => handleConnect('Coinbase Wallet')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🛡️
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 flex items-center gap-1.5">
                  <span>Coinbase Wallet</span>
                  {isCoinbaseDetected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Detected
                    </span>
                  )}
                  {isMobileDevice && !hasInjected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-400 font-semibold">
                      App Link
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isCoinbaseDetected
                    ? 'Coinbase Wallet Extension ready'
                    : isMobileDevice
                      ? 'Launch in Coinbase Wallet App'
                      : 'Base native smart wallet & extension'}
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'Coinbase Wallet' ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all">
                {isCoinbaseDetected ? 'Connect →' : isMobileDevice ? 'Open App ↗' : 'Get Wallet →'}
              </span>
            )}
          </button>

          {/* 3. Trust Wallet */}
          <button
            onClick={() => handleConnect('Trust Wallet')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-sky-50/30 dark:hover:bg-sky-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                💎
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 flex items-center gap-1.5">
                  <span>Trust Wallet</span>
                  {isTrustDetected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Detected
                    </span>
                  )}
                  {isMobileDevice && !hasInjected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 font-semibold">
                      App Link
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isTrustDetected
                    ? 'Trust Wallet Extension ready'
                    : isMobileDevice
                      ? 'Launch in Trust Wallet App'
                      : 'Trust Wallet mobile & browser extension'}
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'Trust Wallet' ? (
              <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all">
                {isTrustDetected ? 'Connect →' : isMobileDevice ? 'Open App ↗' : 'Get Wallet →'}
              </span>
            )}
          </button>

          {/* 4. Rainbow Wallet */}
          <button
            onClick={() => handleConnect('Rainbow')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-pink-500 dark:hover:border-pink-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-950/60 dark:via-purple-950/60 dark:to-blue-950/60 border border-pink-200 dark:border-pink-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🌈
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 flex items-center gap-1.5">
                  <span>Rainbow Wallet</span>
                  {isRainbowDetected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Detected
                    </span>
                  )}
                  {isMobileDevice && !hasInjected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400 font-semibold">
                      App Link
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isRainbowDetected
                    ? 'Rainbow Extension ready'
                    : isMobileDevice
                      ? 'Launch in Rainbow Mobile App'
                      : 'Rainbow Ethereum & Base L2 wallet'}
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'Rainbow' ? (
              <Loader2 className="w-4 h-4 text-pink-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all">
                {isRainbowDetected ? 'Connect →' : isMobileDevice ? 'Open App ↗' : 'Get Wallet →'}
              </span>
            )}
          </button>

          {/* 5. Browser Web3 Wallet (Rabby, Brave, OKX, Phantom) */}
          {(hasInjected || isOtherWeb3Detected) && (
            <button
              onClick={() => handleConnect('Browser Wallet')}
              disabled={isConnecting}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-1.5">
                    <span>Other Web3 Wallet</span>
                    {isOtherWeb3Detected && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                        Detected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Brave, Rabby, OKX, Phantom
                  </div>
                </div>
              </div>
              {isConnecting && connectingProvider === 'Browser Wallet' ? (
                <Loader2 className="w-4 h-4 text-purple-500 animate-spin shrink-0" />
              ) : (
                <span className="text-xs text-slate-400 font-mono group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all">
                  Connect →
                </span>
              )}
            </button>
          )}
        </div>

        {/* Copy Link helper for Mobile In-App Browsers */}
        {isMobileDevice && !hasInjected && (
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    URL Copied! Paste in Wallet In-App Browser
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Copy URL for Wallet Browser</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer / Helper notice */}
        {!hasInjected && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
            >
              <span>
                {isMobileDevice
                  ? "Don't have MetaMask installed on your phone? Get the App"
                  : "Don't have a wallet? Install MetaMask Extension"}
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>Non-Custodial • Private Keys Never Leave Your Device</span>
        </div>
      </div>
    </div>
  );
}
