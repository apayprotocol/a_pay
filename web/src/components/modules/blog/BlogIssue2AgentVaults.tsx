'use client';

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Coins,
  Copy,
  Cpu,
  Database,
  DollarSign,
  ExternalLink,
  FileCode,
  Flame,
  Gauge,
  GitBranch,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Newspaper,
  Percent,
  Play,
  Radio,
  RefreshCw,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface BlogIssue2AgentVaultsProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
  onSwitchIssue?: (issueId: 'paywalls' | 'vaults') => void;
}

export function BlogIssue2AgentVaults({
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
  onSwitchIssue,
}: BlogIssue2AgentVaultsProps) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Interactive Agent Budget Simulator State
  const [masterDeposit, setMasterDeposit] = useState<number>(50);
  const [agentDailyLimit, setAgentDailyLimit] = useState<number>(2.0);
  const [maxPerCall, setMaxPerCall] = useState<number>(0.02);
  const [activeSessionHours, setActiveSessionHours] = useState<number>(24);

  // Interactive Sequence Step State (Cooked at the Gate Live Flow)
  const [activeSeqStep, setActiveSeqStep] = useState<number>(1);

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
        'Why do AI agents fail to collaborate? Security fears & data leaks.\n\n🛡️ The Gatekeeper Paradigm: Gemini AI orders complex code at the gate, pays $0.01 via Agent Vaults, Claude AI cooks in isolation & delivers.\n\nZero prompt leak. Zero credit card. Read the @APayProtocol deep dive:',
      );
      const url = encodeURIComponent(window.location.href);
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  // Calculations for Simulator
  const maxCallsPerDay = Math.floor(agentDailyLimit / maxPerCall);
  const protectedMasterBalance = Math.max(0, masterDeposit - agentDailyLimit);
  const maxCompromiseLoss = agentDailyLimit;
  const safetyPercentage =
    masterDeposit > 0 ? Math.round(((masterDeposit - agentDailyLimit) / masterDeposit) * 100) : 100;

  const faqs = [
    {
      q: 'Why not just issue a virtual credit card (e.g. Ramp or Brex) to each AI agent?',
      a: 'Virtual corporate cards still rely on traditional legacy rails. They require merchant IDs, cardholder billing addresses, CVV codes, 3-D Secure challenges, and charge minimum processing fees ($0.30 + 2.9%). If an agent needs to pay 10 different APIs $0.002 to gather data, virtual cards fail instantly. A-Pay Agent Vaults enable true sub-cent micropayments ($0.0001) in under 5 milliseconds with zero human billing friction.',
    },
    {
      q: 'How does the "Cooked at the Gate" model prevent AI prompt injections and data leaks?',
      a: 'In legacy multi-agent setups, teams grant agents direct read/write access to internal SQL databases or internal vector stores. If the external agent is jailbroken, your private customer records are exposed. With A-Pay, the buying agent stays strictly outside the API perimeter gate. It only submits task parameters and a cryptographic micropayment. The provider executes the task inside an isolated sandbox and returns only the finished artifact. Zero database access, zero system prompt exposure.',
    },
    {
      q: 'What happens if an AI agent goes rogue or enters an infinite loop?',
      a: 'A-Pay smart contracts enforce strict mathematical boundaries: dailyLimit, maxPerCall, and expiry timestamps. If an agent loops 10,000 times, it cannot spend a penny beyond its daily allocation (e.g. $2.00). The moment the ceiling is hit, further transactions are rejected on-chain. Furthermore, the human operator can invoke revokeAgent() at any moment to cancel the agent’s session key immediately.',
    },
    {
      q: 'Can the A-Pay protocol or anyone else seize my vault funds?',
      a: 'No. EscrowVault.sol is 100% non-custodial. Master funds reside in a smart contract where only the owner address (your hardware wallet or primary multi-sig) possesses withdrawal authority. The protocol operators, validators, or relayer nodes have zero ability to seize, freeze, or redirect your deposits.',
    },
    {
      q: 'Do agents pay gas fees on every single API micropayment?',
      a: 'No. Micropayments leverage EIP-712 off-chain typed permits. The autonomous agent signs an in-memory permit with its ephemeral session key. This signature is verified off-chain by the API provider in < 5ms. The provider aggregates permits and settles them in batches on Base L2, making the agent’s micro-calls 100% gasless in real-time.',
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* Article Hero Section */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/40 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 dark:shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>AGENTIC SECURITY & ESCROWS</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">Protocol Research Series #02</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 16 min deep read
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              September 2026 Edition
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              🛡️ Agent Vaults & Session Escrows (M2M Micropayments)
            </h1>
            <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 dark:from-indigo-400 dark:via-blue-400 dark:to-sky-300 bg-clip-text text-transparent leading-snug">
              The Buyer's Guide to Machine Economics: Non-Custodial Session Keys, Cross-Model AI
              Swarms & Zero-Data-Leak Perimeter Gates
            </p>
          </div>

          {/* Subtitle / Lead Paragraph */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
            A master guide for AI agent engineers, swarm architects, and startup founders. Discover
            how to equip autonomous agents with{' '}
            <strong>in-memory wallets and session escrows</strong>, enable seamless cross-model
            outsourcing (e.g. Gemini orchestrator hiring Claude for complex coding), and enforce the{' '}
            <em>&ldquo;Cooked at the Gate&rdquo;</em> architecture where zero prompts, databases, or
            master keys are ever exposed.
          </p>

          {/* Key Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Session Latency
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                &lt; 5 ms
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                EIP-712 off-chain permit
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Max Daily Exposure
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                $2.00 USDC
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Cryptographic daily cap
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Custody Model
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-sky-400 mt-0.5">
                100% Non-Custodial
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                EscrowVault.sol (Base L2)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Data Leak Risk
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                Zero Leaks
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Cooked at Gate Perimeter
              </div>
            </div>
          </div>

          {/* Author & Share Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
                AP
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>A-Pay Autonomous Economics Group</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Agentic Vault Architecture Core
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareOnX}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on X (Twitter)</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Table of Contents Pill Bar */}
      <section className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Curated Table of Contents (10 Architectural Sections)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-medium">
          <a
            href="#sec-danger"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              01.
            </span>
            <span>The Danger of Master Keys</span>
          </a>
          <a
            href="#sec-gatekeeper"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              02.
            </span>
            <span>&ldquo;Cooked at the Gate&rdquo; Paradigm</span>
          </a>
          <a
            href="#sec-interactive-flow"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              03.
            </span>
            <span>Interactive M2M Sequence Simulator</span>
          </a>
          <a
            href="#sec-crossmodel"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              04.
            </span>
            <span>Cross-Model Swarms: Gemini & Claude</span>
          </a>
          <a
            href="#sec-contract"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              05.
            </span>
            <span>EscrowVault.sol Contract Mechanics</span>
          </a>
          <a
            href="#sec-circuit-breaker"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              06.
            </span>
            <span>The Cryptographic Circuit Breaker</span>
          </a>
          <a
            href="#sec-matrix"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              07.
            </span>
            <span>Universal Settlement Comparison Matrix</span>
          </a>
          <a
            href="#sec-archetypes-buyer"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              08.
            </span>
            <span>6 AI Founder & Swarm Archetypes</span>
          </a>
          <a
            href="#sec-simulator"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              09.
            </span>
            <span>Session Vault Risk Simulator</span>
          </a>
          <a
            href="#sec-code-sdk"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              10.
            </span>
            <span>Production Python SDK Integration</span>
          </a>
        </div>
      </section>

      {/* SECTION 01: THE DANGER OF MASTER KEYS IN AI AGENTS */}
      <section
        id="sec-danger"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider font-semibold">
          <AlertTriangle className="w-4 h-4" />
          <span>Section 01 • The Catastrophic Vulnerability</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The Fatal Mistake: Putting Master Private Keys & Corporate Cards in AI Runtimes
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed text-sm sm:text-base">
          <p>
            Autonomous AI agents are fundamentally unpredictable. They execute arbitrary code,
            browse untrusted websites, parse malicious user inputs, and process unverified
            third-party data feeds. Yet, many development teams make a critical security blunder:
          </p>
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-300 text-sm">
            <strong>The Threat Vector:</strong> Handing an AI agent an unconstrained EVM private key
            or corporate credit card API key. If the agent suffers a{' '}
            <em>prompt injection, jailbreak attack, or infinite hallucination loop</em>, an attacker
            can instruct the agent to transfer the entire treasury balance to an external wallet or
            generate tens of thousands of dollars in cloud charges within minutes.
          </div>
          <p>
            An autonomous agent should <strong>never hold the keys to the kingdom</strong>. It must
            operate under the principle of <em>Least Privilege & Cryptographic Bounds</em>.
          </p>
        </div>
      </section>

      {/* SECTION 02: THE "COOKED AT THE GATE" PARADIGM */}
      <section
        id="sec-gatekeeper"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Section 02 • The Architectural Metaphor</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The &ldquo;Cooked at the Gate&rdquo; Principle: Why A-Pay Prevents Data Leaks
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Why do different AI companies, enterprises, and autonomous agents refuse to work
            together today? <strong>Fear of data leakage.</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-4">
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2.5">
              <div className="text-rose-700 dark:text-rose-400 font-bold text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>The Flawed Legacy Method: &ldquo;Inviting Inside&rdquo;</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                To get data or services, Agent A invites Agent B inside its private server or
                database. Agent B can scrape internal files, steal system prompts, inspect customer
                records, or trigger prompt injection vulnerabilities.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-2.5">
              <div className="text-emerald-700 dark:text-emerald-300 font-bold text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>The A-Pay Standard: &ldquo;Order at the Gate&rdquo;</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Agent A never enters the house. It stands strictly outside at the API Gate. It hands
                over the order parameters and a cryptographic <strong>EIP-712 micro-payment</strong>{' '}
                ($0.005). The internal agent cooks the order in its private sandbox, delivers the
                finished JSON, and the gate closes. Zero data leaks!
              </p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
            <strong>Key takeaway:</strong> Just like ordering takeout at a restaurant window—you
            don't give the customer access to your kitchen recipes, employee records, or safe. You
            take their order, take their payment, cook the meal inside, and hand it across the
            counter. That is how the machine-to-machine economy scales safely.
          </div>
        </div>
      </section>

      {/* SECTION 03: INTERACTIVE M2M SEQUENCE SIMULATOR (COOKED AT THE GATE) */}
      <section
        id="sec-interactive-flow"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Workflow className="w-4 h-4" />
          <span>Section 03 • Interactive Architecture Simulator</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Live M2M Sequence: How Gemini Buys Complex Code from Claude
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Click through each stage to observe how the perimeter gate, session keys, and Base L2
            escrow coordinate without human intervention.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          {[
            { step: 1, label: '1. Task Plan', sub: 'Gemini Planner' },
            { step: 2, label: '2. 402 Challenge', sub: 'Perimeter Gate' },
            { step: 3, label: '3. EIP-712 Permit', sub: 'Session Sign' },
            { step: 4, label: '4. Sandbox Cook', sub: 'Claude Worker' },
            { step: 5, label: '5. Delivery & Settle', sub: 'Base L2 Escrow' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveSeqStep(item.step)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeSeqStep === item.step
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <div className="font-bold">{item.label}</div>
              <div className="text-[10px] opacity-80 truncate">{item.sub}</div>
            </button>
          ))}
        </div>

        {/* Active Stage Simulation Viewport */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                STAGE {activeSeqStep} OF 5:{' '}
                {activeSeqStep === 1 && 'Task Decomposition & Outsource Route'}
                {activeSeqStep === 2 && 'Perimeter Gate Interception (HTTP 402)'}
                {activeSeqStep === 3 && 'In-Memory EIP-712 Permit Signing (< 5ms)'}
                {activeSeqStep === 4 && '"Cooked at the Gate" Execution in Sandbox'}
                {activeSeqStep === 5 && 'Artifact Delivery & Atomic Escrow Settlement'}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-400 border border-blue-500/30">
              {activeSeqStep === 1 && 'Actor: Google Gemini 2.5 Flash'}
              {activeSeqStep === 2 && 'Actor: A-Pay Gateway Reverse Proxy'}
              {activeSeqStep === 3 && 'Actor: Ephemeral AgentWallet'}
              {activeSeqStep === 4 && 'Actor: Anthropic Claude 3.5 Sonnet'}
              {activeSeqStep === 5 && 'Actor: EscrowVault.sol (Base L2)'}
            </span>
          </div>

          {/* Description of Step */}
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {activeSeqStep === 1 && (
              <p>
                The <strong>Gemini Orchestrator</strong> processes enterprise instructions and
                detects that generating an optimized zero-knowledge elliptic curve verifier in Rust
                exceeds its primary specialization. Instead of failing or hallucinating, it creates
                a strict task JSON payload and calls the registered Claude coding endpoint at{' '}
                <code className="text-sky-400">https://claude-coder.ai/api/v1/rust-zk</code>.
              </p>
            )}
            {activeSeqStep === 2 && (
              <p>
                Claude’s API perimeter gate intercepts the unauthenticated request. Rather than
                demanding an API key or blocking the call, it halts execution and returns standard{' '}
                <code className="text-amber-400 font-bold">HTTP 402 Payment Required</code> with the
                cryptographic price envelope ($0.04 USDC on Base L2).
              </p>
            )}
            {activeSeqStep === 3 && (
              <p>
                Gemini’s in-memory <code className="text-indigo-400">AgentWallet</code> receives the
                402 response. It checks its daily limit ($2.00 max, $0.12 spent so far). Finding the
                price within bounds, it signs an off-chain EIP-712 permit in{' '}
                <strong className="text-emerald-400">3.8 milliseconds</strong> without paying
                on-chain gas.
              </p>
            )}
            {activeSeqStep === 4 && (
              <p>
                Claude’s gateway validates the permit signature against A-Pay’s public key registry.
                The task is dispatched into an isolated execution sandbox. Claude compiles the Rust
                verifier code.{' '}
                <strong>Gemini never sees Claude’s proprietary backend prompts</strong>, and Claude
                never sees Gemini’s master context!
              </p>
            )}
            {activeSeqStep === 5 && (
              <p>
                The finished Rust ZK code is delivered back to Gemini with{' '}
                <code className="text-emerald-400 font-bold">HTTP 200 OK</code>. Simultaneously,
                Claude batches the signed permit to Base L2, where{' '}
                <code className="text-indigo-400">EscrowVault.sol</code> transfers 0.04 USDC from
                Gemini’s deposit. Perfect closure!
              </p>
            )}
          </div>

          {/* Mock Network Payload Terminal */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-1 text-slate-400 overflow-x-auto">
            {activeSeqStep === 1 && (
              <>
                <div className="text-slate-500">
                  # Gemini Client Outbound Request (Initial Call)
                </div>
                <div className="text-emerald-400">POST /api/v1/rust-zk HTTP/1.1</div>
                <div>Host: claude-coder.ai</div>
                <div>User-Agent: Google-Gemini-Orchestrator/2.5</div>
                <div>Content-Type: application/json</div>
                <div className="text-slate-300">
                  {JSON.stringify(
                    { task: 'rust_zk_verifier', curve: 'bn254', opt_level: 3 },
                    null,
                    2,
                  )}
                </div>
              </>
            )}

            {activeSeqStep === 2 && (
              <>
                <div className="text-slate-500"># Claude Perimeter Gate Challenge (HTTP 402)</div>
                <div className="text-amber-400 font-bold">HTTP/1.1 402 Payment Required</div>
                <div>X-APay-Version: 2.0</div>
                <div className="text-sky-300">X-APay-Amount: 40000 (0.04 USDC)</div>
                <div>X-APay-Receiver: 0x71C...ClaudeProviderVault</div>
                <div>X-APay-Nonce: e90b8f21-74c1-4bb2-809a-482f8a19de02</div>
                <div>X-APay-Network: base-sepolia (84532)</div>
              </>
            )}

            {activeSeqStep === 3 && (
              <>
                <div className="text-slate-500">
                  # Gemini In-Memory EIP-712 Signature Generation
                </div>
                <div className="text-indigo-400">
                  PermitType: SpendPermit(address agent, uint256 amount, uint256 nonce, uint256
                  deadline)
                </div>
                <div>AgentKey: 0xAgentEphemeralSession (Budget: $1.84 remaining)</div>
                <div className="text-emerald-400 font-bold">
                  Signature: 0x7fa2b984d12c...[65 bytes]
                </div>
                <div>Retry: POST /api/v1/rust-zk with Authorization: APay-Permit 0x7fa2b...</div>
              </>
            )}

            {activeSeqStep === 4 && (
              <>
                <div className="text-slate-500">
                  # Claude Isolated Execution Sandbox (Zero Data Leak)
                </div>
                <div className="text-sky-400">[SANDBOX INIT] Container ID: cld-zk-8942</div>
                <div>[AUTH PASS] EIP-712 Signature verified via APayVerifier.sol</div>
                <div>[COMPILE] rustc --target wasm32-unknown-unknown -O bn254_verifier.rs</div>
                <div className="text-emerald-400">[SUCCESS] 0 errors, 42 tests passed in 890ms</div>
              </>
            )}

            {activeSeqStep === 5 && (
              <>
                <div className="text-slate-500"># Delivery & Base L2 Escrow Settlement</div>
                <div className="text-emerald-400 font-bold">
                  HTTP/1.1 200 OK (Delivered to Gemini)
                </div>
                <div>TxHash: 0x3f98a72... on Base-Sepolia</div>
                <div className="text-indigo-300">
                  EscrowVault.transfer(from: 0xGeminiVault, to: 0xClaudeProvider, amount: 0.04 USDC)
                </div>
                <div className="text-slate-400">
                  Remaining Gemini Daily Budget: 1.84 USDC • Master Treasury Untouched
                </div>
              </>
            )}
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={activeSeqStep === 1}
              onClick={() => setActiveSeqStep((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 transition-colors"
            >
              ← Previous Step
            </button>
            <span className="text-[11px] font-mono text-slate-500">
              Interactive M2M Walkthrough
            </span>
            <button
              type="button"
              disabled={activeSeqStep === 5}
              onClick={() => setActiveSeqStep((p) => Math.min(5, p + 1))}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              Next Step →
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 04: CROSS-MODEL COLLABORATION DETAILS */}
      <section
        id="sec-crossmodel"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
          <Bot className="w-4 h-4" />
          <span>Section 04 • Real-World Swarm Collaboration</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Cross-Model Swarms: Why Multi-Agent Teams Outperform Monolithic Models
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            No single AI model will ever dominate every single computational domain.{' '}
            <strong>Google Gemini</strong> excels at million-token long context, video ingestion,
            and high-speed planning. Meanwhile, <strong>Anthropic Claude 3.5 Sonnet</strong> leads
            in complex software refactoring and formal logic. Similarly, open-source models like{' '}
            <strong>DeepSeek-V3</strong> provide specialized low-cost mathematics.
          </p>
          <p>
            Before A-Pay, chaining these models together required centralized API keys, shared
            credit card limits, and fragile webhooks. With A-Pay, models become{' '}
            <strong>autonomous economic peers</strong> that trade specialized compute for
            micro-cents.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-blue-600 dark:text-sky-400 font-bold text-sm">
                1. Context Partitioning
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Instead of stuffing a 500-page specification into every sub-agent’s prompt, the
                orchestrator sends only the exact snippet needed for the paid sub-task, slashing
                inference token costs by 80%.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                2. Vendor Independence
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                If an Anthropic endpoint is degraded or price-inflated, the orchestrator
                automatically switches to an alternative coding provider listed in the A-Pay
                registry with zero code modifications.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                3. Built-In Micro-Incentives
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sub-agents compete on latency, verification pass rate, and price. High-quality model
                providers earn compounding Base USDC directly to their non-custodial smart
                contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05: ESCROWVAULT.SOL CONTRACT ARCHITECTURE */}
      <section
        id="sec-contract"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
          <Lock className="w-4 h-4" />
          <span>Section 05 • On-Chain Smart Contract Mechanics</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          How EscrowVault.sol Enforces Invariant Security on Base L2
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            The heart of A-Pay's buyer architecture is{' '}
            <code className="text-indigo-600 dark:text-indigo-400 font-bold">EscrowVault.sol</code>,
            deployed on Base L2. It cleanly separates <strong>Custody</strong> from{' '}
            <strong>Execution Authority</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">1. MASTER VAULT</div>
              <div className="text-slate-900 dark:text-white font-sans text-xs font-semibold">
                Non-Custodial Deposit
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">
                The human operator deposits 50 USDC. Only the operator can withdraw master funds.
                Contract funds can never be seized or frozen by the protocol.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                2. DELEGATED SESSIONS
              </div>
              <div className="text-slate-900 dark:text-white font-sans text-xs font-semibold">
                Daily Budget Locks
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">
                Operator authorizes an ephemeral agent key with a strict{' '}
                <code className="text-indigo-600 dark:text-indigo-400 font-bold">dailyLimit</code>{' '}
                (e.g. 2.00 USDC) and{' '}
                <code className="text-indigo-600 dark:text-indigo-400 font-bold">expiresAt</code>{' '}
                timestamp.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                3. ATOMIC SPEND CLAIM
              </div>
              <div className="text-slate-900 dark:text-white font-sans text-xs font-semibold">
                Router Verification
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">
                When an API provider claims payment, EscrowVault validates the agent's signature,
                decrements <code className="font-bold">spentToday</code>, and atomically transfers
                funds without middleman approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 06: THE CRYPTOGRAPHIC CIRCUIT BREAKER */}
      <section
        id="sec-circuit-breaker"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold">
          <AlertOctagon className="w-4 h-4" />
          <span>Section 06 • Algorithmic Guardrails</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The Cryptographic Circuit Breaker: Preventing Infinite AI Spend Loops
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            The #1 fear of engineering executives deploying autonomous swarms is the{' '}
            <strong>Runaway Spend Loop</strong>: an agent encounters an edge-case error, enters an
            infinite recursive retry loop, and drains thousands of dollars while the engineering
            team is asleep.
          </p>
          <p>
            A-Pay’s client SDK (
            <code className="font-mono text-indigo-600 dark:text-indigo-400">AgentWallet</code>) and
            Base L2 smart contracts enforce a 5-layer cryptographic circuit breaker:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>1. Hard Spend Ceiling</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <code className="font-mono">max_per_call_usdc = 0.05</code>. Even if a compromised
                or malicious API returns a 402 challenge demanding $10.00, the client SDK rejects
                the payment locally without signing.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>2. Sliding Window Velocity</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Rate-limits payments to a maximum frequency (e.g. 10 calls per minute). If a bug
                triggers 500 requests in 2 seconds, the circuit opens and halts outgoing
                transactions immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>3. 60-Second Permit Expiry</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Permits carry an on-chain block deadline (
                <code className="font-mono">deadline = now + 60s</code>). API providers cannot hoard
                permits or replay them weeks later during market volatility.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>4. Ephemeral Key Isolation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Session keys live only in active worker process memory. They are never written to
                disk, git repos, or environment variables. If a worker container crashes, the key
                vanishes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>5. Emergency Kill-Switch</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                A single on-chain transaction{' '}
                <code className="font-mono">revokeAgent(agentAddr)</code> completely terminates the
                agent’s signing authority on Base L2 within 2 seconds.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>6. Automated Webhook Alerts</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                When an agent reaches 80% of its daily budget, A-Pay dispatches an instant webhook
                to Discord, Slack, or Telegram so human operators stay completely informed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 07: UNIVERSAL SETTLEMENT COMPARISON MATRIX */}
      <section
        id="sec-matrix"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <TrendingUp className="w-4 h-4" />
          <span>Section 07 • Technology Benchmark</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Universal Settlement Matrix: A-Pay M2M vs Traditional Stripe vs L1 Crypto
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Why can’t AI engineers just use Stripe, PayPal, or standard crypto transfers? The table
            below explains the mathematical, architectural, and security reasons why A-Pay is the
            only purpose-built payment rail for autonomous machine agents:
          </p>

          {/* Responsive Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-900 dark:text-white font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Feature / Metric</th>
                  <th className="p-4 text-rose-600 dark:text-rose-400">Traditional Stripe</th>
                  <th className="p-4 text-amber-600 dark:text-amber-400">Legacy L1 Crypto</th>
                  <th className="p-4 text-indigo-600 dark:text-sky-400 bg-blue-50/50 dark:bg-blue-950/30 font-bold">
                    ⚡ A-Pay M2M Rail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Min Viable Payment
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">
                    $0.50 (due to $0.30 fixed fee)
                  </td>
                  <td className="p-4 text-amber-600 dark:text-amber-400">
                    $1.50 - $4.00 (gas fees)
                  </td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-blue-50/30 dark:bg-blue-950/20">
                    $0.0001 (Zero minimum fee)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Execution Latency
                  </td>
                  <td className="p-4">1,200 ms - 2,500 ms</td>
                  <td className="p-4">12,000 ms (12 sec block time)</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-blue-50/30 dark:bg-blue-950/20">
                    &lt; 5 ms (EIP-712 off-chain permit)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Machine Autonomy
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">
                    ❌ Fails (Demands CVV & 3DS OTP)
                  </td>
                  <td className="p-4 text-amber-600 dark:text-amber-400">
                    ⚠️ Partial (Agent needs gas funds)
                  </td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-blue-50/30 dark:bg-blue-950/20">
                    ✅ 100% Native RFC-2068 HTTP 402
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Data Privacy & Security
                  </td>
                  <td className="p-4">Exposes PII & Billing Address</td>
                  <td className="p-4">Public Mempool Frontrunning</td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-blue-50/30 dark:bg-blue-950/20">
                    &ldquo;Cooked at the Gate&rdquo; Perimeter
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Risk on Agent Hack
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">
                    Full Credit Card Limit ($10k+)
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">100% Treasury Drained</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-blue-50/30 dark:bg-blue-950/20">
                    Capped to Daily Limit ($2.00 max)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 08: 6 TYPES OF AI FOUNDERS WHO NEED AGENT VAULTS */}
      <section
        id="sec-archetypes-buyer"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
          <Users className="w-4 h-4" />
          <span>Section 08 • Founder & Developer Archetypes</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Who Needs Agent Vaults? 6 AI Architectures Unlocked by Micro-Wallets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              1. Multi-Agent Swarms (CrewAI / AutoGen)
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              When 10 agents collaborate (Researcher, Writer, Reviewer, Coder), each agent has its
              own budget vault to buy external APIs, web scraping credits, and specialized models
              without sharing API keys.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              2. Micro-SaaS & Self-Funding AI Bots
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Indie hackers building autonomous Twitter bots, Telegram assistants, or stock
              scanners. The bot earns from users and spends from its vault to buy its own GPU
              compute and search tokens.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              3. High-Frequency Intelligence Agents
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Agents tracking patents, court filings, crypto liquidations, or academic preprints.
              Instead of paying $500/month subscriptions for 20 databases, they pay $0.005 per
              unlocked document on-demand.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              4. Edge & IoT Autonomous Hardware
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Drones, smart cameras, and local Raspberry Pi units running local vision models. When
              an edge device encounters an unknown anomaly, it spends $0.01 from its vault to query
              a high-end cloud model for second-opinion confirmation.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              5. Enterprise Multi-Department AI
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Enterprises deploying internal assistants across HR, Sales, Legal, and Engineering.
              Finance managers allocate an A-Pay escrow to each department agent, eliminating
              runaway corporate credit card surprises.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              6. Continuous Pentesting & Security Swarms
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Autonomous security agents scanning web apps for zero-days. When a vulnerability is
              suspected, the agent pays specialized threat-intel sandboxes to verify payload
              execution without leaking target client URLs.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 09: INTERACTIVE SESSION VAULT SIMULATOR */}
      <section
        id="sec-simulator"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Sliders className="w-4 h-4" />
          <span>Section 09 • Interactive Risk & Budget Simulator</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Session Vault Simulator: Stress-Test Your Agent's Risk Boundary
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Adjust the sliders below to see how EscrowVault.sol guarantees that even if an agent key
            is compromised, your primary treasury remains mathematically untouchable:
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Master Vault Balance (Cold Wallet):
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    ${masterDeposit} USDC
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={masterDeposit}
                  onChange={(e) => setMasterDeposit(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Agent Daily Spend Ceiling:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ${agentDailyLimit.toFixed(2)} USDC / day
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={agentDailyLimit}
                  onChange={(e) => setAgentDailyLimit(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Avg Micro-Payment Per API Call:
                  </span>
                  <span className="text-blue-600 dark:text-sky-400 font-bold">
                    ${maxPerCall.toFixed(3)} USDC
                  </span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.10"
                  step="0.005"
                  value={maxPerCall}
                  onChange={(e) => setMaxPerCall(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Live Outputs */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Autonomous Calls Capable / 24h:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {maxCallsPerDay.toLocaleString()} requests
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex justify-between items-center">
                <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                  Protected Cold Treasury:
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ${protectedMasterBalance.toFixed(2)} USDC ({safetyPercentage}% Safe)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 flex justify-between items-center">
                <span className="text-rose-800 dark:text-rose-300 font-semibold">
                  Maximum Risk on Jailbreak / Hack:
                </span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  ${maxCompromiseLoss.toFixed(2)} USDC (Strict 24h Ceiling)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: PRODUCTION PYTHON SDK CODE INTEGRATION */}
      <section
        id="sec-code-sdk"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Code2 className="w-4 h-4" />
          <span>Section 10 • Production Code Implementation</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          How to Equip Any Python or LangChain AI Agent in Under 3 Minutes
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Equipping your autonomous agent with A-Pay requires just a few lines of code using our
            official Python SDK:
          </p>

          <div className="relative rounded-2xl bg-slate-950 text-slate-200 p-4 sm:p-5 font-mono text-xs border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                copyCode(
                  `from apay import AgentWallet, APaySession

# 1. Initialize ephemeral in-memory wallet from environment session key
# (Never use your master vault private key!)
wallet = AgentWallet(
    session_key="0x_your_ephemeral_agent_session_key",
    vault_address="${contracts.EscrowVault.address}",
    network="base-sepolia",
    max_per_call_usdc=0.05,  # Cryptographic circuit breaker
    daily_budget_usdc=2.00   # Maximum daily spending ceiling
)

# 2. Wrap standard httpx / requests with APaySession
session = APaySession(wallet=wallet)

# 3. Request paid intelligence, GPU compute, or high-value data
# The session automatically detects HTTP 402, signs an EIP-712 permit,
# and retries in < 5ms without human intervention!
response = session.post(
    "https://api.marketintelligence.ai/v1/earnings-whispers",
    json={"ticker": "NVDA", "depth": "institutional"}
)

data = response.json()
print("Data unlocked autonomously! Spent:", response.headers.get("X-APay-Spent"), "USDC")`,
                  'code-python-agent',
                )
              }
              className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copiedCodeId === 'code-python-agent' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <pre className="text-slate-300 leading-relaxed">
              <code>{`from apay import AgentWallet, APaySession

# 1. Initialize ephemeral in-memory wallet from environment session key
# (Never use your master vault private key!)
wallet = AgentWallet(
    session_key="0x_your_ephemeral_agent_session_key",
    vault_address="${contracts.EscrowVault.address}",
    network="base-sepolia",
    max_per_call_usdc=0.05,  # Cryptographic circuit breaker
    daily_budget_usdc=2.00   # Maximum daily spending ceiling
)

# 2. Wrap standard httpx / requests with APaySession
session = APaySession(wallet=wallet)

# 3. Request paid intelligence, GPU compute, or high-value data
# The session automatically detects HTTP 402, signs an EIP-712 permit,
# and retries in < 5ms without human intervention!
response = session.post(
    "https://api.marketintelligence.ai/v1/earnings-whispers",
    json={"ticker": "NVDA", "depth": "institutional"}
)

data = response.json()
print("Data unlocked autonomously! Spent:", response.headers.get("X-APay-Spent"), "USDC")`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 11: TECHNICAL FAQS */}
      <section
        id="sec-faqs-vaults"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
          <HelpCircle className="w-4 h-4" />
          <span>Section 11 • Agentic Engineering FAQs</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions: Security, Gas & Non-Custodial Custody
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors text-sm sm:text-base"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedFaq === idx ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION CARD */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white p-8 sm:p-12 shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-mono font-semibold">
            <Key className="w-3.5 h-3.5" />
            <span>START YOUR AGENT VAULT IN 60 SECONDS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Risking Master Keys. Launch Your Agent Vault Today.
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            Deposit testnet Base USDC, issue delegated session keys with daily spend caps, and let
            your AI agents purchase specialized intelligence, search, and compute with zero prompt
            injections or data leakage risks.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('vaults')}
              className="px-6 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-slate-100 font-bold text-sm shadow-lg shadow-black/10 transition-all flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Launch Agent Vault Console</span>
            </button>
            <button
              type="button"
              onClick={handleShareOnX}
              className="px-5 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/50 border border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Paper on X</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 12: LEGAL & TRADEMARK NOMINATIVE FAIR USE DISCLAIMER */}
      <section
        id="sec-legal-notice-vaults"
        className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-xs space-y-2 leading-relaxed"
      >
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Legal Disclaimer & Trademark Notice (Nominative Fair Use)</span>
        </div>
        <p>
          All trademarks, registered trademarks, company names, model names, logos, and brand
          identifiers referenced across A-Pay research papers, technical guides, benchmarks, and
          documentation (including but not limited to Google®, Gemini®, Anthropic®, Claude®,
          OpenAI®, ChatGPT®, DeepSeek®, Stripe®, PayPal®, and Base®) are the property of their
          respective trademark holders.
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
