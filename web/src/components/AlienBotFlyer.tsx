'use client';

import { Bot, ExternalLink, MessageSquareCode, Sparkles, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useEffect, useState } from 'react';

// Dynamic import of procedural 3D canvas with ssr: false (Zero impact on SSR / initial hydration)
const AlienBotCanvas = dynamic(
  () => import('./3d/AlienBotCanvas').then((mod) => mod.AlienBotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/40 border-t-blue-500 animate-spin" />
      </div>
    ),
  },
);

export function AlienBotFlyer() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Deferred initialization via requestIdleCallback to keep initial LCP 100% clean
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously closed the flyout in this browsing session
    const dismissedSession = sessionStorage.getItem('apay_alien_flyer_dismissed');
    if (dismissedSession === 'true') {
      setIsDismissed(true);
    }

    const startMount = () => setIsMounted(true);

    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(startMount, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(startMount, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('apay_alien_flyer_dismissed', 'true');
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    setIsOpen(true);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('apay_alien_flyer_dismissed');
    }
  };

  const botTelegramUrl = 'https://t.me/APayProtocolBot';

  if (!isMounted) return null;

  // Minimized Floating Orb (When dismissed by user)
  if (isDismissed) {
    return (
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={handleRestore}
          aria-label="Open A-Pay Dev Bot"
          className="relative group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-slate-900/90 dark:bg-slate-950/90 text-white border border-blue-500/40 shadow-xl backdrop-blur-md hover:border-blue-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px]"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-white">
            <Bot className="w-4 h-4 text-sky-400" />
            <span>A-Pay Dev Bot</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end select-none pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Speech Bubble / Tooltip Dialog */}
      {isOpen && (
        <div className="mb-2 w-72 sm:w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-blue-200 dark:border-blue-900/60 shadow-2xl backdrop-blur-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-blue-600 dark:text-sky-400">
                A-Pay Protocol Bot
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss Bot Widget"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-2.5">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              Hey dev! Need 1-click SDK installation, HTTP 402 code snippets, or Base L2 faucet
              tokens?
            </p>

            {/* Quick Pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-[10px] font-mono text-blue-700 dark:text-sky-300">
                <Sparkles className="w-2.5 h-2.5" /> npx create-apay-app
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-[10px] font-mono text-blue-700 dark:text-sky-300">
                pip install apay
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                /mcp Smithery
              </span>
            </div>

            {/* Action CTA Button */}
            <a
              href={botTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold text-xs shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>Launch Telegram Dev Bot</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      )}

      {/* Floating 3D Alien Mascot Interactive Button */}
      <div className="relative flex items-center justify-end">
        {/* Unread Indicator Pulse Dot */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 z-10 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 text-[9px] font-bold text-white items-center justify-center">
              1
            </span>
          </span>
        )}

        {/* 3D Alien Character Container */}
        <div
          role="button"
          tabIndex={0}
          aria-label="A-Pay 3D Alien Bot Flyer"
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
            } else {
              window.open(botTelegramUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              window.open(botTelegramUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center cursor-pointer group transition-transform duration-200 active:scale-95"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/15 dark:bg-sky-500/20 blur-xl group-hover:bg-blue-500/30 transition-all pointer-events-none" />

          {/* Procedural 3D Alien Canvas */}
          <AlienBotCanvas isHovered={isHovered} />

          {/* Telegram Micro Badge Pill (floating on bottom) */}
          <div className="absolute -bottom-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 dark:bg-slate-950/90 border border-blue-400/50 shadow-md backdrop-blur-md flex items-center gap-1 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-sky-300">Telegram Bot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
