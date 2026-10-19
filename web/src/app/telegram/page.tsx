'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Radio,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';

export default function TelegramGatewayPage() {
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedHandle(label);
      setTimeout(() => setCopiedHandle(null), 2500);
    }
  };

  // Attempt auto-launching Telegram app via native protocol scheme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const target = urlParams.get('target');
      if (target === 'channel') {
        window.location.href = 'tg://resolve?domain=apay_protocol';
      } else if (target === 'bot' || !target) {
        // Attempt native protocol scheme
        window.location.href = 'tg://resolve?domain=APay_Protocol_Bot';
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-500 flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          <Link
            href="/tma"
            className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-500/20 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Launch Web Mini App</span>
          </Link>
        </div>
      </header>

      {/* Main Bridge Container */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8 flex-1 w-full">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-mono font-bold uppercase">
            <Send className="w-3.5 h-3.5" />
            <span>Official Telegram Gateway</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-spatial font-black text-slate-950 dark:text-white tracking-tight">
            Connect on Telegram
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Direct access to the official A-Pay AI Assistant Bot and Protocol Announcement Channel.
          </p>
        </div>

        {/* 2 Primary Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Official Bot */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/30 dark:border-blue-500/30 soft-shadow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider block">
                  Official Assistant
                </span>
                <h2 className="font-spatial font-bold text-lg text-slate-900 dark:text-white">
                  A-Pay Protocol Bot
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Base Sepolia testnet faucet, AI web crawler auditor, and interactive Mini App launcher.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">@APay_Protocol_Bot</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('@APay_Protocol_Bot', 'bot')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-colors"
                  title="Copy Handle"
                >
                  {copiedHandle === 'bot' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="tg://resolve?domain=APay_Protocol_Bot"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Open Bot in Telegram App</span>
              </a>

              <a
                href="https://t.me/APay_Protocol_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Web Browser Link (t.me)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Card 2: Official Channel */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 soft-shadow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                  Broadcast Rail
                </span>
                <h2 className="font-spatial font-bold text-lg text-slate-900 dark:text-white">
                  Announcements Channel
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Real-time protocol releases, Base L2 smart contract updates, and developer announcements.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">@apay_protocol</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('@apay_protocol', 'channel')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-colors"
                  title="Copy Handle"
                >
                  {copiedHandle === 'channel' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="tg://resolve?domain=apay_protocol"
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                <span>Join Channel in Telegram App</span>
              </a>

              <a
                href="https://t.me/apay_protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Web Browser Link (t.me)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* ISP Bypass Guide for Indian / Restricted Networks */}
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-mono font-bold text-xs uppercase">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Notice for Users with ISP / t.me Loading Issues</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            In certain regions (including some Indian telecom operators like Jio, Airtel, and Vi), web browsers may fail to load <code className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono">t.me</code> domains due to telecom DNS filtering.
          </p>
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 text-xs space-y-2">
            <div className="font-bold text-slate-900 dark:text-white">
              💡 Zero-Link Solution (Search directly in Telegram App):
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 font-sans">
              <li>Open your native <strong>Telegram Mobile or Desktop App</strong>.</li>
              <li>Tap the search bar (magnifying glass 🔍 at the top).</li>
              <li>
                Type <strong className="font-mono text-blue-600 dark:text-sky-400">@APay_Protocol_Bot</strong> to chat with the assistant bot.
              </li>
              <li>
                Type <strong className="font-mono text-sky-600 dark:text-sky-400">@apay_protocol</strong> to join the announcements channel.
              </li>
            </ol>
          </div>
        </div>

        {/* Web Mini App Fallback */}
        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="font-bold text-slate-900 dark:text-white">Prefer using the browser?</div>
            <div className="text-slate-500">Test all bot features directly on our Web Mini App.</div>
          </div>
          <Link
            href="/tma"
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Open Web Mini App ➔
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <p>A-Pay Protocol • Canonical Gateway • https://apayprotocol.org</p>
      </footer>
    </div>
  );
}
