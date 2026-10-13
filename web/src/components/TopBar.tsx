'use client';

import {
  Briefcase,
  ChevronDown,
  Crown,
  ExternalLink,
  Globe,
  Home,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';
import { NETWORKS, type NetworkId } from '@/config/contracts';
import { addApayTokenToWallet, ensureNetwork, getBasename } from '@/services/blockchain';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  activeTab: string;
  onOpenMobileSidebar: () => void;
  walletAddress: string | null;
  connectWallet: () => void;
  disconnectWallet?: () => void;
  tokenBalance: string;
  isFounder?: boolean;
  activeNetwork?: NetworkId;
  onSelectNetwork?: (networkId: NetworkId) => void;
  onNavigateToLanding?: () => void;
}

const TAB_TITLES: Record<string, { title: string; category: string }> = {
  overview: { title: 'Overview & Contracts', category: 'Core Protocol' },
  mcphub: { title: 'MCP & 402 Simulator', category: 'Autonomous Runtime' },
  paywalls: { title: '1-Click Paywalls', category: 'Merchant Suite' },
  docs: { title: 'Protocol Docs & API Reference', category: 'Developer Documentation' },
  apikeys: { title: 'API Keys & Webhooks', category: 'Developer Gateway' },
  vaults: { title: 'Multi-Agent Vaults', category: 'Escrow Security' },
  staking: { title: 'Tokenomics & Staking', category: 'Protocol Governance' },
  community: { title: 'Community Support & Dev Forum', category: 'Developer Ecosystem' },
  aiguidelines: { title: 'AI Agent Guidelines & System Prompts', category: 'Developer Ecosystem' },
  blog: { title: 'Research & Editorial', category: 'Deep Dives' },
};

export function TopBar({
  activeTab,
  onOpenMobileSidebar,
  walletAddress,
  connectWallet,
  disconnectWallet,
  tokenBalance,
  isFounder,
  activeNetwork = 'base-sepolia',
  onSelectNetwork,
  onNavigateToLanding,
}: TopBarProps) {
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [resolvedBasename, setResolvedBasename] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  useEffect(() => {
    let isCancelled = false;
    if (!walletAddress) {
      setResolvedBasename(null);
      return;
    }

    getBasename(walletAddress, activeNetwork)
      .then((name) => {
        if (!isCancelled) {
          setResolvedBasename(name);
        }
      })
      .catch(() => {
        if (!isCancelled) setResolvedBasename(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [walletAddress, activeNetwork]);

  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: 'Dashboard',
    category: 'Protocol',
  };

  const currentNetworkConfig = NETWORKS[activeNetwork];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNetworkDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNetworkSwitch = async (newNet: NetworkId) => {
    setIsNetworkDropdownOpen(false);
    if (onSelectNetwork) {
      onSelectNetwork(newNet);
    }
    // Also request chain switch in browser wallet if connected
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      await ensureNetwork((window as any).ethereum, newNet);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Dynamic Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden shrink-0">
            <ApayBrandLogo size="sm" />
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
              <span>A-PAY</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-sky-400 font-semibold truncate">
                {currentTabInfo.category}
              </span>
            </div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <span className="truncate">{currentTabInfo.title}</span>
            </h1>
          </div>
        </div>

        {/* Right: Landing Switcher, Network Switcher Toggle, ThemeToggle & Wallet Connection */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Landing Homepage Switcher */}
          {onNavigateToLanding && (
            <button
              type="button"
              onClick={onNavigateToLanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-500/30 text-xs font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer"
              title="Return to Public Landing Page"
            >
              <Home className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Landing Page</span>
            </button>
          )}

          {/* Interactive Multi-Network Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNetworkDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all duration-200 active:scale-95 ${
                activeNetwork === 'base-mainnet'
                  ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 shadow-sm shadow-blue-500/10'
                  : 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
              }`}
              title="Click to switch network between Base Sepolia Testnet and Base Mainnet Production"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    activeNetwork === 'base-mainnet' ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    activeNetwork === 'base-mainnet' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
              <span className="hidden xs:inline sm:inline">
                {currentNetworkConfig.chain.shortName} ({currentNetworkConfig.chain.chainId})
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeNetwork === 'base-mainnet'
                    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {activeNetwork === 'base-mainnet' ? 'PROD' : 'TESTNET'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isNetworkDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Network Dropdown Menu */}
            {isNetworkDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-950/10 dark:shadow-black/40 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  Select Settlement Network
                </div>

                {/* Option 1: Base Sepolia Testnet */}
                <button
                  onClick={() => handleNetworkSwitch('base-sepolia')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    activeNetwork === 'base-sepolia'
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Base Sepolia
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Chain ID: 84532 • Free Faucet
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    TESTNET
                  </span>
                </button>

                {/* Option 2: Base Mainnet Production */}
                <button
                  onClick={() => handleNetworkSwitch('base-mainnet')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all mt-1 ${
                    activeNetwork === 'base-mainnet'
                      ? 'bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Base Mainnet
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Chain ID: 8453 • Native Circle USDC
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    LIVE PROD
                  </span>
                </button>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 px-2 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>Dual-Platform L2 Rail • Zero Gas Lock</span>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle />

          {shortAddr ? (
            <div
              className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition-all ${
                isFounder
                  ? 'bg-amber-50/90 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                  isFounder
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isFounder ? <Crown className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  {resolvedBasename ? (
                    <a
                      href={`https://base.org/name/${resolvedBasename.replace('.base.eth', '').replace('.basetest.eth', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 transition-colors group"
                      title={`Verified Basename on Base L2 (${walletAddress})`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>{resolvedBasename}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span
                      className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200"
                      title={walletAddress || undefined}
                    >
                      {shortAddr}
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isFounder
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-400/30'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30'
                    }`}
                  >
                    {isFounder ? 'FOUNDER' : 'MERCHANT'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
                  <span>{tokenBalance} $APAY</span>
                  <button
                    type="button"
                    onClick={() => addApayTokenToWallet(activeNetwork)}
                    title="Import $APAY token into MetaMask"
                    className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-all font-semibold cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <span>🦊</span>
                    <span>+Add</span>
                  </button>
                </div>
              </div>
              {disconnectWallet && (
                <button
                  onClick={disconnectWallet}
                  title="Disconnect Wallet"
                  className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold tracking-wide shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all duration-200 active:scale-95 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline">Connect Wallet</span>
              <span className="xs:hidden">Connect</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
