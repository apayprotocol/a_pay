'use client';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  CreditCard,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Lock,
  Radio,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Terminal,
  Wallet,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { NetworkId } from '@/config/contracts';
import { BlogIssue1Paywalls } from './blog/BlogIssue1Paywalls';
import { BlogIssue2AgentVaults } from './blog/BlogIssue2AgentVaults';
import { BlogIssue3CheckoutGateway } from './blog/BlogIssue3CheckoutGateway';

export type BlogIssueId = 'paywalls' | 'vaults' | 'checkout';

interface BlogTabProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
  initialIssue?: BlogIssueId;
}

export function BlogTab({
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
  initialIssue = 'checkout',
}: BlogTabProps) {
  const [activeIssue, setActiveIssue] = useState<BlogIssueId>(initialIssue);

  // Sync with URL params/hash if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryIssue = params.get('issue');
      const hash = window.location.hash.replace('#', '');

      if (queryIssue === 'paywalls' || hash === 'issue-1' || hash === 'paywalls') {
        setActiveIssue('paywalls');
      } else if (queryIssue === 'vaults' || hash === 'issue-2' || hash === 'vaults') {
        setActiveIssue('vaults');
      } else if (queryIssue === 'checkout' || hash === 'issue-3' || hash === 'checkout') {
        setActiveIssue('checkout');
      }
    }
  }, []);

  const handleSelectIssue = (issueId: BlogIssueId) => {
    setActiveIssue(issueId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('issue', issueId);
      window.history.replaceState({}, '', url.toString());

      // Smooth scroll back to top of article container
      const container = document.getElementById('blog-top-anchor');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div id="blog-top-anchor" className="h-0 w-0 -mt-20" />

      {/* Upgraded Modern Editorial Navigation Header */}
      <section className="w-full mb-8 sm:mb-10">
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-2xl dark:shadow-blue-500/5 p-4 sm:p-6 transition-all duration-300">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 right-1/4 w-80 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Series Title & Meta Pill */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                    A-PAY ENGINEERING JOURNAL
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />3
                    PRODUCTION RAILS
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
                  Autonomous Economics & Human Web3 Commerce Papers
                </h1>
              </div>
            </div>

            {/* Quick Live Demo Link Pill */}
            <a
              href="/checkout-demo"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 self-start sm:self-auto shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] font-medium">
                Try Live:{' '}
                <strong className="text-emerald-800 dark:text-emerald-200 font-semibold underline">
                  Interactive Checkout Demo Store ➔
                </strong>
              </span>
            </a>
          </div>

          {/* Bottom Row: 3 Responsive Bento Cards (1 Col on Mobile, 3 Cols on Desktop) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            {/* Issue #01 Card (Sellers: 1-Click Paywalls [M2M]) */}
            <button
              type="button"
              onClick={() => handleSelectIssue('paywalls')}
              className={`group relative text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                activeIssue === 'paywalls'
                  ? 'bg-gradient-to-br from-blue-50/90 via-white to-sky-50/50 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900/90 border-blue-500 dark:border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                  : 'bg-slate-50/70 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      activeIssue === 'paywalls'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20'
                    }`}
                  >
                    Issue #01 • M2M Sellers
                  </span>
                  {activeIssue === 'paywalls' ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      READING
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 14m
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-sky-400 flex-shrink-0" />
                  <span>1-Click Paywalls (HTTP 402)</span>
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                  Monetize AI scrapers & eliminate server wakeup costs while real humans browse 100%
                  free.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  HTTP 402
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Cloudflare
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Free for Humans
                </span>
              </div>
            </button>

            {/* Issue #02 Card (Buyers: Agent Vaults & Session Escrows [M2M]) */}
            <button
              type="button"
              onClick={() => handleSelectIssue('vaults')}
              className={`group relative text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                activeIssue === 'vaults'
                  ? 'bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900/90 border-indigo-500 dark:border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50/70 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      activeIssue === 'vaults'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    Issue #02 • M2M Buyers
                  </span>
                  {activeIssue === 'vaults' ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      READING
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 16m
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>Agent Vaults & Escrows</span>
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                  &ldquo;Cooked at the Gate&rdquo; zero-leak security, Gemini ↔ Claude swarms, and
                  Base L2 escrows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  EscrowVault.sol
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  EIP-712 Session
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  Zero Data Leak
                </span>
              </div>
            </button>

            {/* Issue #03 Card (Human Commerce: A-Pay Checkout Gateway [H2M / H2B]) */}
            <button
              type="button"
              onClick={() => handleSelectIssue('checkout')}
              className={`group relative text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                activeIssue === 'checkout'
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900/90 border-emerald-500 dark:border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50/70 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        activeIssue === 'checkout'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      Issue #03 • Human H2M
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Flame className="w-2.5 h-2.5 text-emerald-500" />
                      NEW
                    </span>
                  </div>
                  {activeIssue === 'checkout' ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      READING
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 16m
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>A-Pay Checkout Gateway</span>
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                  The Stripe of Web3 for physical e-commerce & digital SaaS. 2-second settlements &
                  0% chargebacks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Shopify & React
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  &lt; 2s Base L2
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  0% Chargebacks
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Render Active Issue */}
      <div className="w-full">
        {activeIssue === 'paywalls' && (
          <BlogIssue1Paywalls
            activeNetwork={activeNetwork}
            onNavigateToTab={onNavigateToTab}
            onSwitchIssue={handleSelectIssue}
          />
        )}

        {activeIssue === 'vaults' && (
          <BlogIssue2AgentVaults
            activeNetwork={activeNetwork}
            onNavigateToTab={onNavigateToTab}
            onSwitchIssue={handleSelectIssue}
          />
        )}

        {activeIssue === 'checkout' && (
          <BlogIssue3CheckoutGateway
            activeNetwork={activeNetwork}
            onNavigateToTab={onNavigateToTab}
            onSwitchIssue={handleSelectIssue}
          />
        )}
      </div>

      {/* Cross-Issue Bottom Switcher */}
      <section className="w-full mt-12 sm:mt-16 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              Explore All 3 Pillars of A-Pay
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
              {activeIssue === 'checkout' &&
                'Looking for autonomous machine-to-machine micropayments?'}
              {activeIssue === 'paywalls' &&
                'Looking for human e-commerce & SaaS checkout gateway?'}
              {activeIssue === 'vaults' && 'Looking to monetize scrapers or accept human payments?'}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              {activeIssue === 'checkout' &&
                'Read Issue #01 (1-Click Paywalls) or Issue #02 (Agent Vaults) to see how AI swarms transact autonomously.'}
              {activeIssue === 'paywalls' &&
                'Read Issue #03 (A-Pay Checkout) to learn how human customers buy physical products and SaaS subscriptions in 2 seconds.'}
              {activeIssue === 'vaults' &&
                'Read Issue #03 (A-Pay Checkout) to add 1-click Web3 payments to your e-commerce or digital SaaS store.'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeIssue !== 'checkout' && (
              <button
                type="button"
                onClick={() => handleSelectIssue('checkout')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all"
              >
                <span>Read Issue #03: Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {activeIssue !== 'paywalls' && (
              <button
                type="button"
                onClick={() => handleSelectIssue('paywalls')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Read Issue #01: Paywalls</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {activeIssue !== 'vaults' && (
              <button
                type="button"
                onClick={() => handleSelectIssue('vaults')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Read Issue #02: Vaults</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Global Legal & Trademark Nominative Fair Use Statement */}
      <footer className="w-full mt-8 p-5 sm:p-6 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          <Shield className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>Protocol Legal Disclaimer & Trademark Notice</span>
        </div>
        <p>
          All trademarks, registered trademarks, service marks, product names, logos, and company
          identifiers mentioned across A-Pay research papers, technical guides, benchmarks, and
          documentation (including but not limited to Stripe®, PayPal®, Visa®, Mastercard®,
          Shopify®, WooCommerce®, Gumroad®, Google®, Gemini®, Anthropic®, Claude®, OpenAI®,
          ChatGPT®, DeepSeek®, ByteDance®, Apple®, and Microsoft®) are the intellectual property of
          their respective owners.
        </p>
        <p>
          Their inclusion in these research publications is strictly for factual comparative
          analysis, architectural benchmarking, educational commentary, and technical
          interoperability under established nominative fair use principles. A-Pay is an independent
          open-source protocol and is not affiliated with, sponsored by, or endorsed by any of the
          aforementioned entities.
        </p>
      </footer>
    </div>
  );
}
