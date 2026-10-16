'use client';

import {
  Bot,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Droplets,
  ExternalLink,
  MessageSquareCode,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useEffect, useState } from 'react';

// SSR-safe dynamic import — zero LCP impact
const AlienBotCanvas = dynamic(
  () => import('./3d/AlienBotCanvas').then((mod) => mod.AlienBotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    ),
  },
);

type BotTab = 'quick' | 'faucet' | 'paywall' | 'mcp';

export function AlienBotFlyer() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<BotTab>('quick');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deferred mount via requestIdleCallback — keeps initial LCP 100% clean
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem('apay_alien_dismissed') === 'true') {
      setIsDismissed(true);
    }

    const checkDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(checkDark());

    const themeObserver = new MutationObserver(() => setIsDark(checkDark()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const startMount = () => setIsMounted(true);
    if ('requestIdleCallback' in window) {
      const handle = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(startMount, { timeout: 1500 });
      return () => {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
          handle,
        );
        themeObserver.disconnect();
      };
    }
    const t = setTimeout(startMount, 800);
    return () => {
      clearTimeout(t);
      themeObserver.disconnect();
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    setIsOpen(false);
    sessionStorage.setItem('apay_alien_dismissed', 'true');
  };

  const handleRestore = () => {
    setIsDismissed(false);
    sessionStorage.removeItem('apay_alien_dismissed');
  };

  const copyText = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 2000);
    }
  };

  const BOT_URL = 'https://t.me/APayProtocolBot';

  if (!isMounted) return null;

  // Minimized pill (when closed by user)
  if (isDismissed) {
    return (
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={handleRestore}
          aria-label="Open A-Pay Dev Bot"
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer min-h-[44px] hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-slate-950/95 text-white border-blue-500/50 shadow-blue-950/60 hover:border-blue-400'
              : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-900/15 hover:border-blue-400'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <Bot className="w-4 h-4 text-blue-500 dark:text-sky-400" />
          <span className="text-xs font-semibold">A-Pay Dev Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end select-none pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Interactive Developer Assistant Chatbox */}
      {isOpen && (
        <div
          className={`mb-3 w-[310px] sm:w-[350px] max-w-[calc(100vw-24px)] rounded-2xl border shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            isDark
              ? 'bg-[#07080b]/98 border-blue-900/60 shadow-blue-950/80 ring-1 ring-blue-500/20'
              : 'bg-white/98 border-slate-200/90 shadow-[0_20px_50px_rgba(0,82,255,0.14)] ring-1 ring-slate-900/5'
          }`}
        >
          {/* Top Brand Accent Gradient Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-[#229ed9]" />

          {/* Header */}
          <div
            className={`p-3.5 pb-2.5 flex items-center justify-between border-b ${
              isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-[#229ed9] text-white shadow-sm">
                <Bot className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    A-Pay Dev Assistant
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                    Base L2
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  @APayProtocolBot • Live on Telegram
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Minimize bot widget"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Category Navigation Tabs */}
          <div
            className={`flex items-center px-2 py-1.5 gap-1 border-b text-[11px] font-medium ${
              isDark ? 'border-slate-800/60 bg-slate-950/60' : 'border-slate-100 bg-white/60'
            }`}
          >
            {[
              { id: 'quick', label: 'QuickStart', icon: Terminal },
              { id: 'faucet', label: 'Faucet', icon: Droplets },
              { id: 'paywall', label: 'HTTP 402', icon: Zap },
              { id: 'mcp', label: 'AI MCP', icon: Cpu },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as BotTab)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  activeTab === id
                    ? isDark
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'bg-blue-600 text-white font-semibold shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Dynamic Tab Body */}
          <div className="p-3.5 text-xs">
            {activeTab === 'quick' && (
              <div className="space-y-2.5">
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Scaffold a fullstack A-Pay project or install EVM micropayment packages:
                </p>

                {/* Command 1: CLI */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 font-mono text-[10.5px] ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-sky-300'
                      : 'bg-slate-50 border-slate-200 text-blue-700'
                  }`}
                >
                  <span className="truncate">npx create-apay-app</span>
                  <button
                    type="button"
                    onClick={() => copyText('npx create-apay-app', 'cmd-cli')}
                    aria-label="Copy CLI command"
                    className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                      isDark
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {copiedId === 'cmd-cli' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Command 2: PyPI */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 font-mono text-[10.5px] ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-sky-300'
                      : 'bg-slate-50 border-slate-200 text-blue-700'
                  }`}
                >
                  <span className="truncate">pip install apay</span>
                  <button
                    type="button"
                    onClick={() => copyText('pip install apay', 'cmd-pypi')}
                    aria-label="Copy pip command"
                    className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                      isDark
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {copiedId === 'cmd-pypi' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'faucet' && (
              <div className="space-y-2.5">
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Get <strong>10 $APAY</strong> testnet tokens sent directly to your Base Sepolia
                  wallet every 24h:
                </p>

                <div
                  className={`p-2.5 rounded-xl border font-mono text-[10.5px] ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-sky-300'
                      : 'bg-slate-50 border-slate-200 text-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-500">Telegram Faucet</span>
                    <button
                      type="button"
                      onClick={() => copyText('/faucet 0xYOUR_WALLET', 'cmd-faucet')}
                      aria-label="Copy faucet command"
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        isDark
                          ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                          : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {copiedId === 'cmd-faucet' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="block mt-1 text-[10px] opacity-80 truncate">
                    /faucet 0xYourBaseSepoliaAddress
                  </span>
                </div>
                <div
                  className={`text-[10px] flex items-center gap-1.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Instant non-custodial transfer • Zero gas required</span>
                </div>
              </div>
            )}

            {activeTab === 'paywall' && (
              <div className="space-y-2.5">
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Protect APIs with native <strong>HTTP 402</strong> payment triggers:
                </p>

                <div
                  className={`p-2 rounded-xl border font-mono text-[10px] leading-normal ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-sky-300'
                      : 'bg-slate-50 border-slate-200 text-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-inherit/30">
                    <span className="text-[9px] uppercase tracking-wider font-sans font-semibold text-slate-400">
                      FastAPI / Python
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          '@app.get("/data", dependencies=[Depends(APayGate(price_cents=5))])',
                          'cmd-402',
                        )
                      }
                      aria-label="Copy HTTP 402 code"
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        isDark
                          ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                          : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {copiedId === 'cmd-402' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <code className="block break-all">
                    @app.get(&apos;/data&apos;, dependencies=[Depends(APayGate(price_cents=5))])
                  </code>
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="space-y-2.5">
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Install A-Pay MCP Server in Claude Desktop, Cursor, or LangChain:
                </p>

                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 font-mono text-[10px] ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 text-sky-300'
                      : 'bg-slate-50 border-slate-200 text-blue-700'
                  }`}
                >
                  <span className="truncate">npx -y smithery mcp add apayprotocol/apay</span>
                  <button
                    type="button"
                    onClick={() => copyText('npx -y smithery mcp add apayprotocol/apay', 'cmd-mcp')}
                    aria-label="Copy MCP install command"
                    className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                      isDark
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {copiedId === 'cmd-mcp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div
                  className={`text-[10px] flex items-center gap-1.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>5 Live Tools • Verified on Smithery &amp; Glama AI</span>
                </div>
              </div>
            )}

            {/* Launch Telegram Dev Bot CTA */}
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#229ed9] via-[#0088cc] to-blue-600 hover:from-[#1b8fc7] hover:to-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all cursor-pointer min-h-[42px]"
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>Launch @APayProtocolBot</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
            </a>

            {/* Micro Telemetry Footer */}
            <div
              className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[9.5px] font-mono ${
                isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'
              }`}
            >
              <span>Base Mainnet (8453)</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Latency &lt; 100ms
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Alien Mascot Interactive Button */}
      <div className="relative flex items-center justify-end">
        {/* Dynamic Notification Badge (Pulse when bubble is closed) */}
        {!isOpen && (
          <span className="absolute top-1 right-2 z-10 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 text-[8px] font-bold text-white items-center justify-center shadow-lg shadow-sky-500/50">
              1
            </span>
          </span>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label="A-Pay 3D Alien Bot — click to chat"
          onClick={() => {
            setIsOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen((v) => !v);
            }
          }}
          className="relative w-[124px] h-[124px] sm:w-[144px] sm:h-[144px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
        >
          {/* Subtle Dynamic Ambient Radial Glow (Day & Night Balanced) */}
          <div
            className={`absolute inset-0 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              isDark ? 'bg-blue-500/30 opacity-95' : 'bg-blue-500/25 opacity-90'
            } ${isHovered ? 'scale-125 opacity-100' : ''}`}
          />

          {/* Procedural 3D Alien Canvas */}
          <AlienBotCanvas isHovered={isHovered} isDark={isDark} />

          {/* High-Contrast Interactive Label Badge (Clear in Day & Night) */}
          <div
            className={`absolute -bottom-2 px-3.5 py-1 rounded-full border backdrop-blur-xl shadow-lg flex items-center gap-1.5 pointer-events-none text-[10px] font-mono font-bold transition-all ${
              isDark
                ? 'bg-slate-950/95 border-blue-500/50 text-sky-300 shadow-blue-950/60'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telegram Bot</span>
            <ChevronRight className="w-3 h-3 opacity-60 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
