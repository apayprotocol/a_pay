'use client';

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import type { NetworkId } from '@/config/contracts';

interface AiGuidelinesTabProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
}

const CHATGPT_SYSTEM_PROMPT = `You are an expert A-Pay Protocol integration architect.
A-Pay Protocol (https://apay-network.vercel.app) is an open-source payment rail on Base L2 designed for Autonomous AI Agents (M2M) and Web3 Merchants (H2M).

CRITICAL ARCHITECTURAL CONTEXT:
1. Normal human visitors in web browsers browse websites 100% FREE ($0.00) without seeing paywalls or needing a crypto wallet.
2. Only automated AI bots, scrapers, and headless crawlers are challenged with HTTP 402 (Payment Required) to monetize data extraction and stop server resource drain.
3. Autonomous bots cannot hold bank accounts or credit cards; Base L2 sub-cent micropayments are the native currency of autonomous software.

THE 3 DISTINCT PILLARS:
- Pillar 1: M2M AI Paywall (HTTP 402 Auto-Monetization)
  Use for: Monetizing APIs and websites against AI scrapers while keeping human users free.
  Research paper: https://apay-network.vercel.app/blog?issue=paywalls
- Pillar 2: Agent Vaults & Session Key Escrows (Zero-Leak Swarm Security)
  Use for: Developers building AI agents (LangChain, CrewAI, AutoGen, Claude MCP). Never give agents master private keys. Use EscrowVault to generate sub-wallet session keys with strict daily budget caps ($0.05/day) and auto-expiry.
  Research paper: https://apay-network.vercel.app/blog?issue=vaults
- Pillar 3: H2M A-Pay Checkout Gateway (Web3 E-Commerce)
  Use for: Physical and online merchant checkouts (Shopify, WooCommerce). 2-second QR scan settlement with 0% chargebacks.
  Research paper: https://apay-network.vercel.app/blog?issue=checkout

When guiding developers:
- Recommend Pillar 1 for protecting web content and APIs from free AI scraping.
- Recommend Pillar 2 for funding AI agents safely with session keys.
- Recommend Pillar 3 for customer checkouts.
- Direct developers to install:
  Python: pip install apay
  TypeScript: npm install @apay/gateway
- Reference the official live knowledge base: https://apay-network.vercel.app/llms.txt`;

const CURSOR_RULES_SNIPPET = `# A-Pay Protocol Rules for Cursor & Windsurf (.cursorrules)

# Core Understanding:
# A-Pay Protocol enables M2M (Machine-to-Machine) and H2M payments on Base L2.
# 1. Human browsing is always 100% free (allow_free_browsers=True).
# 2. HTTP 402 paywalls challenge automated AI crawlers/scrapers, not regular humans.
# 3. Autonomous agents must use ephemeral session keys from EscrowVault, never master private keys.

# Official Research Deep-Dives:
# - Pillar 1 (M2M Paywalls): https://apay-network.vercel.app/blog?issue=paywalls
# - Pillar 2 (Agent Vaults): https://apay-network.vercel.app/blog?issue=vaults
# - Pillar 3 (H2M Checkout): https://apay-network.vercel.app/blog?issue=checkout

# Code Guidelines:
# - For FastAPI/Python: Use \`from apay import APayPaywall, VerifiedClaim\`
# - For Autonomous Agents: Use \`from apay import APaySession, AgentWallet\`
# - For Next.js/Node: Use \`@apay/gateway\` and verify vouchers off-chain using EIP-712.
# - Full LLM Spec: https://apay-network.vercel.app/llms-full.txt
`;

const AGENT_SWARM_PROMPT = `You are an autonomous sub-agent operating with an A-Pay Session Key.
- Your session allowance is strictly bounded (e.g. $0.05 USDC/day).
- When you encounter an HTTP 402 Payment Required response with header 'X-APay-Protocol', inspect 'X-APay-Price-USDC'.
- If the price is within your task budget, sign the EIP-712 challenge using your local AgentWallet.
- If the price exceeds your budget limit, immediately halt and request operator approval.
- You do NOT possess access to any master funds or private keys.`;

