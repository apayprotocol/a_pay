'use client';

import { AlertCircle, ExternalLink, Loader2, Shield, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { NetworkId } from '@/config/contracts';
import { ensureNetwork } from '@/services/blockchain';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string) => Promise<void>;
  activeNetwork?: NetworkId;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  onConnected,
  activeNetwork = 'base-sepolia',
}: ConnectWalletModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasInjected, setHasInjected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasInjected(Boolean((window as any).ethereum));
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

  const handleConnectInjected = async (providerName: string) => {
    setErrorMessage(null);
    setIsConnecting(true);
    setConnectingProvider(providerName);

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setErrorMessage(
        'No Web3 wallet extension detected in this browser. Please install MetaMask or use a Web3-compatible browser.',
      );
      setIsConnecting(false);
      setConnectingProvider(null);
      return;
    }

    const eth = (window as any).ethereum;

    try {
      // Standard EIP-1193: Request accounts interactively.
      // If unlocked and already authorized, resolves immediately.
      // If locked or unauthorized, opens wallet popup for password/permission.
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });

      if (accounts?.[0]) {
        // 3. Ensure user is routed to the active settlement network
        try {
          await ensureNetwork(eth, activeNetwork);
        } catch (netErr) {
          console.warn('Network switch warning:', netErr);
        }

        // 4. Callback to app
        await onConnected(accounts[0]);
        onClose();
      } else {
        setErrorMessage('No accounts returned from wallet.');
      }
    } catch (err: any) {
      if (err.code === -32002) {
        setErrorMessage(
          'MetaMask approval prompt is already waiting. Look for the Fox (🦊) or Extensions (🧩) icon in your browser toolbar to approve, or click Retry below once approved.',
        );
      } else if (err.code === 4001) {
        setErrorMessage('Connection request was cancelled in your wallet. Click to try again.');
      } else {
        console.warn('Wallet connection error:', err);
        setErrorMessage(err?.message || 'Failed to connect Web3 wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={isConnecting ? undefined : onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 space-y-6 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 transition-all max-h-[90vh] overflow-y-auto">
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
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

        {/* Error / Pending Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-sans leading-normal text-[11px]">{errorMessage}</div>
            </div>
            <button
              onClick={() => handleConnectInjected('MetaMask')}
              disabled={isConnecting}
              className="text-[11px] font-mono font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              🔄 Check Approval / Retry
            </button>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3">
          {/* MetaMask */}
          <button
            onClick={() => handleConnectInjected('MetaMask')}
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
                  {hasInjected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Detected
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Browser extension & mobile dApp browser
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'MetaMask' ? (
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all">
                Connect →
              </span>
            )}
          </button>

          {/* Coinbase Wallet */}
          <button
            onClick={() => handleConnectInjected('Coinbase Wallet')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🛡️
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400">
                  Coinbase Wallet
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Base native smart wallet & mobile
                </div>
              </div>
            </div>
            {isConnecting && connectingProvider === 'Coinbase Wallet' ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : (
              <span className="text-xs text-slate-400 font-mono group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all">
                Connect →
              </span>
            )}
          </button>

          {/* Injected / Other Web3 */}
          <button
            onClick={() => handleConnectInjected('Browser Wallet')}
            disabled={isConnecting}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 bg-slate-50/80 dark:bg-slate-950/80 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 flex items-center justify-between text-left transition-all group disabled:opacity-60 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Browser Web3 Wallet
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Brave, Rabby, Rainbow, OKX
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
        </div>

        {/* Footer / Helper notice */}
        {!hasInjected && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-sky-400 font-semibold hover:underline"
            >
              <span>Don't have a wallet? Install MetaMask</span>
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
