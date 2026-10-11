'use client';

import {
  BookOpen,
  Bot,
  Coins,
  CreditCard,
  ExternalLink,
  Globe,
  Home,
  Key,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Newspaper,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import React from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  activeNetwork?: NetworkId;
  onNavigateToLanding?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  activeNetwork = 'base-sepolia',
  onNavigateToLanding,
}: SidebarProps) {
  const currentContracts = getNetworkContracts(activeNetwork);
  const currentChain = currentContracts.chain;
  const navSections = [
    {
      title: 'CORE PROTOCOL',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          description: 'Telemetry & Contracts',
          icon: LayoutDashboard,
        },
        {
          id: 'marketplace',
          label: 'API Marketplace',
          description: 'Live M2M Discovery & Test',
          icon: Globe,
        },
        {
          id: 'playground',
          label: 'Agent Playground',
          description: 'Autonomous Chatbot & M2M',
          icon: Bot,
        },
        {
          id: 'mcphub',
          label: 'MCP & Cursor Hub',
          description: 'Claude & Cursor Tools',
          icon: Zap,
        },
        {
          id: 'paywalls',
          label: '1-Click Paywalls',
          description: 'Payment Links & Embeds',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'DEVELOPER & INFRA',
      items: [
        {
          id: 'docs',
          label: 'Docs & API Reference',
          description: 'Protocol Spec & SDKs',
          icon: BookOpen,
        },
        {
          id: 'apikeys',
          label: 'API Keys & Webhooks',
          description: 'EIP-712 M2M Gateway',
          icon: Key,
        },
        {
          id: 'vaults',
          label: 'Agent Vaults',
          description: 'Session Escrows & Locks',
          icon: Lock,
        },
        {
          id: 'staking',
          label: 'Tokenomics & Staking',
          description: 'Slashing & 500 APAY Bond',
          icon: Coins,
        },
      ],
    },
    {
      title: 'COMMUNITY & ECOSYSTEM',
      items: [
        {
          id: 'community',
          label: 'Community Support',
          description: 'Dev Q&A, Issues & Solutions',
          icon: MessageSquare,
        },
        {
          id: 'aiguidelines',
          label: 'AI Guidelines for LLMs',
          description: '3 Pillars Context & Prompts',
          icon: Sparkles,
        },
      ],
    },
    {
      title: 'RESEARCH & EDITORIAL',
      items: [
        {
          id: 'blog',
          label: 'Research & Blog',
          description: 'HTTP 402 & M2M Guides',
          icon: Newspaper,
        },
      ],
    },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border-r border-slate-800/80 backdrop-blur-2xl transition-colors duration-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            if (onNavigateToLanding) {
              onNavigateToLanding();
              setIsMobileOpen(false);
            } else {
              handleSelectTab('overview');
            }
          }}
          title="Return to Public Homepage"
        >
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-[1.5px] shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
              <Zap className="w-5 h-5 text-sky-400 fill-sky-400/20 animate-pulse" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-spatial text-xl font-black tracking-tight text-white">
                A-PAY
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-sky-300 border border-blue-400/30">
                M2M
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">
              Base L2 Settlement
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Public Homepage Link */}
      {onNavigateToLanding && (
        <div className="px-3 pt-3 pb-0">
          <button
            type="button"
            onClick={() => {
              onNavigateToLanding();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-sky-400 text-xs font-semibold transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Public Homepage</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-sky-300 border border-blue-400/30">
              3 Pillars
            </span>
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600/15 text-white border border-blue-500/30 shadow-sm shadow-blue-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    {/* Active Left Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                    )}
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-500/20 text-sky-400'
                          : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Live Base L2 Telemetry Card (Bottom) */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-200">{currentChain.chainName}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 font-bold">
              Chain {currentChain.chainId}
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>RPC Latency</span>
              <span className="text-emerald-400 font-bold">&lt; 85ms (Active)</span>
            </div>
            <div className="flex justify-between">
              <span>Contracts Rail</span>
              <span className="text-sky-300 font-bold">
                {currentChain.isTestnet ? '5/5 Live Sepolia' : '5/5 Live Mainnet'}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
            <a
              href={`${currentChain.explorerUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>BaseScan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="mailto:neural.ais.official@gmail.com"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
              title="Official Contact: neural.ais.official@gmail.com"
            >
              <span>Contact</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="https://github.com/neuralaisofficial-lang/a_pay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
