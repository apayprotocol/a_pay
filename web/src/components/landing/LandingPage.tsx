'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Coins,
  Copy,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Key,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Package,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Terminal,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { APay } from '@/checkout/checkout';
import { CoinCanvas } from '@/components/3d/CoinCanvas';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getNetworkContracts, NETWORKS, type NetworkId } from '@/config/contracts';

interface LandingPageProps {
  walletAddress: string | null;
  onConnectWallet: () => void;
  onEnterConsole: (targetTab?: string) => void;
  activeNetwork: NetworkId;
  onSelectNetwork: (net: NetworkId) => void;
}

export function LandingPage({
  walletAddress,
  onConnectWallet,
  onEnterConsole,
  activeNetwork,
  onSelectNetwork,
}: LandingPageProps) {
  // Pillar 1 Interactive Demo State (Human vs AI Bot Simulation)
  const [simTrafficType, setSimTrafficType] = useState<'human' | 'bot'>('bot');

  // Pillar 2 Interactive Swarm Step State
  const [activeSwarmNode, setActiveSwarmNode] = useState<number>(2);

  // Pillar 3 Interactive Checkout Test State
  const [checkoutTestStatus, setCheckoutTestStatus] = useState<string | null>(null);

  // The 3 Pillars Sub-Nodes Dropdown State
  const [isPillarsDropdownOpen, setIsPillarsDropdownOpen] = useState(false);
  const pillarsDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pillarsDropdownRef.current &&
        !pillarsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPillarsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const contracts = getNetworkContracts(activeNetwork);

  const handleTestCheckoutPillar = () => {
    setCheckoutTestStatus(null);
    try {
      APay.checkout({
        amount: 45.0,
        currency: 'USDC',
        network: activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia',
        title: 'Cyberpunk Heavyweight Hoodie (Physical E-Commerce)',
        description: 'Instant 2-Second Web3 Checkout Demonstration',
        receiver: contracts.EscrowVault.address,
        orderId: `demo_${Date.now().toString(36)}`,
        onSuccess: (receipt) => {
          setCheckoutTestStatus(
            `Payment Confirmed on Base L2! Tx: ${receipt.txHash.slice(0, 10)}...`,
          );
        },
        onError: (err) => {
          console.warn('Checkout cancelled or closed:', err);
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 selection:bg-blue-500/20 selection:text-blue-500">
      {/* ========================================================================= */}
      {/* 1. DUAL-TIER GLOBAL HEADER ARCHITECTURE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl transition-all duration-300">
        {/* Tier 1: Main Global Brand & Action Bar */}
        <div className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Left: Brand Logo & Protocol Status */}
            <div className="flex items-center gap-3">
              <ApayBrandLogo size="md" withText subtitle="M2M & H2M Protocol" />
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>Base L2 ({contracts.chain.chainId}) • RFC-2068</span>
              </div>
            </div>

            {/* Right: Network Selector, Theme Toggle, Console & Wallet CTAs */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Network Pill Indicator */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] font-mono bg-slate-100/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold">
                  {activeNetwork === 'base-mainnet' ? 'Base Mainnet' : 'Base Sepolia'}
                </span>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Console / Connect Wallet Buttons */}
              {walletAddress ? (
                <button
                  type="button"
                  onClick={() => onEnterConsole('overview')}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Launch Console ({shortAddr})</span>
                  <span className="sm:hidden">Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => onEnterConsole('overview')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Guest Console</span>
                  </button>
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden xs:inline">Connect Wallet</span>
                    <span className="xs:hidden">Connect</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tier 2: Dedicated Sub-Header Navigation Bar */}
        <div className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/95 dark:bg-slate-950/90 shadow-sm backdrop-blur-md relative z-30 overflow-visible">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-visible">
            <div className="flex items-center justify-between gap-2 py-1.5 relative overflow-visible">
              {/* Left: The 3 Pillars Dropdown & Sub-Nodes Flyout (Unclipped) */}
              <div
                className="relative shrink-0 overflow-visible"
                ref={pillarsDropdownRef}
                onMouseEnter={() => setIsPillarsDropdownOpen(true)}
                onMouseLeave={() => setIsPillarsDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPillarsDropdownOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                    isPillarsDropdownOpen
                      ? 'bg-blue-600/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                  aria-expanded={isPillarsDropdownOpen}
                  aria-haspopup="true"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>The 3 Pillars</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 font-bold">
                    3 Rails
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isPillarsDropdownOpen ? 'rotate-180 text-blue-500' : ''
                    }`}
                  />
                </button>

                {/* Sub-Nodes Dropdown Menu */}
                {isPillarsDropdownOpen && (
                  <div className="absolute left-0 top-full pt-1.5 z-[100] w-72 sm:w-84 animate-in fade-in zoom-in-95 duration-150">
                    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-950/20 dark:shadow-black/60 p-2 space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                        <span>Select Architecture Rail</span>
                        <a
                          href="#three-pillars"
                          onClick={() => setIsPillarsDropdownOpen(false)}
                          className="text-[10px] text-blue-600 dark:text-sky-400 hover:underline lowercase font-normal"
                        >
                          view overview
                        </a>
                      </div>

                      {/* Sub-Node 1: 1-Click Paywalls */}
                      <a
                        href="#pillar-paywalls"
                        onClick={() => setIsPillarsDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-500/20 transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                              1-Click Paywalls
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 font-bold">
                              M2M
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            HTTP 402 Auto-Monetization for APIs & Web
                          </div>
                        </div>
                      </a>

                      {/* Sub-Node 2: Agent Vaults */}
                      <a
                        href="#pillar-vaults"
                        onClick={() => setIsPillarsDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/20 transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              Agent Vaults & Escrows
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                              M2M
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Zero-Leak Multi-LLM Swarm Session Keys
                          </div>
                        </div>
                      </a>

                      {/* Sub-Node 3: A-Pay Checkout */}
                      <a
                        href="#pillar-checkout"
                        onClick={() => setIsPillarsDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/20 transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              A-Pay Checkout Gateway
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                              H2M
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            2-Sec Web3 Checkout for Physical & SaaS Stores
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-1 hidden sm:block" />

              {/* Right: Remaining Nav Links (Can scroll on small mobile screens without clipping the dropdown) */}
              <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Research Hub</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold">
                    3 Papers
                  </span>
                </Link>

                <Link
                  href="/checkout-demo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shrink-0"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Demo Store</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                </Link>

                <a
                  href="#telemetry"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shrink-0"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>Base L2 Contracts</span>
                </a>

                <button
                  type="button"
                  onClick={() => onEnterConsole('mcphub')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <Bot className="w-3.5 h-3.5 text-sky-500" />
                  <span>402 Simulator</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterConsole('docs')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <Code2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Docs</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterConsole('community')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Community</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    Dev Forum
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onEnterConsole('aiguidelines')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>AI Guidelines</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                    llms.txt
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Futuristic Ambient Glow Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/15 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Headlines & Call to Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Official Launch & Mainnet Production Milestone Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>BASE MAINNET PRODUCTION LIVE • CHAIN 8453</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Public Launch: October 1, 2026</span>
                </div>
              </div>

              {/* Master Heading */}
              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                The Economic OS for{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                  Autonomous AI Agents
                </span>{' '}
                & Web Commerce
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Sub-cent <strong>HTTP 402 micro-payments</strong> for AI scrapers, non-custodial
                session escrows for multi-agent swarms, and{' '}
                <strong>2-second crypto checkout</strong> for human e-commerce on Base L2. Zero bank
                middlemen, zero chargebacks.
              </p>

              {/* Live Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto lg:mx-0 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Settlement</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    &lt; 2 Seconds
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Protocol Fee</div>
                  <div className="font-bold text-blue-600 dark:text-sky-400 text-sm mt-0.5">
                    1.0% Flat
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Chargeback Risk</div>
                  <div className="font-bold text-purple-600 dark:text-purple-400 text-sm mt-0.5">
                    0.00% Final
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Standard</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    RFC-2068 (402)
                  </div>
                </div>
              </div>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-4">
                <button
                  type="button"
                  onClick={() => (walletAddress ? onEnterConsole('overview') : onConnectWallet())}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 transition-all cursor-pointer"
                >
                  <Wallet className="w-5 h-5" />
                  <span>
                    {walletAddress ? 'Launch Dashboard Console' : 'Connect Wallet & Launch App'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#three-pillars"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors"
                >
                  <span>Explore 3-Pillar Ecosystem</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </a>

                <Link
                  href="/blog"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs font-mono font-bold text-blue-600 dark:text-sky-400 hover:underline"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read 3 Research Papers</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Interactive 3D Mecha Robotic Token Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[380px] aspect-square rounded-3xl bg-gradient-to-br from-white/80 via-blue-50/40 to-indigo-50/20 dark:from-slate-900/80 dark:via-slate-950 dark:to-blue-950/30 border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
                  <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE 3D QUANTUM CORE
                  </span>
                  <span>BASE L2 ({contracts.chain.chainId})</span>
                </div>

                {/* 3D WebGL Canvas Component */}
                <div className="w-full h-[270px] flex items-center justify-center">
                  <CoinCanvas />
                </div>

                <div className="w-full text-center text-[10px] font-mono text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                  Interactive WebGL Core • $APAY Token Reactor Engine
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2.5 BASE MAINNET PRODUCTION VERIFIED INFRASTRUCTURE & TOKENOMICS */}
      {/* ========================================================================= */}
      <section className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Base Mainnet Production Rail (Chain ID: 8453)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-bold">
                  Official Launch: Oct 1, 2026
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Battle-Tested On-Chain Infrastructure & Deflationary Economics
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                <span>Aerodrome DEX Pool</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://dexscreener.com/base/0x6933dd2B7D72d8561005E475AFa147E47A3c7777"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold transition-all"
              >
                <span>DexScreener Chart</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1: First-Mover AI Moat */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400 font-bold text-xs font-mono">
                  <Zap className="w-4 h-4" />
                  <span>FIRST-MOVER AI PROTOCOL</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 font-bold">
                  HTTP 402 Rail
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monetizing the AI Scraping Boom
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                As millions of autonomous agents query the web, A-Pay solves the scraping crisis by
                converting crawler requests into automated micropayments, keeping browsing 100% free
                for regular humans.
              </p>
            </div>

            {/* Feature 2: Hyper-Deflationary Tokenomics */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono">
                  <Flame className="w-4 h-4" />
                  <span>30% BUYBACK & BURN</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                  Deflationary
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                100M Fixed Cap & Continuous Burn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Strict 100,000,000 $APAY hard cap with zero inflation. 30% of every protocol fee
                collected from merchant checkouts and API paywalls is automatically routed to
                Aerodrome to buy back and burn tokens on Base Mainnet.
              </p>
            </div>

            {/* Feature 3: Verified BaseScan Smart Contracts */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                  <ShieldCheck className="w-4 h-4" />
                  <span>VERIFIED SMART CONTRACTS</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  BaseScan Verified
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Solidity Suite (Base 8453)
              </h3>
              <div className="space-y-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>$APAY Token:</span>
                  <a
                    href="https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>0x8dd4...66c3</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span>APayRouterV2:</span>
                  <a
                    href="https://basescan.org/address/0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>0x452e...e854</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span>EscrowVault:</span>
                  <a
                    href="https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>0xd08c...ea16</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. THE 3-PILLAR ECOSYSTEM (THE CORE OF A-PAY) */}
      {/* ========================================================================= */}
      <section
        id="three-pillars"
        className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16"
      >
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>CORE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            The 3-Pillar Payment Ecosystem
          </h2>
          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Three dedicated payment rails purpose-built for sellers, autonomous AI buyers, and
            traditional human merchants.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* PILLAR 1: 1-CLICK PAYWALLS (M2M SELLERS & WEB OWNERS) */}
        {/* ========================================================================= */}
        <div
          id="pillar-paywalls"
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-10 transition-all scroll-mt-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-mono font-bold text-xs">
                  PILLAR 01
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono font-semibold text-xs border border-blue-500/20">
                  M2M • SELLERS & PUBLISHERS
                </span>
                <span className="text-slate-400 text-xs font-mono">• RFC-2068 HTTP 402</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                ⚡ 1-Click Paywalls: Stop Subsidizing AI Scrapers & Monetize Server Wakeups
              </h3>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>For:</strong> Website owners, SaaS documentation portals, tech blogs, API
                  providers, and high-value databases.
                </p>
                <p>
                  <strong>The Problem:</strong> AI crawlers (GPTBot, ClaudeBot, Perplexity) crawl
                  50,000+ times a month, waking up cold serverless databases and racking up
                  bandwidth bills without showing ads or subscribing.
                </p>
                <p>
                  <strong>The Solution:</strong> Drop-in Cloudflare Worker or Next.js middleware
                  challenges automated bots with <strong>HTTP 402 Payment Required</strong> ($0.001
                  - $0.005 USDC). Meanwhile, <strong>real humans browse 100% free</strong> with zero
                  interruptions or CAPTCHAs!
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ &lt; 15ms Latency
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ 100% SEO Whitelisted for Googlebot
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Free for Real Humans
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/blog?issue=paywalls"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Issue #01 Master Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => onEnterConsole('paywalls')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Deploy Paywall Middleware</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Simulator */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-950 p-5 text-slate-200 border border-slate-800 font-mono text-xs space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-slate-400 font-bold uppercase text-[11px]">
                    Interactive Edge Simulator
                  </span>
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setSimTrafficType('human')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                        simTrafficType === 'human'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Human Browser
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimTrafficType('bot')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                        simTrafficType === 'bot'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      AI Scraper Bot
                    </button>
                  </div>
                </div>

                {simTrafficType === 'human' ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="text-slate-500"># Inbound Human Visitor (Chrome on iOS)</div>
                    <div className="text-slate-300">GET /api/deep-research HTTP/1.1</div>
                    <div className="text-slate-300">
                      Sec-CH-UA: &quot;Google Chrome&quot;;v=&quot;128&quot;
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>HTTP 200 OK — 100% Free Pass</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Zero crypto wallet required. Zero popup friction. Reader retains full
                        access.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div className="text-slate-500"># Inbound AI Bot (GPTBot/1.2 or Scrapy)</div>
                    <div className="text-slate-300">GET /api/deep-research HTTP/1.1</div>
                    <div className="text-slate-300">User-Agent: GPTBot/1.2 (Headless Crawler)</div>
                    <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-sky-400 space-y-1">
                      <div className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                        <Zap className="w-4 h-4" />
                        <span>HTTP 402 Payment Required</span>
                      </div>
                      <div>X-APay-Amount: 2000 (0.002 USDC)</div>
                      <div>X-APay-Nonce: f81d-4fae-7dec-11d0</div>
                      <div className="text-[10px] text-emerald-400 font-bold mt-1">
                        ✓ Bot SDK auto-signs & pays micro-cent in 4ms!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PILLAR 2: AGENT VAULTS & SESSION ESCROWS (M2M BUYERS & SWARMS) */}
        {/* ========================================================================= */}
        <div
          id="pillar-vaults"
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-10 transition-all scroll-mt-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs">
                  PILLAR 02
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-semibold text-xs border border-indigo-500/20">
                  M2M • BUYERS & SWARMS
                </span>
                <span className="text-slate-400 text-xs font-mono">• Base L2 EscrowVault</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                🛡️ Agent Vaults & Session Escrows: Zero-Leak Swarm Collaboration
              </h3>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>For:</strong> AI Agent Engineers, Swarm Architects, Autonomous Micro-SaaS
                  Founders, and Multi-Model Workflows.
                </p>
                <p>
                  <strong>The Problem:</strong> Handing an AI agent an unconstrained private key or
                  corporate credit card is fatal. A prompt injection or infinite hallucination loop
                  can drain the entire company treasury within minutes.
                </p>
                <p>
                  <strong>The Solution:</strong> The{' '}
                  <strong>&ldquo;Cooked at the Gate&rdquo;</strong> paradigm. Operators deposit
                  funds once into non-custodial{' '}
                  <code className="text-indigo-600 dark:text-indigo-400 font-bold">
                    EscrowVault.sol
                  </code>
                  . Agents receive ephemeral session keys with strict daily budget locks ($2.00/day
                  max risk). Google Gemini hires Claude 3.5 Sonnet to compile Rust code at the gate
                  — zero prompt leaks, zero database exposure!
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ 100% Non-Custodial
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ Cryptographic Circuit Breaker
                </span>
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                  ✓ Cross-Model Swarms (Gemini ↔ Claude)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/blog?issue=vaults"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Issue #02 Master Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => onEnterConsole('vaults')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Manage Agent Vaults</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Node Flow Visualizer */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-950 p-5 text-slate-200 border border-slate-800 font-mono text-xs space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-slate-400 font-bold uppercase text-[11px]">
                    Swarm Node Visualizer
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold">
                    Cooked at the Gate Flow
                  </span>
                </div>

                {/* 4 Interactive Flow Nodes */}
                <div className="space-y-2">
                  {[
                    {
                      id: 1,
                      title: '1. Gemini Planner',
                      sub: 'Identifies Rust ZK coding task',
                      status: 'Orchestrator',
                    },
                    {
                      id: 2,
                      title: '2. HTTP 402 Gatekeeper',
                      sub: 'Issues $0.04 micro-challenge',
                      status: 'Perimeter Boundary',
                    },
                    {
                      id: 3,
                      title: '3. Claude Worker Sandbox',
                      sub: 'Executes & compiles isolated code',
                      status: 'Zero Data Leak',
                    },
                    {
                      id: 4,
                      title: '4. Base L2 Escrow Settlement',
                      sub: 'Atomic 0.04 USDC transfer',
                      status: 'Cold Vault Safe',
                    },
                  ].map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setActiveSwarmNode(node.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                        activeSwarmNode === node.id
                          ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{node.title}</div>
                        <div className="text-[10px] text-slate-400">{node.sub}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                        {node.status}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-200">
                  <strong>Security Guarantee:</strong> Even if Gemini or Claude is jailbroken, the
                  maximum risk is capped to the 24-hour daily session budget. 96% of cold treasury
                  funds are 100% untouchable on-chain.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PILLAR 3: A-PAY CHECKOUT GATEWAY (H2M / H2B HUMAN COMMERCE) */}
        {/* ========================================================================= */}
        <div
          id="pillar-checkout"
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-10 transition-all scroll-mt-32"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs">
                  PILLAR 03
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-xs border border-emerald-500/20">
                  H2M / H2B • HUMAN COMMERCE
                </span>
                <span className="text-slate-400 text-xs font-mono">• Physical & SaaS Goods</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                💳 A-Pay Checkout Gateway: The Web3 Alternative to Traditional Processors
              </h3>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>For:</strong> E-commerce stores (Shopify / WooCommerce), SaaS startups,
                  digital creators, course sellers, and hardware merchants.
                </p>
                <p>
                  <strong>The Problem:</strong> Traditional processors (Stripe, PayPal) charge 2.9%
                  + $0.30, delay payouts by 3 to 7 days, decline 15-20% of international cards, and
                  leave merchants vulnerable to 90-day fraudulent chargebacks.
                </p>
                <p>
                  <strong>The Solution:</strong> Embed A-Pay Checkout via 1-line script or React
                  button. Real human shoppers pay in 1 click or scan a mobile QR code with FaceID.
                  Payments settle directly into your private wallet in{' '}
                  <strong>under 2 seconds</strong> with
                  <strong> 0% chargebacks</strong> and a flat 1.0% fee.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ &lt; 2s Settlement
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  ✓ 0.00% Chargebacks (Cryptographic Finality)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ 1.0% Flat Fee (Zero Fixed Surcharge)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/blog?issue=checkout"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Issue #03 Master Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/checkout-demo"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Visit Full Demo Store</span>
                </Link>
              </div>
            </div>

            {/* Right Interactive Checkout Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-950 p-6 text-slate-200 border border-slate-800 font-mono text-xs space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-slate-400 font-bold uppercase text-[11px]">
                    Live Checkout Simulator
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Base L2 Verified</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Sample Order:
                  </div>
                  <div className="font-bold text-white text-sm">Cyberpunk Heavyweight Hoodie</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Due:</span>
                    <span className="text-emerald-400 font-bold text-base">$45.00 USDC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestCheckoutPillar}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Test Real A-Pay Checkout Modal ($45)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {checkoutTestStatus && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    ✓ {checkoutTestStatus}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 text-center">
                  Supports Coinbase Wallet, MetaMask, Phantom, Rainbow & 1-Tap Mobile QR Scan.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BASE L2 PROTOCOL TELEMETRY & VERIFIED CONTRACTS */}
      {/* ========================================================================= */}
      <section
        id="telemetry"
        className="py-12 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-blue-600 dark:text-sky-400 font-bold uppercase tracking-wider">
                Audited On-Chain Infrastructure
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Live Base L2 Protocol Telemetry
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ChainID: {NETWORKS[activeNetwork].chain.chainId}</span>
              <span>• {NETWORKS[activeNetwork].chain.chainName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="text-slate-500 text-[11px]">ESCROW VAULT (SESSION ESCROWS)</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {contracts.EscrowVault.address}
              </div>
              <a
                href={`${NETWORKS[activeNetwork].chain.explorerUrl}/address/${contracts.EscrowVault.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-sky-400 text-[11px] flex items-center gap-1 hover:underline pt-0.5"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="text-slate-500 text-[11px]">APAY ROUTER (402 SETTLEMENT)</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {contracts.APayRouterV2.address}
              </div>
              <a
                href={`${NETWORKS[activeNetwork].chain.explorerUrl}/address/${contracts.APayRouterV2.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-sky-400 text-[11px] flex items-center gap-1 hover:underline pt-0.5"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="text-slate-500 text-[11px]">NATIVE TOKEN (ERC-20 UTILITY)</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {contracts.APAYToken.address}
              </div>
              <a
                href={`${NETWORKS[activeNetwork].chain.explorerUrl}/address/${contracts.APAYToken.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-sky-400 text-[11px] flex items-center gap-1 hover:underline pt-0.5"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. LEGAL TRADEMARK DISCLAIMER & GLOBAL FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Trademark & Nominative Fair Use Statement</span>
            </div>
            <p>
              Stripe®, PayPal®, Visa®, Mastercard®, Shopify®, WooCommerce®, Gumroad®, Google®,
              Gemini®, Anthropic®, Claude®, OpenAI®, ChatGPT®, DeepSeek®, ByteDance®, Apple®, and
              Microsoft® are registered trademarks of their respective owners. Their mention herein
              is strictly for factual comparative analysis, architectural benchmarking, educational
              commentary, and technical interoperability under nominative fair use principles. A-Pay
              is an independent open-source protocol and is not affiliated with, sponsored by, or
              endorsed by any of the aforementioned entities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-spatial font-black text-slate-900 dark:text-white">
                A-PAY PROTOCOL
              </span>
              <span>• The Universal M2M & H2M Payment Rail on Base L2</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <a
                href="mailto:contact@apayprotocol.org"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 font-medium transition-colors"
                title="Official Support: contact@apayprotocol.org"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>contact@apayprotocol.org</span>
              </a>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span>Non-Custodial Architecture • 100M Fixed Token Cap • Audited Solidity</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
