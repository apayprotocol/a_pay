'use client';

import {
  BookOpen,
  Bot,
  ChevronRight,
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
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  activeNetwork?: NetworkId;
  onNavigateToLanding?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  activeNetwork = 'base-sepolia',
  onNavigateToLanding,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const currentContracts = getNetworkContracts(activeNetwork);
  const currentChain = currentContracts.chain;

  const navSections: NavSection[] = [
    {
      title: 'CORE PROTOCOL',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          description: 'Telemetry & Contracts',
          icon: LayoutDashboard,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        },
        {
          id: 'marketplace',
          label: 'API Marketplace',
          description: 'Live M2M Discovery & Test',
          icon: Globe,
          badge: 'M2M',
          badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        },
        {
          id: 'playground',
          label: 'Agent Playground',
          description: 'Autonomous Chatbot & M2M',
          icon: Bot,
          badge: 'AI',
          badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        },
        {
          id: 'mcphub',
          label: 'MCP & Cursor Hub',
          description: 'Claude & Cursor Tools',
          icon: Zap,
          badge: '5 Tools',
          badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        },
        {
          id: 'paywalls',
          label: '1-Click Paywalls',
          description: 'Payment Links & Embeds',
          icon: CreditCard,
          badge: 'HTTP 402',
          badgeColor: 'bg-blue-500/15 text-sky-300 border-blue-500/30',
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
          badge: 'v0.1.9',
          badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
        },
        {
          id: 'apikeys',
          label: 'API Keys & Webhooks',
          description: 'EIP-712 M2M Gateway',
          icon: Key,
          badge: 'EIP-712',
          badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        },
        {
          id: 'vaults',
          label: 'Agent Vaults',
          description: 'Session Escrows & Locks',
          icon: Lock,
          badge: 'Escrows',
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        },
        {
          id: 'staking',
          label: 'Tokenomics & Staking',
          description: 'Slashing & 500 APAY Bond',
          icon: Coins,
          badge: '100M',
          badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
          badge: 'Forum',
          badgeColor: 'bg-blue-500/15 text-sky-400 border-blue-500/30',
        },
        {
          id: 'aiguidelines',
          label: 'AI Guidelines for LLMs',
          description: '3 Pillars Context & Prompts',
          icon: Sparkles,
          badge: 'llms.txt',
          badgeColor: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
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
          badge: 'New',
          badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        },
      ],
    },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navSections;

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.badge?.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery, navSections]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#07080b]/98 text-slate-100 border-r border-slate-800/80 backdrop-blur-2xl transition-colors duration-300 select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
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
          <ApayBrandLogo size="md" withText subtitle="Base L2 Settlement" />
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Search & Public Homepage Link Bar */}
      <div className="px-3 pt-3 pb-1 space-y-2 shrink-0">
        {onNavigateToLanding && (
          <button
            type="button"
            onClick={() => {
              onNavigateToLanding();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-sky-400 text-xs font-semibold transition-all group cursor-pointer shadow-xs active:scale-[0.98] min-h-[40px]"
          >
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="font-sans font-medium">Public Homepage</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-sky-300 border border-blue-400/30">
              3 Pillars
            </span>
          </button>
        )}

        {/* Modern Quick-Filter Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick jump / filter tabs..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-0.5 text-slate-500 hover:text-white rounded cursor-pointer"
              aria-label="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sections (Dynamic Accordion: ONLY Active Node Expands Subheading) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {/* Section Heading with Counter Badge */}
            <div className="px-2.5 py-1 text-[9.5px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>{section.title}</span>
              <span className="text-[8.5px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 font-mono">
                {section.items.length}
              </span>
            </div>

            {/* Section Navigation Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full group relative flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer min-h-[42px] ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent border border-blue-500/40 text-white shadow-sm shadow-blue-950/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 border border-transparent hover:translate-x-0.5'
                    }`}
                  >
                    {/* Active Left Indicator Bar (Radiant Base Cobalt Blue Glow) */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-blue-500 via-sky-400 to-blue-600 shadow-[0_0_10px_rgba(0,82,255,0.85)]" />
                    )}

                    {/* Left Icon Badge */}
                    <div
                      className={`p-1.5 rounded-lg transition-colors shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'bg-slate-900 border border-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Heading + Dynamic Collapsible Subheading */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-xs font-semibold tracking-tight truncate ${
                            isActive
                              ? 'text-white font-bold'
                              : 'text-slate-300 group-hover:text-white'
                          }`}
                        >
                          {item.label}
                        </span>

                        {/* Optional Mini Status Tag Pill */}
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border shrink-0 transition-opacity ${
                              isActive
                                ? item.badgeColor ||
                                  'bg-blue-500/20 text-sky-300 border-blue-400/40'
                                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-80 group-hover:opacity-100'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* ⚡ ADVANCED ACCORDION: Subheading ONLY renders when active */}
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isActive
                            ? 'grid-rows-[1fr] opacity-100 mt-0.5 max-h-12'
                            : 'grid-rows-[0fr] opacity-0 max-h-0 mt-0 pointer-events-none'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="text-[10px] text-sky-400/90 font-mono tracking-tight flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse shrink-0" />
                            <span className="truncate">{item.description}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subtle Right Chevron on Active */}
                    {isActive && (
                      <ChevronRight className="w-3 h-3 text-sky-400 shrink-0 self-center opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No tabs matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Live Base L2 Telemetry Card (Bottom) */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0">
        <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-200">{currentChain.chainName}</span>
            </div>
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 font-bold">
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

          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9.5px] font-mono">
            <a
              href={`${currentChain.explorerUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors"
            >
              <span>BaseScan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="mailto:contact@apayprotocol.org"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors"
              title="Official Contact: contact@apayprotocol.org"
            >
              <span>Contact</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="https://github.com/apayprotocol/a_pay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors"
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
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer (Responsive for all mobile screens) */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
