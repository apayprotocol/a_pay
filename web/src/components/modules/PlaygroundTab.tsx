'use client';

import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import {
  executePlaygroundAgentPrompt,
  type PlaygroundExecutionResult,
} from '@/services/blockchain';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  execution?: PlaygroundExecutionResult['execution'];
  agent?: PlaygroundExecutionResult['agent'];
  cost?: string;
  isError?: boolean;
}

const SAMPLE_PROMPTS = [
  {
    label: 'Analyze BTC Order Flow',
    category: 'Finance',
    prompt: 'Analyze institutional BTC order flow, dark pool prints, and ETF net inflows.',
    icon: '📈',
  },
  {
    label: 'Audit EscrowVault Contract',
    category: 'Security',
    prompt: 'Audit smart contract 0xd08c8a337e5339d1c083e06d74a9265956ceea16 for vulnerabilities.',
    icon: '🛡️',
  },
  {
    label: 'Scan Aerodrome Whale Swaps',
    category: 'DEX',
    prompt: 'Scan Base Aerodrome pools for recent $100k+ whale swaps and buyback burn events.',
    icon: '🐋',
  },
  {
    label: 'Ask DeepSeek-V3 Reasoning',
    category: 'AI / MoE',
    prompt: 'Explain how A-Pay session key escrow delegation prevents unauthorized spend.',
    icon: '🧠',
  },
  {
    label: 'Scrape Base.org to Markdown',
    category: 'Scraping',
    prompt: 'Scrape and extract clean markdown content from https://base.org.',
    icon: '🌐',
  },
  {
    label: 'Global Satellite Doppler',
    category: 'IoT Feed',
    prompt: 'Retrieve current atmospheric pressure and Doppler radar satellite telemetry.',
    icon: '🛰️',
  },
];