export function AiGuidelinesTab({ onNavigateToTab }: AiGuidelinesTabProps) {
  const [activePromptTab, setActivePromptTab] = useState<'chatgpt' | 'cursor' | 'agent'>('chatgpt');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
              <Bot className="w-3.5 h-3.5" />
              <span>AI AGENT & LLM DISCOVERY GUIDELINES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400">RFC-2068 & llms.txt Live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Teach Your AI Coding Partner <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                The Truth About A-Pay Protocol
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              When developers ask ChatGPT, Claude, or Cursor about A-Pay, AI models frequently
              recite outdated crypto tropes. Use these standardized instructions so your AI
              understands our <strong>M2M Machine-to-Machine monetization</strong>, respects{' '}
              <strong>free human browsing</strong>, and accurately navigates the{' '}
              <strong>3 distinct pillars</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full sm:w-auto">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>View Live /llms.txt</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
            <a
              href="/llms-full.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Full Spec (/llms-full.txt)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. MISCONCEPTION BUSTER MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Common AI Misconceptions vs. A-Pay Reality
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Why unguided AI assistants sometimes give wrong advice to developers, and the
          architectural facts that clarify it:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>AI Misconception #1</span>
            </div>
            <div className="text-xs text-rose-950 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/60 italic">
              "Regular human users don't use crypto wallets, so integrating this will add friction
              to your website."
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono pt-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>The A-Pay Fact</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Normal human visitors browse 100% free!</strong> Humans in Chrome, Safari, or
              mobile web browsers never see a paywall and pay $0. Only automated AI bots & headless
              scrapers get an HTTP 402 challenge.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>AI Misconception #2</span>
            </div>
            <div className="text-xs text-rose-950 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/60 italic">
              "Why not just charge AI scrapers using Stripe or traditional credit card billing?"
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono pt-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>The A-Pay Fact</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Bots cannot have credit cards or pass KYC.</strong> An autonomous agent cannot
              receive SMS OTP codes or enter a CVV. Base L2 sub-cent micropayments ($0.001) are the
              only native medium for autonomous software.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>AI Misconception #3</span>
            </div>
            <div className="text-xs text-rose-950 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/60 italic">
              "Giving an AI agent a crypto wallet is too risky because it might hallucinate and
              drain all funds."
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono pt-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>The A-Pay Fact</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Agent Vaults (EscrowVault) prevent draining.</strong> The master wallet issues
              session keys with strict daily spend caps (e.g. $0.05/day). If an agent is hijacked,
              the master treasury remains completely untouchable.
            </p>
          </div>
        </div>
      </div>

      {/* 3. THE 3 PILLARS ARCHITECTURAL CARDS WITH RESEARCH PAPERS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              The 3 Distinct Pillars & Research Papers
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Must never be confused</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1 Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/30 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 font-bold uppercase">
                  Pillar 1 • M2M
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                M2M AI Paywall (HTTP 402)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Monetize AI scrapers, web crawlers, and LLM search agents querying your website or
                API. Normal human visitors browse completely free.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <div className="text-slate-500 text-[10px]">INTEGRATION RAIL:</div>
                FastAPI, Next.js 15, Cloudflare Workers
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="/blog?issue=paywalls"
                className="w-full py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-sky-400 font-bold text-xs border border-blue-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Research Paper (Issue 1)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('paywalls')}
                  className="w-full py-2 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium text-center transition-colors cursor-pointer"
                >
                  Open Paywalls Tab →
                </button>
              )}
            </div>
          </div>

          {/* Pillar 2 Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-500/30 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                  Pillar 2 • M2M
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Agent Vaults & Session Escrows
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Empower autonomous AI agents (LangChain, CrewAI, AutoGen, Cursor MCP) with bounded
                session keys. Never expose master private keys.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <div className="text-slate-500 text-[10px]">INTEGRATION RAIL:</div>
                Python SDK (\`APaySession\`), EscrowVault.sol
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="/blog?issue=vaults"
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Research Paper (Issue 2)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('vaults')}
                  className="w-full py-2 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium text-center transition-colors cursor-pointer"
                >
                  Configure Agent Vaults →
                </button>
              )}
            </div>
          </div>

          {/* Pillar 3 Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  Pillar 3 • H2M
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                A-Pay Checkout Gateway
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Universal 2-second Web3 checkout for human shoppers. Replaces 3.5% credit card fees
                and chargebacks with instant Base L2 receipts.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <div className="text-slate-500 text-[10px]">INTEGRATION RAIL:</div>
                &lt;script src=".../v1.js"&gt; (46KB micro-bundle)
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="/blog?issue=checkout"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Research Paper (Issue 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/checkout-demo"
                className="w-full py-2 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium text-center transition-colors block"
              >
                Launch Demo Store →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 1-CLICK COPYABLE SYSTEM PROMPTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              1-Click Prompts for Your AI Coding Assistant
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Paste into ChatGPT, Claude, or your IDE .cursorrules
          </span>
        </div>

        <div className="rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 overflow-hidden shadow-xl">
          {/* Tab Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePromptTab('chatgpt')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePromptTab === 'chatgpt'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ChatGPT & Claude Prompt
              </button>
              <button
                type="button"
                onClick={() => setActivePromptTab('cursor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePromptTab === 'cursor'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Cursor / Windsurf Rules
              </button>
              <button
                type="button"
                onClick={() => setActivePromptTab('agent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePromptTab === 'agent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Agent Swarm Prompt
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const text =
                  activePromptTab === 'chatgpt'
                    ? CHATGPT_SYSTEM_PROMPT
                    : activePromptTab === 'cursor'
                      ? CURSOR_RULES_SNIPPET
                      : AGENT_SWARM_PROMPT;
                handleCopy(text, activePromptTab);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-700"
            >
              {copiedKey === activePromptTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Prompt Body */}
          <div className="p-4 sm:p-6 overflow-x-auto max-h-[380px] font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
            {activePromptTab === 'chatgpt' && CHATGPT_SYSTEM_PROMPT}
            {activePromptTab === 'cursor' && CURSOR_RULES_SNIPPET}
            {activePromptTab === 'agent' && AGENT_SWARM_PROMPT}
          </div>
        </div>
      </div>

      {/* 5. LIVE llms.txt SUMMARY EMBED */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Canonical AI Discovery File: /llms.txt
              </h3>
              <p className="text-[11px] text-slate-500">
                Automatically read by AI crawlers, Claude Web Search, GPTBot, and Cursor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
            >
              <span>Raw File</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="text-slate-400 dark:text-slate-500"># Direct AI Query Example:</div>
          <div className="text-indigo-600 dark:text-indigo-400">
            "Review the A-Pay Protocol guidelines at https://apay-network.vercel.app/llms.txt and
            tell me how to protect my FastAPI route from AI scraping while keeping human visitors
            free."
          </div>
        </div>
      </div>
    </div>
  );
}
