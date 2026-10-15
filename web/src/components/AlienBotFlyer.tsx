'use client';

import { Bot, ExternalLink, MessageSquareCode, Sparkles, X } from 'lucide-react';
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

export function AlienBotFlyer() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-950/95 text-white border border-blue-500/50 shadow-2xl backdrop-blur-xl hover:border-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer min-h-[44px]"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
          </span>
          <Bot className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">A-Pay Bot</span>
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
      {/* Speech Bubble / Tooltip Dialog */}
      {isOpen && (
        <div
          className={`mb-3 w-72 sm:w-80 rounded-2xl border shadow-2xl backdrop-blur-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            isDark
              ? 'bg-slate-950/95 border-blue-900/60 shadow-blue-950/70'
              : 'bg-white/98 border-slate-300/80 shadow-2xl shadow-slate-900/15'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between pb-2.5 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-blue-600 dark:text-sky-400">
                A-Pay Protocol Bot
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close bot widget"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-3">
            <p
              className={`text-xs font-medium leading-relaxed ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Hey dev! 1-click SDK setup, HTTP 402 code snippets &amp; Base L2 testnet
              tokens&nbsp;—&nbsp;right here.
            </p>

            {/* Quick pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['npx create-apay-app', 'pip install apay', '/mcp Smithery'].map((cmd) => (
                <span
                  key={cmd}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                    isDark
                      ? 'bg-blue-950/50 border-blue-800/50 text-sky-300'
                      : 'bg-blue-50/80 border-blue-200 text-blue-700'
                  }`}
                >
                  <Sparkles className="w-2 h-2 shrink-0" />
                  {cmd}
                </span>
              ))}
            </div>

            {/* CTA */}
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#229ed9] to-blue-600 hover:from-[#1a8fc5] hover:to-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
            >
              <MessageSquareCode className="w-4 h-4" />
              Launch Telegram Dev Bot
              <ExternalLink className="w-3 h-3 opacity-75" />
            </a>
          </div>
        </div>
      )}

      {/* 3D Alien Mascot Interactive Button */}
      <div className="relative flex items-center justify-end">
        {/* Notification dot — visible only when bubble is closed */}
        {!isOpen && (
          <span className="absolute 1 top-0 right-1 z-10 flex h-4 w-4">
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
            if (!isOpen) {
              setIsOpen(true);
            } else {
              window.open(BOT_URL, '_blank', 'noopener,noreferrer');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen((v) => !v);
            }
          }}
          className="relative w-[116px] h-[116px] sm:w-[136px] sm:h-[136px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
        >
          {/* Subtle Dynamic Ambient Radial Glow */}
          <div
            className={`absolute inset-0 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              isDark ? 'bg-blue-500/20 opacity-90' : 'bg-blue-600/15 opacity-80'
            } ${isHovered ? 'scale-125 opacity-100' : ''}`}
          />

          {/* Procedural 3D Alien Canvas */}
          <AlienBotCanvas isHovered={isHovered} isDark={isDark} />

          {/* High-Contrast Label Badge */}
          <div
            className={`absolute -bottom-1 px-3 py-0.5 rounded-full border backdrop-blur-xl shadow-lg flex items-center gap-1.5 pointer-events-none text-[10px] font-mono font-bold transition-colors ${
              isDark
                ? 'bg-slate-950/95 border-blue-500/50 text-sky-300 shadow-blue-950/50'
                : 'bg-slate-900/95 border-blue-400/60 text-white shadow-slate-900/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span>Telegram Bot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
