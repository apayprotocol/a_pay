import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Coins,
  Cpu,
  CreditCard,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Key,
  Layers,
  Lock,
  Mail,
  Printer,
  Scale,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';

export const metadata: Metadata = {
  title: 'Official Technical Whitepaper | A-Pay Protocol',
  description:
    'Comprehensive technical whitepaper for A-Pay Protocol: Machine-to-Machine (M2M) HTTP 402 Paywalls, Multi-Agent Ephemeral Session Escrows, and $APAY Tokenomics on Base L2.',
  openGraph: {
    title: 'A-Pay Protocol Technical Whitepaper',
    description:
      'The Universal Machine-to-Machine (M2M) & Human-to-Machine (H2M) Payment Rail on Base L2.',
    url: 'https://apayprotocol.org/whitepaper',
    images: [{ url: 'https://apayprotocol.org/brand/apay-official-logo.png' }],
  },
};

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-500">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <ApayBrandLogo size={28} />
            <span className="font-spatial font-black text-sm text-slate-900 dark:text-white tracking-wide">
              A-PAY PROTOCOL
            </span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full hidden sm:inline">
            Technical Whitepaper v1.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            Console
          </Link>
          <a
            href="https://github.com/apayprotocol/a_pay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href="/telegram"
            className="text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-500/20 px-3 py-1.5 rounded-lg hover:bg-sky-500/15 transition-all flex items-center gap-1.5"
          >
            <span>Telegram</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </a>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        {/* Document Title Header */}
        <div className="text-center space-y-4 border-b border-slate-200 dark:border-slate-800 pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-mono font-bold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Protocol Specification</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-spatial font-black text-slate-950 dark:text-white tracking-tight leading-tight">
            A-Pay Protocol Technical Whitepaper
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The Universal Machine-to-Machine (M2M) & Human-to-Machine (H2M) Micropayment Rail on
            Base Layer 2.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2">
            <span>Published: October 2026</span>
            <span>•</span>
            <span>Version: 1.0 (Base Mainnet Genesis)</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Base Mainnet: 8453
            </span>
          </div>
        </div>

        {/* Abstract Box */}
        <section className="p-6 sm:p-8 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Abstract</span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            As autonomous Artificial Intelligence (AI) agents proliferate across the internet, the
            web faces two unprecedented structural crises: (1){' '}
            <strong>The Unmetered Scraping Crisis</strong>, where commercial LLM crawlers exhaust
            server compute without compensating website owners; and (2)
            <strong>The AI Financial Disenfranchisement Crisis</strong>, wherein autonomous agents
            lack legal identities, bank accounts, and credit card credentials necessary to pay for
            proprietary data and tools.
          </p>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong>A-Pay Protocol</strong> solves this dilemma by introducing an open-source,
            RFC-compliant
            <strong> HTTP 402 (Payment Required)</strong> protocol integrated with Base Layer 2.
            A-Pay enables real-time, sub-second micropayments through EIP-712 cryptographic
            authorization, budget-capped session escrows (`EscrowVault.sol`), and a deflationary
            100,000,000 fixed-supply utility token (`$APAY`), while allowing normal human visitors
            to browse 100% free with zero paywalls.
          </p>
        </section>

        {/* Section 1: The Three Pillars */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-spatial font-bold text-sm">
              1
            </div>
            <h2 className="text-2xl font-spatial font-bold text-slate-900 dark:text-white">
              The Three Architectural Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div className="font-spatial font-bold text-base text-slate-900 dark:text-white">
                Pillar 1: M2M AI Paywall
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Drop-in middleware (FastAPI, Next.js, Cloudflare, WordPress) that detects automated
                AI bots and prompts HTTP 402 challenge headers. Bots pay micro-cents per query via
                Base L2 vouchers; human browsers pass through completely free ($0.00).
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="font-spatial font-bold text-base text-slate-900 dark:text-white">
                Pillar 2: Agent Session Escrows
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Non-custodial smart contract (`EscrowVault.sol`) enabling multi-agent swarms
                (LangChain, CrewAI, AutoGen, Claude Desktop) to operate with ephemeral,
                budget-capped sub-wallet session keys. Master treasuries are 100% immune to prompt
                injection drain.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="font-spatial font-bold text-base text-slate-900 dark:text-white">
                Pillar 3: Web3 Checkout Gateway
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                A 46KB standalone JavaScript checkout widget (`v1.js`) delivering 2-second on-chain
                settlement for physical e-commerce and digital SaaS. 0% chargebacks, low fees, and
                instant merchant non-custodial receipt.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Tokenomics & Economic Model */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-spatial font-bold text-sm">
              2
            </div>
            <h2 className="text-2xl font-spatial font-bold text-slate-900 dark:text-white">
              $APAY Tokenomics & Deflationary Flywheel
            </h2>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Total Supply</div>
                <div className="font-outfit text-2xl font-black text-amber-400">100,000,000</div>
                <div className="text-[10px] text-slate-400 font-mono">100M Fixed (No Minting)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Token Standard</div>
                <div className="font-outfit text-2xl font-black text-sky-400">ERC-20</div>
                <div className="text-[10px] text-slate-400 font-mono">18 Decimals on Base L2</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Buyback & Burn</div>
                <div className="font-outfit text-2xl font-black text-orange-400">30%</div>
                <div className="text-[10px] text-slate-400 font-mono">Of all protocol fees</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Human Tax</div>
                <div className="font-outfit text-2xl font-black text-emerald-400">$0.00</div>
                <div className="text-[10px] text-slate-400 font-mono">100% Free Browsing</div>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-6">
              <h3 className="font-spatial font-bold text-base text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>The Automated 30% Deflationary Burn Flywheel</span>
              </h3>
              <p>
                Every time an autonomous AI crawler pays for an API call or a customer checks out
                through an A-Pay gateway, a nominal protocol fee (1.0%) is processed by
                `APayRouterV2.sol`.
                <strong>
                  {' '}
                  30% of this collected fee is programmatically routed to Aerodrome DEX
                </strong>{' '}
                on Base Mainnet to execute continuous market buybacks of `$APAY` tokens, which are
                then permanently sent to the Ethereum dead burn address
                (`0x000000000000000000000000000000000000dEaD`).
              </p>
              <p>
                Because the supply of `$APAY` is hard-capped at 100,000,000 with zero mint functions
                in bytecode, increased M2M transaction volume induces structural, continuous supply
                deflation.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Verified On-Chain Deployments */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-spatial font-bold text-sm">
              3
            </div>
            <h2 className="text-2xl font-spatial font-bold text-slate-900 dark:text-white">
              Verified Base Mainnet Infrastructure (Chain ID: 8453)
            </h2>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              All core protocol contracts are deployed, open-source, and verified on BaseScan:
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    $APAY Token Contract
                  </span>
                  <span className="text-[11px] text-slate-500">Fixed 100M supply ERC-20</span>
                </div>
                <a
                  href="https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
                >
                  <span>0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    EscrowVault (Multi-Agent Session Keys)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Non-custodial ephemeral budget enforcement
                  </span>
                </div>
                <a
                  href="https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
                >
                  <span>0xd08c8a337e5339d1c083e06d74a9265956ceea16</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    APayRouterV2 (Enterprise Router & Buyback Engine)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Automated 30% Aerodrome DEX buyback routing
                  </span>
                </div>
                <a
                  href="https://basescan.org/address/0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
                >
                  <span>0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    StakingVault (Agent Collateral & Slashing)
                  </span>
                  <span className="text-[11px] text-slate-500">Anti-spam agent bond staking</span>
                </div>
                <a
                  href="https://basescan.org/address/0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
                >
                  <span>0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Aerodrome Finance DEX Liquidity Pool
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Active on-chain swap pair ($APAY / WETH)
                  </span>
                </div>
                <a
                  href="https://dexscreener.com/base/0x6933dd2B7D72d8561005E475AFa147E47A3c7777"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
                >
                  <span>0x6933dd2B7D72d8561005E475AFa147E47A3c7777</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Leadership, Transparency & Governance */}
        <section
          id="leadership"
          className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-spatial font-bold text-sm">
              4
            </div>
            <h2 className="text-2xl font-spatial font-bold text-slate-900 dark:text-white">
              Protocol Leadership & Core Governance
            </h2>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Founder Avatar */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-lg shrink-0 bg-slate-800">
                <img
                  src="/brand/sagar-yadav.png"
                  alt="Sagar Yadav - Founder of A-Pay Protocol"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-spatial font-bold text-xl text-slate-950 dark:text-white">
                    Sagar Yadav
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300">
                    <UserCheck className="w-3 h-3" />
                    Verified Founder & Architect
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Protocol Founder & Lead Architect • Base L2 Smart Contracts & Machine-to-Machine
                  Systems
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  Lead architect of A-Pay Protocol. Architect of RFC-compliant HTTP 402
                  micro-settlement gateways, non-custodial session key escrow vaults for autonomous
                  agent swarms, and open-source developer tooling for the decentralized AI economy.
                </p>
              </div>
            </div>

            {/* Founder Verification Rails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <a
                href="https://www.linkedin.com/in/sagar-yadav-6b0804182/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    LinkedIn Profile
                  </span>
                  <span className="text-[10px] text-slate-500">Sagar Yadav</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              </a>

              <a
                href="https://base.org/name/apayprotocol"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Basename (ENS)
                  </span>
                  <span className="text-[10px] text-slate-500">apayprotocol.base.eth</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              </a>

              <a
                href="https://github.com/apayprotocol"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    GitHub Org
                  </span>
                  <span className="text-[10px] text-slate-500">github.com/apayprotocol</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              </a>

              <a
                href="mailto:founder@apayprotocol.org"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Direct Inquiries
                  </span>
                  <span className="text-[10px] text-slate-500">founder@apayprotocol.org</span>
                </div>
                <Mail className="w-3.5 h-3.5 text-blue-500" />
              </a>
            </div>
          </div>
        </section>

        {/* Action Bar / Return to App */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-spatial font-bold text-xl">Ready to Integrate A-Pay Protocol?</h3>
            <p className="text-xs text-blue-100">
              Integrate M2M paywalls with 1 command (`npx apay protect`) or install SDK packages.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-8 text-center text-xs text-slate-500">
        <p>A-Pay Protocol • Canonical Domain: https://apayprotocol.org • Base L2 (Chain 8453)</p>
      </footer>
    </div>
  );
}
