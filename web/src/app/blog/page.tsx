'use client';

import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';
import { BlogTab } from '@/components/modules/BlogTab';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { NetworkId } from '@/config/contracts';

export default function BlogPage() {
  const [activeNetwork, setActiveNetwork] = useState<NetworkId>('base-sepolia');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apay_active_network') as NetworkId | null;
      if (saved === 'base-sepolia' || saved === 'base-mainnet') {
        setActiveNetwork(saved);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Protocol</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <ApayBrandLogo size="sm" />
              <span className="font-spatial font-bold text-slate-900 dark:text-white text-xs sm:text-base">
                A-PAY RESEARCH
              </span>
              <span className="hidden xs:inline text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-sky-400 font-mono font-medium border border-blue-500/20">
                Editorial Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/#paywalls"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1-Click Paywall</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <BlogTab
          activeNetwork={activeNetwork}
          onNavigateToTab={(tabId) => {
            if (typeof window !== 'undefined') {
              window.location.href = `/?tab=${tabId}`;
            }
          }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-spatial font-bold text-slate-900 dark:text-white">
              A-PAY PROTOCOL
            </span>
            <span>• The Universal M2M & H2M Micropayment Rail</span>
          </div>
          <div className="font-mono text-[11px]">
            Base L2 • RFC-2068 HTTP 402 • EIP-712 Session Permits
          </div>
        </div>
      </footer>
    </div>
  );
}
