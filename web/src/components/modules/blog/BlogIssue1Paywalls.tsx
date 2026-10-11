'use client';

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Cpu,
  Database,
  DollarSign,
  Eye,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  Newspaper,
  Percent,
  Server,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface BlogIssue1PaywallsProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
  onSwitchIssue?: (issueId: 'paywalls' | 'vaults') => void;
}

export function BlogIssue1Paywalls({
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
  onSwitchIssue,
}: BlogIssue1PaywallsProps) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Interactive ROI Calculator State
  const [monthlyBotHits, setMonthlyBotHits] = useState<number>(50000);
  const [chargePerHit, setChargePerHit] = useState<number>(0.002);
  const [avgDbWakeupCost, setAvgDbWakeupCost] = useState<number>(0.0008);

  // Active Code Platform in Blog
  const [codePlatform, setCodePlatform] = useState<
    'cloudflare' | 'nextjs' | 'python' | 'express' | 'cli'
  >('cloudflare');

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const contracts = getNetworkContracts(activeNetwork);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareOnX = () => {
    if (typeof window !== 'undefined') {
      const tweetText = encodeURIComponent(
        'AI bots & crawlers hit websites 50k+ times a month, waking up databases and running up cloud bills with zero ad views.\n\n⚡ HTTP 402 fixes this: humans browse 100% free, AI bots pay micro-cents.\n\nRead the @APayNetwork deep dive:',
      );
      const url = encodeURIComponent(window.location.href);
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const testCurlCommand = `curl -i -A "GPTBot/1.2" https://apay-network.vercel.app/api/ping`;

  // Calculations
  const monthlyUnprotectedLoss = Math.round(monthlyBotHits * avgDbWakeupCost * 100) / 100;
  const monthlyGrossApayRevenue = Math.round(monthlyBotHits * chargePerHit * 100) / 100;
  const monthlyProtocolFee = Math.round(monthlyGrossApayRevenue * 0.01 * 100) / 100;
  const monthlyNetProfit = Math.round((monthlyGrossApayRevenue - monthlyProtocolFee) * 100) / 100;

  const faqs = [
    {
      q: 'Will enabling HTTP 402 paywall damage my Google or Bing SEO rankings?',
      a: 'Absolutely not! A-Pay uses strict dual-path bot identification. Official search indexing bots like Googlebot, Bingbot, and DuckDuckBot can be explicitly whitelisted via reverse-DNS verification or user-agent matching. They receive the standard 200 OK HTML payload without any payment challenge, preserving 100% of your search engine indexing and Core Web Vitals.',
    },
    {
      q: 'Do real human visitors on Chrome, Safari, or Mobile ever see a payment screen?',
      a: 'Never. Real humans browsing your website from standard web browsers browse 100% free with zero interruptions. The paywall middleware automatically inspects browser headers (Sec-CH-UA, cookies, accepted mime types). Only headless scraping frameworks, curl scripts, Python httpx bots, and automated AI agents (like LangChain or CrewAI) are served the HTTP 402 challenge.',
    },
    {
      q: 'How can an autonomous AI bot pay on its own without a human entering a credit card?',
      a: 'Autonomous AI agents utilize in-memory EVM/Solana wallets and session keys (EIP-712). When the agent encounters an HTTP 402 response, its client SDK (like A-Pay Python Session or MCP tool) reads the price and cryptographic nonce, signs a payment authorization in under 5 milliseconds, attaches the signature to the Authorization header, and retries the request seamlessly.',
    },
    {
      q: 'Why can’t I just use Stripe for these micro-transactions?',
      a: 'Traditional payment rails like Stripe or PayPal charge a fixed fee of $0.30 plus 2.9% on every transaction. If you want to charge an AI bot $0.001 (a tenth of a cent) to scrape a page, a $0.30 fixed fee makes micropayments mathematically impossible. A-Pay runs on Base L2 with sub-cent gas fees and charges a flat 1.0% protocol fee with zero minimum fixed overhead.',
    },
    {
      q: 'What currency do I receive as a website owner?',
      a: 'You can choose to receive native Base USDC (for pure dollar-pegged stability) or $APAY protocol tokens (offering zero-friction utility and 25% discounts). Funds land directly into your own non-custodial crypto wallet address without intermediary holding periods.',
    },
    {
      q: 'What happens if an AI scraper refuses to pay the HTTP 402 challenge?',
      a: 'If a bot does not submit a valid cryptographic micropayment signature, the middleware halts execution at the edge and serves only the minimal 402 JSON payload. Your origin server, database, and backend APIs never execute, saving 99.8% of your CPU, memory, and database connection overhead.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Article Hero Section */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-sky-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950/40 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 backdrop-blur-2xl shadow-xl shadow-blue-500/5 dark:shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-sky-400 font-semibold shadow-xs">
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>CORE ARCHITECTURE DEEP DIVE</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Protocol Research Series #01
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>14 min deep read</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-500 dark:text-slate-400">September 2026 Edition</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            ⚡ 1-Click Paywalls (HTTP 402 Auto-Monetization)
            <span className="block text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 mt-2">
              The M2M Machine-to-Machine Revolution: Stop Subsidizing AI Scrapers & Turn Server
              Drain into Instant Micro-Revenue
            </span>
          </h1>

          {/* Subtitle / Abstract */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
            A comprehensive architectural analysis for website owners, SaaS founders, and content
            creators. Learn why unmetered AI bots are quietly draining your cloud infrastructure
            bills, how the revived <strong>HTTP 402 standard</strong> transforms uninvited scrapers
            into high-margin paying clients, and why your human visitors will continue browsing{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              100% free and uninterrupted
            </span>
            .
          </p>

          {/* Live Trust Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-200/80 dark:border-slate-800/80 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                LATENCY GUARANTEE
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">&lt; 15 ms</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Off-chain verification
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                PROTOCOL FEE
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">1.0% Flat</div>
              <div className="text-[10px] text-sky-600 dark:text-sky-400">$0.00 fixed minimum</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                SETTLEMENT RAIL
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                Base L2 (EVM)
              </div>
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                Circle Native USDC
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                HUMAN PASSTHROUGH
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                100% Free
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Zero friction/paywalls
              </div>
            </div>
          </div>

          {/* Author & Action Toolbar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                AP
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>A-Pay Protocol Engineering Group</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Autonomous Economics & Edge Security Core
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareOnX}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Share on X (Twitter)</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {onSwitchIssue && (
                <button
                  type="button"
                  onClick={() => onSwitchIssue('vaults')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <span>Read Issue #02: Agent Vaults</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Quick Table of Contents Bar */}
      <nav className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 backdrop-blur-xl shadow-xs">
        <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>Curated Table of Contents (13 Core Sections)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <a
            href="#sec-census"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">01.</span> The
            2026 AI Scraper Census
          </a>
          <a
            href="#sec-crisis"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">02.</span> Server
            Wakeup & DB Drain
          </a>
          <a
            href="#sec-legacy"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">03.</span> Why
            robots.txt & Captchas Fail
          </a>
          <a
            href="#sec-http402"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">04.</span> The
            Rebirth of HTTP 402 Standard
          </a>
          <a
            href="#sec-flow"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">05.</span> 7-Step
            M2M Protocol Execution Flow
          </a>
          <a
            href="#sec-dualpath"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">06.</span>{' '}
            Dual-Path: Humans Stay 100% Free
          </a>
          <a
            href="#sec-bot-matrix"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">07.</span> Bot
            Classification & Whitelist Matrix
          </a>
          <a
            href="#sec-archetypes"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">08.</span> 8
            Website Archetypes That Need This
          </a>
          <a
            href="#sec-calculator"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">09.</span>{' '}
            Interactive ROI Calculator
          </a>
          <a
            href="#sec-liveproof"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">10.</span> Live
            Terminal Test Proof
          </a>
          <a
            href="#sec-economics"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">11.</span> Stripe
            vs. A-Pay Protocol Economics
          </a>
          <a
            href="#sec-code"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">12.</span>{' '}
            60-Second Drop-In Code Integrations
          </a>
          <a
            href="#sec-trust"
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <span className="text-blue-600 dark:text-sky-400 font-mono font-bold">13.</span>{' '}
            On-Chain Trust & Security FAQ
          </a>
        </div>
      </nav>

      {/* SECTION 01: THE 2026 AI SCRAPER CENSUS */}
      <section
        id="sec-census"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Eye className="w-4 h-4" />
          <span>Section 01 • The 2026 AI Scraper Census</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Who Is Crawling Your Website Right Now? (And What Are They Paying?)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Cloudflare and web analytics data in 2026 shows that over <strong>62%</strong> of all
          inbound requests across independent SaaS apps, documentation portals, and blogs are
          generated by automated machine agents. Here is the unvarnished census of who is consuming
          your bandwidth today:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                OpenAI GPTBot
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                $0.00 Paid
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Scrapes entire sitemaps for model training and real-time ChatGPT web browsing answers.
            </div>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
              Avg: 45,000 req/mo
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">AnthropicBot</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                $0.00 Paid
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Fetches high-density documentation and code repositories for Claude Desktop context.
            </div>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
              Avg: 28,000 req/mo
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Perplexity</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                $0.00 Paid
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Deep research synthesis crawlers reading dynamic articles without driving human click
              traffic.
            </div>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
              Avg: 60,000 req/mo
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Swarm Proxies
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
                $0.00 Paid
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Headless Python/Scrapy bots running through 70M residential proxy IPs to bypass IP
              bans.
            </div>
            <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
              Avg: 110,000 req/mo
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02: THE AI SCRAPER CRISIS */}
      <section
        id="sec-crisis"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider font-semibold">
          <AlertTriangle className="w-4 h-4" />
          <span>Section 02 • The Silent Infrastructure Bleed</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The AI Scraper Crisis: Why Your Servers Wake Up Constantly With Zero Revenue Return
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed text-sm sm:text-base">
          <p>
            If you operate any modern web application, technical blog, SaaS documentation portal, or
            database directory, your server infrastructure is likely under 24/7 unmetered
            surveillance. Autonomous AI agents and LLM search scrapers traverse your entire sitemap
            multiple times per day.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <Database className="w-4 h-4" />
                <span>Cold Starts & Database Wakeups</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Serverless databases (Supabase, Neon, AWS Aurora) wake up from low-power states to
                serve scrapers, racking up compute unit (ACU) fees while you sleep.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Exhausted Connection Pools</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                High-concurrency bot swarms trigger heavy SSR and API endpoints, consuming database
                connection pools and causing 504 timeouts for legitimate human customers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <DollarSign className="w-4 h-4" />
                <span>Zero Value Reciprocity</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Bots don't click Google Ads, don't view affiliate banners, and don't convert into
                paying SaaS subscribers. They take all your proprietary intelligence for zero
                compensation.
              </p>
            </div>
          </div>
          <p>
            This dynamic creates a profound economic imbalance: <strong>data parasitism</strong>.
            Billion-dollar AI companies synthesize and commercialize your curated content, yet you
            are left holding the bill for high-frequency cloud hosting, bandwidth egress
            ($0.08–$0.12 per GB), and backend API queries.
          </p>
        </div>
      </section>

      {/* SECTION 03: WHY LEGACY DEFENSES FAIL */}
      <section
        id="sec-legacy"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Section 03 • The Breakdown of Traditional Defense</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Why `robots.txt`, Cloudflare Turnstile, and IP Bans No Longer Work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-mono">1.</span> `robots.txt`
              is an Honor System
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              `robots.txt` was invented in 1994. It is merely a voluntary advisory. Modern
              open-source scraping libraries (Crawlee, Scrapy, Puppeteer-stealth) explicitly bypass
              it by default. Malicious or aggressive scrapers simply disregard your exclusion rules.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-mono">2.</span> CAPTCHAs Ruin
              Human Conversion
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Throwing Cloudflare Turnstile or reCAPTCHA puzzles in front of your site harms real
              users. Mobile shoppers abandon carts, reader bounce rates surge by 35%+, and modern AI
              vision models can solve CAPTCHAs faster and more reliably than humans anyway.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-mono">3.</span> IP Bans Cause
              Collateral Damage
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              AI scraping swarms route through residential proxy pools (BrightData, Oxylabs) with
              over 70 million rotating home IP addresses. Blocking an IP subnet frequently locks out
              innocent residential customers on cellular networks or broadband providers.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 text-xs sm:text-sm text-blue-900 dark:text-sky-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <p>
            <strong>The Core Insight:</strong> The solution is not to wage an endless, unwinnable
            war trying to block AI scrapers. The solution is to{' '}
            <strong>meter and charge them</strong> for every single request with micro-cents, using
            native machine-to-machine payments!
          </p>
        </div>
      </section>

      {/* SECTION 04: THE REBIRTH OF HTTP 402 */}
      <section
        id="sec-http402"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Globe className="w-4 h-4" />
          <span>Section 04 • Historical Evolution</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Enter HTTP 402 "Payment Required": The Lost Protocol Reborn for the Machine Economy
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            In the early specification of the World Wide Web (RFC 2068, drafted by Tim Berners-Lee
            and the IETF in 1996), the status code <strong>HTTP 402 Payment Required</strong> was
            explicitly reserved for digital cash systems. However, for 30 years, it remained dormant
            because credit cards required human verification, 3-D Secure OTPs, billing addresses,
            and $0.30 fixed minimum processing fees.
          </p>
          <p>
            In 2026, the convergence of three foundational technologies has made HTTP 402 the
            premier transaction layer of the Internet:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <div className="font-mono text-xs text-blue-600 dark:text-sky-400 font-bold mb-1">
                1. L2 SCALABILITY
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Sub-Cent Base L2 Gas
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Base Ethereum Layer 2 processes transactions in 200ms with gas fees below $0.0005.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <div className="font-mono text-xs text-blue-600 dark:text-sky-400 font-bold mb-1">
                2. CRYPTOGRAPHY
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                EIP-712 Permit Signatures
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero-gas off-chain authorization verified in under 10ms with mathematical certainty.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <div className="font-mono text-xs text-blue-600 dark:text-sky-400 font-bold mb-1">
                3. AGENTIC RUNTIMES
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Autonomous Agent Wallets
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                AI agents equipped with Session Escrows that can programmatically authorize payments
                without human assistance.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05: 7-STEP PROTOCOL FLOW */}
      <section
        id="sec-flow"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Layers className="w-4 h-4" />
          <span>Section 05 • Technical Wire Protocol</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The 7-Step Mechanical Flow of M2M 1-Click Paywalls
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Here is the step-by-step transaction lifecycle executed between an autonomous AI agent and
          your protected API / website:
        </p>

        {/* Step-by-Step Interactive Cards */}
        <div className="space-y-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1">
              <div className="text-slate-900 dark:text-white font-bold">
                AI Agent Requests Resource{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  (GET /api/v1/market-intelligence)
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                The agent's HTTP client requests protected content. No special authorization header
                is attached yet.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1">
              <div className="text-slate-900 dark:text-white font-bold">
                A-Pay Middleware Intercepts at Edge
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                Cloudflare Worker or Next.js middleware inspects incoming traffic. If it's a browser
                human, it lets it pass 100% free. If it's an automated bot or API client, it
                triggers the 402 challenge.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/25 text-blue-700 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1">
              <div className="text-blue-900 dark:text-sky-300 font-bold">
                Server Emits HTTP 402 Challenge & Cryptographic Nonce
              </div>
              <div className="text-slate-700 dark:text-slate-300 font-sans text-xs">
                Returns headers:{' '}
                <code className="text-blue-600 dark:text-sky-400 font-bold">
                  X-APay-Amount: 1000
                </code>{' '}
                (0.001 USDC),{' '}
                <code className="text-blue-600 dark:text-sky-400 font-bold">
                  X-APay-Receiver: 0xYourWallet
                </code>
                , and anti-replay cryptographic{' '}
                <code className="text-blue-600 dark:text-sky-400 font-bold">X-APay-Nonce</code>.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
              4
            </div>
            <div className="space-y-1">
              <div className="text-slate-900 dark:text-white font-bold">
                Agent's In-Memory Vault Auto-Signs Challenge (&lt; 5ms)
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                The agent's SDK inspects price vs its daily safety budget limit. If valid, its
                ephemeral session key signs an EIP-712 payment authorization permit. Zero human
                intervention.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
              5
            </div>
            <div className="space-y-1">
              <div className="text-slate-900 dark:text-white font-bold">
                Agent Auto-Retries with Payment Proof
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                Client re-sends request with header{' '}
                <code className="text-blue-600 dark:text-sky-400">
                  Authorization: APay &lt;signature&gt;
                </code>
                .
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
              6
            </div>
            <div className="space-y-1">
              <div className="text-slate-900 dark:text-white font-bold">
                Off-Chain Signature Verification (&lt; 10ms) & Data Unlock
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                Middleware verifies cryptographic validity off-chain. Upstream API or webpage
                content is immediately released with status <strong>HTTP 200 OK</strong>.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
              7
            </div>
            <div className="space-y-1">
              <div className="text-emerald-900 dark:text-emerald-300 font-bold">
                Direct Settlement to Your Base L2 Wallet
              </div>
              <div className="text-slate-700 dark:text-slate-300 font-sans text-xs">
                Earnings are credited to your non-custodial address in USDC or $APAY tokens on Base
                L2. Zero credit card chargebacks. 100% finality.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 06: DUAL-PATH FILTER (HUMANS STAY 100% FREE) */}
      <section
        id="sec-dualpath"
        className="rounded-3xl bg-gradient-to-br from-emerald-50/60 via-white to-slate-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-950 border border-emerald-200 dark:border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Users className="w-4 h-4" />
          <span>Section 06 • Human Browsing Integrity</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The "Dual-Path Filter": Why Real Humans Browse 100% Free & Uninterrupted
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            The biggest question every website founder asks is:{' '}
            <em>"Will my human visitors or casual readers get blocked by a crypto paywall?"</em>
          </p>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            The answer is an emphatic NO. Real humans browse completely free with zero friction.
          </p>
          <p>
            A-Pay's paywall engine utilizes modern client hints (Sec-CH-UA), browser header
            fingerprinting, and session cookie validation:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Standard Human Visitors (Chrome, Safari, iOS)</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Zero paywall banners or popup modals</li>
                <li>No crypto wallet required</li>
                <li>Articles, pages, and products load instantaneously</li>
                <li>Preserves 100% of reader retention and conversion</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-blue-700 dark:text-sky-400 font-bold text-sm">
                <Bot className="w-5 h-5" />
                <span>AI Scrapers, Crawlers & Agent Swarms</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Automatically intercepted at the edge</li>
                <li>Served instant HTTP 402 challenge</li>
                <li>Must pay $0.001 - $0.01 per page or API call</li>
                <li>Generates automated, round-the-clock revenue</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 07: BOT CLASSIFICATION & WHITELIST MATRIX */}
      <section
        id="sec-bot-matrix"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Section 07 • The 2026 Bot Classification Matrix</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          How A-Pay Distinguishes Friendly Search Engines from Paid AI Scrapers
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            The #1 anxiety among SEO directors is accidental search de-indexing. A-Pay solves this
            with a <strong>Tri-Tier Bot Classification Engine</strong> that combines
            forward-confirmed Reverse DNS (fcrDNS), Autonomous System Number (ASN) verification, and
            TLS fingerprinting:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-900 dark:text-white font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Bot Category</th>
                  <th className="p-4">User-Agent / Actors</th>
                  <th className="p-4">Verification Method</th>
                  <th className="p-4 text-right">A-Pay Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                <tr className="bg-emerald-50/30 dark:bg-emerald-950/10">
                  <td className="p-4 font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Search Indexers</span>
                  </td>
                  <td className="p-4 font-mono text-[11px]">
                    Googlebot, Bingbot, DuckDuckBot, Applebot
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    Reverse DNS (*.googlebot.com, *.search.msn.com) + Google ASN 15169
                  </td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                      100% Free Pass (200 OK)
                    </span>
                  </td>
                </tr>
                <tr className="bg-emerald-50/20 dark:bg-emerald-950/5">
                  <td className="p-4 font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Social Unfurlers</span>
                  </td>
                  <td className="p-4 font-mono text-[11px]">
                    Twitterbot, Slackbot, Discordbot, LinkedInBot
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    Official IP block validation & OpenGraph header inspection
                  </td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                      100% Free Pass (Meta only)
                    </span>
                  </td>
                </tr>
                <tr className="bg-blue-50/30 dark:bg-blue-950/15">
                  <td className="p-4 font-bold text-blue-700 dark:text-sky-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Commercial AI Scrapers</span>
                  </td>
                  <td className="p-4 font-mono text-[11px]">
                    GPTBot, ClaudeBot, PerplexityBot, Bytespider, CCBot
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    Declared User-Agents, OpenAI ASN 396982, Anthropic ASN 22207
                  </td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-sky-400 font-mono text-[11px] font-bold">
                      HTTP 402 Challenge ($0.002)
                    </span>
                  </td>
                </tr>
                <tr className="bg-rose-50/30 dark:bg-rose-950/15">
                  <td className="p-4 font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Headless & Proxy Crawlers</span>
                  </td>
                  <td className="p-4 font-mono text-[11px]">
                    Puppeteer, Scrapy, Playwright, BrightData, Oxylabs
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    Missing Sec-CH-UA, TLS fingerprint mismatch, headless browser flags
                  </td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-bold">
                      402 Challenge or Block
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 08: ARCHETYPE ANALYSIS (8 TYPES OF WEBSITES) */}
      <section
        id="sec-archetypes"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Section 08 • Deep Archetype Breakdown</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Who Needs This Right Now? 8 Types of Websites Losing Money to AI Bots
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          {/* Archetype 1 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                1. Technical Blogs & Independent Publishers
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                High Risk
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Deep, research-backed tutorials and investigative
              articles are scraped by AI engines within minutes of publishing to answer user queries
              elsewhere without citing or driving traffic.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Charge $0.002 per scraped post. If 10 AI crawlers scrape
              500 posts monthly, that's $100+/mo in passive automated income.
            </p>
          </div>

          {/* Archetype 2 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                2. SaaS Documentation & API Portals
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Extreme Volume
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Coding assistants (Cursor, Copilot, Claude Desktop)
              hammer developer documentation millions of times per day fetching code snippets,
              inflating serverless edge compute bills.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Turn documentation from a cost center into a self-funding
              revenue engine by charging $0.001 per code snippet look-up.
            </p>
          </div>

          {/* Archetype 3 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                3. Niche Directories & Job Boards
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Database Target
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> High-value aggregated listings (remote jobs, real
              estate, VC funds, salary datasets) are vacuumed up daily by competitor aggregator
              bots.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Competitor scrapers must pay $0.01 per lead or record
              extracted, protecting your database moat while generating high-margin fees.
            </p>
          </div>

          {/* Archetype 4 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                4. E-Commerce & Product Catalogs
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Bandwidth Drain
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Price tracking bots and inventory monitoring swarms ping
              SKUs every few seconds to detect flash sales and inventory changes.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Price bots pay for their continuous polling, turning bot
              surveillance overhead into guaranteed profit.
            </p>
          </div>

          {/* Archetype 5 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                5. Financial & Crypto Data Feeds
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                High Value
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Arbitrage trading bots and algorithmic swarms scrape
              orderbook depths, token sentiment, and liquidation prices without paying API tier
              subscriptions.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Settle micro-fees per price snapshot with sub-15ms
              verification latency.
            </p>
          </div>

          {/* Archetype 6 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                6. Academic, Medical & Legal Archives
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Heavy Files
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Multi-megabyte PDF research papers and court dockets are
              downloaded en masse for LLM pre-training, driving staggering AWS S3 egress bills.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Every paper download requires a $0.05 to $0.25
              micropayment, directly compensating scientific and legal authors.
            </p>
          </div>

          {/* Archetype 7 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                7. AI Micro-Tools & Inference APIs
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Compute Heavy
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Free background removers, OCR APIs, and text summary
              endpoints get abused by other developers embedding them as free backends in their
              apps.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> Instant 402 paywall guarantees that every single compute
              cycle is prepaid before the GPU starts executing.
            </p>
          </div>

          {/* Archetype 8 */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                8. Indie Hackers & Bootstrapped Startups
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[11px] font-mono font-bold">
                Bill Shock
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>The Problem:</strong> Founders on Vercel or Supabase free/hobby plans wake up
              to surprise $500 overage invoices because an AI bot spidered dynamic routes overnight.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              <strong>With A-Pay:</strong> 1-line middleware halts unmetered spidering at the edge,
              eliminating bill shock forever.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 08: INTERACTIVE CALCULATOR */}
      <section
        id="sec-calculator"
        className="rounded-3xl bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-500/30 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <TrendingUp className="w-4 h-4" />
          <span>Section 08 • Interactive Cost-Benefit Modeler</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Calculate Your Loss vs. A-Pay Micro-Revenue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Adjust the sliders below based on your website's estimated automated traffic.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
          {/* Sliders */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Monthly AI Bot / Scraper Hits:
                </span>
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  {monthlyBotHits.toLocaleString()} requests
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={monthlyBotHits}
                onChange={(e) => setMonthlyBotHits(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>5K (Small Blog)</span>
                <span>100K (SaaS Docs)</span>
                <span>500K (Directory)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Paywall Fee Per Request:
                </span>
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  ${chargePerHit.toFixed(3)} USDC
                </span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.02"
                step="0.001"
                value={chargePerHit}
                onChange={(e) => setChargePerHit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>$0.001 (Micro)</span>
                <span>$0.005 (Standard)</span>
                <span>$0.020 (Premium Data)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5 shadow-xs">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Human visitors continue browsing <strong>100% free</strong> without seeing this fee.
              </span>
            </div>
          </div>

          {/* Result Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 space-y-5 shadow-lg dark:shadow-2xl">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Without A-Pay (Loss):
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  -${monthlyUnprotectedLoss.toFixed(2)}/mo
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Wasted compute & DB cold starts
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  With A-Pay (Net Profit):
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  +${monthlyNetProfit.toFixed(2)}/mo
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct to your Web3 wallet
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Gross AI Micropayment Revenue:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${monthlyGrossApayRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>A-Pay Protocol Fee (1.0% Flat):</span>
                <span>-${monthlyProtocolFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Stripe Fixed Surcharges:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  $0.00 (Zero Minimum)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 09: LIVE CLI PROOF TESTER */}
      <section
        id="sec-liveproof"
        className="rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 space-y-6 text-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs font-mono text-sky-400 uppercase tracking-wider font-semibold">
            <Terminal className="w-4 h-4" />
            <span>Section 09 • Live Terminal Verification (Test in 2 Seconds)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            Live on Edge
          </span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Verify the HTTP 402 Wire Challenge Right Now
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Run this curl command in your terminal. By sending an AI Bot User-Agent, you will see
            the instant HTTP 402 challenge with cryptographic price, nonce, and receiver headers:
          </p>
        </div>

        <div className="relative rounded-2xl bg-black/60 border border-slate-800 p-4 font-mono text-xs text-sky-300 flex items-center justify-between gap-4 overflow-x-auto">
          <code>{testCurlCommand}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(testCurlCommand);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {copiedCurl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
          <div className="text-emerald-400 font-bold">&gt; Expected HTTP 402 Response Payload:</div>
          <div className="text-slate-400">HTTP/1.1 402 Payment Required</div>
          <div className="text-slate-400">X-APay-Version: 1.0</div>
          <div className="text-slate-400">X-APay-Amount: 1000 (0.001 USDC)</div>
          <div className="text-slate-400">X-APay-Nonce: 489c72e2-9b51-419b-a0ea-42b719d3bb82</div>
          <div className="text-slate-400">X-APay-Receiver: {contracts.APayRouterV2.address}</div>
        </div>
      </section>

      {/* SECTION 10: ECONOMIC COMPARISON */}
      <section
        id="sec-economics"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Percent className="w-4 h-4" />
          <span>Section 10 • Architectural Economics</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Economic Breakdown: Why Stripe Fails at Micropayments & A-Pay Succeeds
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                <th className="py-3 px-4">Feature / Metric</th>
                <th className="py-3 px-4 text-rose-600 dark:text-rose-400">
                  Legacy Rails (Stripe / PayPal)
                </th>
                <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                  A-Pay Protocol (Base L2)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Fee Structure
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  2.9% + $0.30 fixed fee per swipe
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  1.0% flat fee • Zero fixed minimum
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Minimum Practical Charge
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  $0.50 (Anything under $0.30 loses money)
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  $0.0001 (Fraction of a cent)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Human Interaction
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  Mandatory (Credit card, CVV, OTP, 3D Secure)
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  Zero (100% Autonomous M2M via EIP-712)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Settlement Latency
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  2 to 7 business days payout cycle
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  Instant (&lt; 200ms Base block finality)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Chargeback / Fraud Risk
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  High ($15 dispute penalty per chargeback)
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  Mathematically Impossible (On-chain verified)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  Setup Friction
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  Heavy KYC, corporate tax IDs, bank account approval
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300 font-bold">
                  60 seconds: Paste your wallet address & go
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 11: 1-CLICK CODE INTEGRATIONS */}
      <section
        id="sec-code"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Code2 className="w-4 h-4" />
          <span>Section 11 • Developer Integration</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Deploy in 60 Seconds: Production Code for Any Tech Stack
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Choose your stack below to see the drop-in integration. Real humans browse 100% free;
            only automated bots trigger the 402 challenge.
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {[
            { id: 'cloudflare', label: 'Cloudflare Worker (Zero Code Changes)' },
            { id: 'nextjs', label: 'Next.js (Edge Middleware)' },
            { id: 'python', label: 'Python (FastAPI / Flask)' },
            { id: 'express', label: 'Node.js (Express / Hono)' },
            { id: 'cli', label: '1-Line CLI Reverse Proxy' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCodePlatform(item.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                codePlatform === item.id
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs shadow-xl">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-400 ml-2">
                {codePlatform === 'cloudflare' && 'worker.js — Cloudflare Edge (Global < 15ms)'}
                {codePlatform === 'nextjs' && 'middleware.ts — Next.js 14/15 Edge'}
                {codePlatform === 'python' && 'server.py — FastAPI Python Middleware'}
                {codePlatform === 'express' && 'server.ts — Express.js Middleware'}
                {codePlatform === 'cli' && 'Terminal Command — Protect Any Local Port'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const snippets: Record<string, string> = {
                  cloudflare: `// Cloudflare Worker: Protect any origin with zero server changes
export default {
  async fetch(request, env) {
    const userAgent = request.headers.get("User-Agent") || "";
    const isBot = /bot|crawl|spider|python|curl|http-client/i.test(userAgent);

    // 1. Real humans browse 100% free!
    if (!isBot) return fetch(request);

    // 2. Verify A-Pay EIP-712 Signature
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("APay ")) {
      return new Response(JSON.stringify({
        status: 402,
        message: "Payment Required for AI Scrapers",
        priceUsdc: "0.001",
        receiver: "0xYourWalletAddress"
      }), {
        status: 402,
        headers: { "Content-Type": "application/json", "X-APay-Version": "1.0" }
      });
    }

    return fetch(request);
  }
};`,
                  nextjs: `// Next.js middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const isAiBot = /gptbot|claudebot|bytespider|python|httpx|curl/i.test(ua);

  // Real human users browse 100% free
  if (!isAiBot) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("APay ")) {
    return new NextResponse(JSON.stringify({
      status: 402,
      error: "Micropayment Required for Automated Crawlers",
      amount: "0.001",
      currency: "USDC",
      receiver: "0xYourWalletAddress"
    }), { status: 402, headers: { "content-type": "application/json" } });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/articles/:path*"] };`,
                  python: `# Python FastAPI / Starlette Middleware
from fastapi import FastAPI, Request, Response
import re

app = FastAPI()

BOT_REGEX = re.compile(r"bot|crawl|spider|python|httpx|requests", re.I)

@app.middleware("http")
async def apay_paywall(request: Request, call_next):
    ua = request.headers.get("user-agent", "")
    
    # Human visitors pass 100% free
    if not BOT_REGEX.search(ua):
        return await call_next(request)
        
    auth = request.headers.get("authorization", "")
    if not auth.startswith("APay "):
        return Response(
            content='{"status": 402, "price": 0.001, "currency": "USDC", "receiver": "0xYourWallet"}',
            status_code=402,
            media_type="application/json"
        )
        
    return await call_next(request)`,
                  express: `// Express.js Middleware
import express from 'express';

const app = express();

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = /bot|crawl|spider|python|axios|curl/i.test(ua);

  // Humans browse 100% free
  if (!isBot) return next();

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('APay ')) {
    return res.status(402).json({
      status: 402,
      message: 'HTTP 402: Micropayment Required for AI Swarms',
      price: '0.001 USDC',
      receiver: '0xYourWalletAddress'
    });
  }

  next();
});`,
                  cli: `# 1-Line CLI Reverse Proxy: Protect any local or remote server instantly
npx apay protect --target http://localhost:3000 --price 0.001 --wallet 0xYourWalletAddress --currency USDC`,
                };
                copyCode(snippets[codePlatform], `snippet-${codePlatform}`);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
            >
              {copiedCodeId === `snippet-${codePlatform}` ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-slate-300 overflow-x-auto leading-relaxed">
            {codePlatform === 'cloudflare' && (
              <code>{`// Cloudflare Worker: Protect any origin with zero server changes
export default {
  async fetch(request, env) {
    const userAgent = request.headers.get("User-Agent") || "";
    const isBot = /bot|crawl|spider|python|curl|http-client/i.test(userAgent);

    // 1. Real humans browse 100% free!
    if (!isBot) return fetch(request);

    // 2. Verify A-Pay EIP-712 Signature
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("APay ")) {
      return new Response(JSON.stringify({
        status: 402,
        message: "Payment Required for AI Scrapers",
        priceUsdc: "0.001",
        receiver: "0xYourWalletAddress"
      }), {
        status: 402,
        headers: { "Content-Type": "application/json", "X-APay-Version": "1.0" }
      });
    }

    return fetch(request);
  }
};`}</code>
            )}
            {codePlatform === 'nextjs' && (
              <code>{`// Next.js middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const isAiBot = /gptbot|claudebot|bytespider|python|httpx|curl/i.test(ua);

  // Real human users browse 100% free
  if (!isAiBot) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("APay ")) {
    return new NextResponse(JSON.stringify({
      status: 402,
      error: "Micropayment Required for Automated Crawlers",
      amount: "0.001",
      currency: "USDC",
      receiver: "0xYourWalletAddress"
    }), { status: 402, headers: { "content-type": "application/json" } });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/articles/:path*"] };`}</code>
            )}
            {codePlatform === 'python' && (
              <code>{`# Python FastAPI / Starlette Middleware
from fastapi import FastAPI, Request, Response
import re

app = FastAPI()

BOT_REGEX = re.compile(r"bot|crawl|spider|python|httpx|requests", re.I)

@app.middleware("http")
async def apay_paywall(request: Request, call_next):
    ua = request.headers.get("user-agent", "")
    
    # Human visitors pass 100% free
    if not BOT_REGEX.search(ua):
        return await call_next(request)
        
    auth = request.headers.get("authorization", "")
    if not auth.startswith("APay "):
        return Response(
            content='{"status": 402, "price": 0.001, "currency": "USDC", "receiver": "0xYourWallet"}',
            status_code=402,
            media_type="application/json"
        )
        
    return await call_next(request)`}</code>
            )}
            {codePlatform === 'express' && (
              <code>{`// Express.js Middleware
import express from 'express';

const app = express();

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const isBot = /bot|crawl|spider|python|axios|curl/i.test(ua);

  // Humans browse 100% free
  if (!isBot) return next();

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('APay ')) {
    return res.status(402).json({
      status: 402,
      message: 'HTTP 402: Micropayment Required for AI Swarms',
      price: '0.001 USDC',
      receiver: '0xYourWalletAddress'
    });
  }

  next();
});`}</code>
            )}
            {codePlatform === 'cli' && (
              <code>{`# 1-Line CLI Reverse Proxy: Protect any local or remote server instantly
npx apay protect --target http://localhost:3000 --price 0.001 --wallet 0xYourWalletAddress --currency USDC`}</code>
            )}
          </pre>
        </div>
      </section>

      {/* SECTION 12: ON-CHAIN TRUST & SECURITY FAQS */}
      <section
        id="sec-trust"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
          <Lock className="w-4 h-4" />
          <span>Section 12 • Cryptographic Security & Anti-Spam Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          How A-Pay Prevents Fraud, Replay Attacks, and Sybil Floods
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">1.</span> Nonce
              De-Duplication
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every 402 challenge includes an atomic, single-use cryptographic UUID nonce. The
              gateway caches seen nonces in edge key-value stores for 10 minutes, making signature
              replay attacks mathematically impossible.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">2.</span> Anti-Spam
              Staking Vault
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-throughput scraping swarms can deposit 500 $APAY into the StakingVault.sol
              contract as collateral. If a bot attempts denial-of-service spam, its bond can be
              slashed on-chain.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">3.</span> Isolated
              Session Keys
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              AI agents never hold master cold wallet private keys. They operate with pre-authorized
              Session Escrows with strict limits ($0.01 per call, $5.00 daily budget). Even if a
              sub-agent is compromised, your master treasury remains unbreachable.
            </p>
          </div>
        </div>

        {/* FAQs list */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <span>Frequently Asked Questions</span>
          </div>
          {faqs.map((faq, idx) => (
            <div
              key={faq.q}
              className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 dark:text-white text-sm sm:text-base hover:text-blue-600 dark:hover:text-sky-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    expandedFaq === idx ? 'rotate-180 text-blue-600 dark:text-sky-400' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800/50 font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>START MONETIZING TODAY</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Stop Bleeding Cloud Costs. Protect Your Site in 60 Seconds.
          </h3>
          <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
            Protect your API, SaaS docs, or blog with an edge paywall today. Watch your unmetered
            server drain drop to zero and start collecting automatic micro-payments on Base L2.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('paywalls')}
                className="px-6 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm flex items-center gap-2 shadow-xl transition-all"
              >
                <span>Open 1-Click Paywall Creator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleShareOnX}
              className="px-5 py-3 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-400/30 transition-colors"
            >
              <span>Share Deep Dive on X</span>
            </button>
          </div>
        </div>
      </div>

      {/* LEGAL & TRADEMARK NOMINATIVE FAIR USE DISCLAIMER */}
      <section
        id="sec-legal-notice"
        className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-xs space-y-2 leading-relaxed"
      >
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>Legal Disclaimer & Trademark Notice (Nominative Fair Use)</span>
        </div>
        <p>
          All trademarks, registered trademarks, company names, product names, logos, and brand
          identifiers referenced across A-Pay research papers, technical guides, benchmarks, and
          documentation (including but not limited to Stripe®, PayPal®, Google®, OpenAI®,
          Anthropic®, Cloudflare®, ByteDance®, Apple®, Microsoft®, and Perplexity®) are the property
          of their respective trademark holders.
        </p>
        <p>
          Their mention herein is strictly for factual comparative analysis, architectural
          benchmarking, educational commentary, and technical interoperability under nominative fair
          use principles. A-Pay is an independent open-source protocol and is not affiliated with,
          sponsored by, or endorsed by any of the aforementioned trademark holders.
        </p>
      </section>
    </div>
  );
}