export function PlaygroundTab({
  walletAddress,
  activeNetwork = 'base-sepolia',
  initialPrompt,
  onNavigateToTab,
}: {
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
  initialPrompt?: string;
  onNavigateToTab?: (tab: string) => void;
}) {
  const contracts = getNetworkContracts(activeNetwork);

  // Agent Session State
  const [sessionAgentAddress, setSessionAgentAddress] = useState<string>(
    '0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C',
  );
  const [sessionBudgetApay, setSessionBudgetApay] = useState<number>(10.0);
  const [totalSpentUsd, setTotalSpentUsd] = useState<number>(0.0);
  const [paidCallsCount, setPaidCallsCount] = useState<number>(0);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      text: `### 🤖 A-Pay Autonomous Agent Online\n\nI am your non-custodial **Autonomous AI Agent** connected to the A-Pay Protocol on **${contracts.chain.chainName}**.\n\nAsk me any complex task. I will autonomously discover the matching API in the **M2M Marketplace**, generate a cryptographically valid **EIP-712 payment authorization**, unlock the HTTP 402 paywall, and analyze the response in real time.\n\n*Click any quick-prompt below or type your custom query to begin!*`,
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>(initialPrompt || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, loadingStep]);

  useEffect(() => {
    if (initialPrompt) {
      setInputPrompt(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      setLoadingStep('Discovering optimal service in M2M Marketplace...');
      await new Promise((r) => setTimeout(r, 220));

      setLoadingStep('Instantiating session key & signing EIP-712 typed voucher...');
      await new Promise((r) => setTimeout(r, 250));

      setLoadingStep('Dispatching HTTP 402 challenge & unlocking data payload...');
      const result = await executePlaygroundAgentPrompt({
        prompt: text,
        network: activeNetwork,
      });

      setLoadingStep('Synthesizing verified multi-modal response...');
      await new Promise((r) => setTimeout(r, 200));

      // Update session statistics
      if (result.agent?.walletAddress) {
        setSessionAgentAddress(result.agent.walletAddress);
      }
      setPaidCallsCount((c) => c + 1);

      const priceStr = result.execution?.serviceCalled?.price || '$0.001';
      if (priceStr.includes('$APAY')) {
        const amt = Number.parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 2.0;
        setSessionBudgetApay((b) => Math.max(0, b - amt));
      } else {
        const amt = Number.parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0.001;
        setTotalSpentUsd((s) => s + amt);
      }

      const assistantMessage: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        text: result.response.text,
        timestamp: result.response.timestamp || Date.now(),
        execution: result.execution,
        agent: result.agent,
        cost: result.response.cost,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      // Auto-expand the latest execution details for developer insight
      setExpandedDetails((prev) => ({ ...prev, [assistantMessage.id]: true }));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Execution failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Agent Execution Error**: ${errorMsg}. Please try another query or verify RPC connectivity.`,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleResetSession = () => {
    setSessionBudgetApay(10.0);
    setTotalSpentUsd(0.0);
    setPaidCallsCount(0);
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        text: `### 🔄 Session Reset Complete\n\nAgent session wallet refreshed with **10.00 $APAY** test allowance on **${contracts.chain.chainName}**.\n\nReady for new autonomous queries!`,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-spatial font-bold text-slate-900 dark:text-white">
              Autonomous AI Agent Playground
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EIP-712 M2M Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Give the agent a natural language prompt. It will automatically match the right API in
            the M2M Marketplace, cryptographically sign an on-chain EIP-712 payment authorization,
            and return synthesized intelligence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 z-10">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('marketplace')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Browse Marketplace</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleResetSession}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-transparent transition-all flex items-center gap-1.5"
            title="Reset session & allowances"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry & Session Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Agent Identity */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Agent Sub-Wallet
            </span>
            <span className="font-mono text-[10px] text-emerald-500 font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
              {sessionAgentAddress.slice(0, 6)}...{sessionAgentAddress.slice(-4)}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(sessionAgentAddress, 'agent_wallet')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Copy Agent Wallet Address"
            >
              {copiedId === 'agent_wallet' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            Ephemeral EIP-712 signer (In-Memory)
          </p>
        </div>

        {/* Session Allowance Balance */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Session Balance
            </span>
            <span className="text-[10px] text-blue-400 font-mono">Escrow Allowance</span>
          </div>
          <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white mt-1">
            {sessionBudgetApay.toFixed(2)}{' '}
            <span className="text-xs font-mono text-amber-500">$APAY</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            Auto-refunds unused allocations
          </p>
        </div>

        {/* Total Spend */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Total Settled
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">0% Slippage</span>
          </div>
          <div className="text-lg font-bold font-spatial text-slate-900 dark:text-white mt-1">
            ${totalSpentUsd.toFixed(4)}{' '}
            <span className="text-xs font-mono text-slate-400">USDC</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            {paidCallsCount} HTTP 402 vouchers signed
          </p>
        </div>

        {/* Network & Router */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Settlement Layer
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ID: {contracts.chain.chainId}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
            {contracts.chain.shortName}
          </div>
          <p className="text-[10px] font-mono text-slate-400 truncate mt-1">
            Router: {contracts.APayRouter.address.slice(0, 10)}...
          </p>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Prompts (Auto-Discovers Marketplace Endpoints):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((sp) => (
            <button
              key={sp.label}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendPrompt(sp.prompt)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/80 dark:bg-slate-900/80 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/50 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <span>{sp.icon}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{sp.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">({sp.category})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Chat Window */}
      <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-lg overflow-hidden flex flex-col min-h-[500px] backdrop-blur-md">
        {/* Chat Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-3xl rounded-2xl p-4 sm:p-5 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none ml-8'
                    : msg.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-tl-none mr-8'
                      : 'bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 rounded-tl-none mr-8'
                }`}
              >
                {/* Role Header */}
                <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-white/10 dark:border-slate-800/60 text-[11px] font-mono opacity-80">
                  <span className="flex items-center gap-1.5 font-bold">
                    {msg.role === 'user' ? (
                      '👤 Human Operator'
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                        <span>A-Pay Autonomous Agent</span>
                      </>
                    )}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>

                {/* Formatted Content */}
                <div className="text-xs sm:text-sm leading-relaxed space-y-2 prose dark:prose-invert max-w-none">
                  {msg.text.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3
                          key={idx}
                          className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-2 mb-1"
                        >
                          {paragraph.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('#### ')) {
                      return (
                        <h4
                          key={idx}
                          className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1"
                        >
                          {paragraph.replace('#### ', '')}
                        </h4>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      const items = paragraph.split('\n- ');
                      return (
                        <ul key={idx} className="list-disc pl-4 space-y-1 text-xs">
                          {items.map((it, i) => (
                            <li key={i}>{it.replace(/^- /, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Execution Details Accordion (for assistant messages with real execution) */}
                {msg.execution && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleDetails(msg.id)}
                      className="w-full flex items-center justify-between text-xs font-mono font-semibold text-blue-600 dark:text-sky-400 hover:opacity-80 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        Wire Protocol Settlement Receipt & Payload (
                        {msg.execution.serviceCalled.name})
                      </span>
                      {expandedDetails[msg.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedDetails[msg.id] && (
                      <div className="mt-3 space-y-3 font-mono text-[11px] bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800">
                        {/* 4-Step Wire Protocol Stepper */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pb-3 border-b border-slate-800">
                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[10px] text-purple-400 block font-bold">
                              1. Discovered API
                            </span>
                            <span className="text-slate-300 font-semibold truncate block">
                              {msg.execution.serviceCalled.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {msg.execution.serviceCalled.category}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[10px] text-blue-400 block font-bold">
                              2. EIP-712 Voucher
                            </span>
                            <span className="text-slate-300 font-semibold truncate block">
                              Nonce: {msg.execution.voucher.nonce.slice(0, 8)}...
                            </span>
                            <span className="text-[10px] text-emerald-400">
                              Cost: {msg.execution.serviceCalled.price}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[10px] text-amber-400 block font-bold">
                              3. HTTP 402 Paywall
                            </span>
                            <span className="text-slate-300 font-semibold truncate block">
                              Auth: EIP712 Signed
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Latency: {msg.execution.durationMs}ms
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                            <span className="text-[10px] text-emerald-400 block font-bold">
                              4. Base L2 Settlement
                            </span>
                            <a
                              href={msg.execution.settlement.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:underline flex items-center gap-1 font-semibold truncate"
                            >
                              <span>View BaseScan</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <span className="text-[10px] text-slate-400">
                              Status: {msg.execution.settlement.status}
                            </span>
                          </div>
                        </div>

                        {/* Raw Payment Voucher Header */}
                        <div>
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="text-[10px] text-sky-400 font-bold">
                              Cryptographic Authorization Header:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  msg.execution?.voucher?.authHeader || '',
                                  `hdr_${msg.id}`,
                                )
                              }
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedId === `hdr_${msg.id}` ? 'Copied!' : 'Copy Header'}
                            </button>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] break-all text-slate-300">
                            {msg.execution?.voucher?.authHeader}
                          </div>
                        </div>

                        {/* Decrypted Payload JSON */}
                        <div>
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Decrypted Service Payload (HTTP 200 Body):
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(msg.execution?.payload || {}, null, 2),
                                  `pl_${msg.id}`,
                                )
                              }
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedId === `pl_${msg.id}` ? 'Copied!' : 'Copy JSON'}
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] overflow-x-auto text-emerald-400">
                            {JSON.stringify(msg.execution.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Progress / Typing Indicator */}
          {isLoading && (
            <div className="flex items-start space-y-2 mr-8">
              <div className="rounded-2xl rounded-tl-none p-4 bg-slate-50 dark:bg-slate-950/70 border border-blue-500/30 text-slate-900 dark:text-slate-100 shadow-sm max-w-xl">
                <div className="flex items-center gap-2 text-xs font-mono text-blue-500 dark:text-sky-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-bold">Autonomous Execution in Progress:</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>{loadingStep || 'Processing query...'}</span>
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Give your agent a task (e.g., 'Analyze BTC order flow' or 'Audit contract 0xd08c...')"
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 shadow-inner disabled:opacity-50"
              />
              <span className="absolute right-3.5 top-3.5 text-slate-400 text-xs hidden sm:inline font-mono">
                ↵ Enter
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-1 font-mono">
            <span>Machine-to-Machine settlements via Base L2 EIP-712 payment authorization.</span>
            <span>Non-custodial • Session isolated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
