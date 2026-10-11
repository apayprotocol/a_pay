'use client';

import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Coins,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import { fetchMarketplaceServices, type MarketplaceService } from '@/services/blockchain';

export function MarketplaceTab({
  walletAddress,
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
}: {
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tab: string) => void;
}) {
  const contracts = getNetworkContracts(activeNetwork);
  const chainConfig = contracts.chain;

  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [bondedOnly, setBondedOnly] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'base' | 'base-sepolia'>('all');

  // Test Call state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [unlockedPayloads, setUnlockedPayloads] = useState<Record<string, any>>({});

  // Code Snippet Modal state
  const [activeCodeService, setActiveCodeService] = useState<MarketplaceService | null>(null);
  const [codeLang, setCodeLang] = useState<'python' | 'ts' | 'langchain' | 'curl'>('python');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const loadServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMarketplaceServices({
        network: networkFilter === 'all' ? undefined : (networkFilter as NetworkId),
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
        bonded: bondedOnly ? true : undefined,
      });
      setServices(res.services);
    } catch (err) {
      console.error('Failed to load marketplace services:', err);
    } finally {
      setLoading(false);
    }
  }, [networkFilter, selectedCategory, searchQuery, bondedOnly]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleCopy = (text: string, isCode = false, id?: string) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else if (id) {
      setCopiedUrl(id);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleTestCall = async (service: MarketplaceService) => {
    setTestingId(service.id);
    try {
      // Simulate real-time 402 interception and settlement
      await new Promise((resolve) => setTimeout(resolve, 350));
      setUnlockedPayloads((prev) => ({
        ...prev,
        [service.id]: service.samplePayload || {
          status: 'verified_claim',
          latency_ms: service.latencyMs,
          payload: 'Data unlocked successfully via APay EIP-712 Voucher.',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const categories = useMemo(
    () => [
      { id: 'ALL', label: 'All Services', icon: Compass },
      { id: 'AI_INFERENCE', label: 'AI Inference & LLMs', icon: Bot },
      { id: 'FINANCE', label: 'Financial Alpha', icon: Coins },
      { id: 'SCRAPING', label: 'Web Scraping', icon: Globe },
      { id: 'CRYPTO', label: 'Crypto & DEX', icon: Flame },
      { id: 'DEVTOOLS', label: 'Dev Tools & Security', icon: Code2 },
      { id: 'DATA_FEEDS', label: 'Data Feeds & IoT', icon: Layers },
    ],
    [],
  );

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'AI_INFERENCE':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'FINANCE':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'SCRAPING':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'CRYPTO':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'DEVTOOLS':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getCodeSnippet = (service: MarketplaceService, lang: string) => {
    switch (lang) {
      case 'python':
        return `from apay import AgentWallet, request

# Initialize ephemeral autonomous agent wallet
wallet = AgentWallet.create()

# Autonomous HTTP 402 request: signs voucher & decrements allowance
response = request(
    url="${service.targetDomain}",
    wallet=wallet,
    max_price="${service.price}",
    network="${service.network}"
)

print(response.json())`;
      case 'ts':
        return `import { APayClient } from '@apay/gateway-ts';

const client = new APayClient({
  network: '${service.network}'
});

// Automatically signs EIP-712 payment voucher upon HTTP 402 challenge
const res = await client.fetch('${service.targetDomain}');
const data = await res.json();
console.log(data);`;
      case 'langchain':
        return `from apay.agentic import APayTool
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI

# Drop-in autonomous LangChain Tool with EIP-712 micropayment budget
paywall_tool = APayTool.from_url(
    url="${service.targetDomain}",
    name="${service.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}",
    budget_usdc=0.50
)

llm = ChatOpenAI(model="gpt-4o")
agent = initialize_agent([paywall_tool], llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)
agent.run("Fetch data from ${service.name}")`;
      case 'curl':
        return `# 1. Request endpoint (receives HTTP 402 with EIP-712 challenge)
curl -i "${service.targetDomain}"

# 2. Attach EIP-712 cryptographic authorization voucher
curl -H "Authorization: APay eip712:<signature>:<payer_address>:<nonce>:<amount>" \\
     "${service.targetDomain}"`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-spatial text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Globe className="w-8 h-8 text-blue-600 dark:text-sky-400" />
            Global M2M AI Marketplace &amp; API Explorer
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Discover, verify, and test live HTTP 402 paywalled endpoints across the decentralized AI
            agent mesh. Every service is protected by on-chain bonding and sub-25ms cryptographic
            settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('paywalls')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish API Paywall</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadServices}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Category Filtering Bar */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by API title, endpoint URL, tag (e.g. BTC, reasoning, DOM, whale)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Network Selector */}
            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Networks</option>
              <option value="base">Base Mainnet (8453)</option>
              <option value="base-sepolia">Base Sepolia (84532)</option>
            </select>

            {/* Bonded Only Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bondedOnly}
                onChange={(e) => setBondedOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bonded Providers Only (&ge; 500 $APAY)</span>
            </label>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span>Synchronizing M2M Protocol Directory...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white">
            No Matching M2M APIs Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query, selecting another category, or unchecking the
            bonded-only filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setBondedOnly(false);
              setNetworkFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-mono font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((item) => {
            const isUnlocked = Boolean(unlockedPayloads[item.id]);
            const isTesting = testingId === item.id;

            return (
              <div
                key={item.id}
                className="glass-panel rounded-3xl p-6 soft-shadow border border-slate-200/90 dark:border-slate-800/90 flex flex-col justify-between space-y-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Category & Network */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(
                        item.category,
                      )}`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold">
                      {item.network}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-spatial text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Endpoint URL Pill */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    <span className="truncate pr-2">{item.targetDomain}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.targetDomain, false, item.id)}
                      className="p-1 hover:text-blue-500 transition-colors cursor-pointer"
                      title="Copy Endpoint"
                    >
                      {copiedUrl === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200/50 dark:border-slate-800/50 text-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Price
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">
                        {item.price}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Latency
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        ~{item.latencyMs}ms
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        Uptime
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.uptimePct}%
                      </span>
                    </div>
                  </div>

                  {/* Staking & Bonded Verification Badge */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Collateral Status:</span>
                    {item.bonded ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Bonded</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unbonded</span>
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Live Unlocked Response Payload Viewer */}
                  {isUnlocked && (
                    <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>HTTP 200 Settled Payload</span>
                        </span>
                        <span>Signature Verified</span>
                      </div>
                      <pre className="overflow-x-auto max-h-32 p-1">
                        {JSON.stringify(unlockedPayloads[item.id], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestCall(item)}
                    disabled={isTesting}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Paying & Unlocking...' : '1-Click Test Call'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCodeService(item);
                      setCopiedCode(false);
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="View Code Snippet"
                  >
                    <Terminal className="w-4 h-4" />
                  </button>

                  {onNavigateToTab && (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('playground')}
                        className="p-2 rounded-xl border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-sky-400 transition-colors cursor-pointer"
                        title="Ask Agent in Playground"
                      >
                        <Bot className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigateToTab('staking')}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Challenge / Dispute Provider SLA"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Code Snippet Modal Drawer */}
      {activeCodeService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  Integration Snippet: {activeCodeService.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Endpoint: {activeCodeService.targetDomain} ({activeCodeService.price})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveCodeService(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setCodeLang('python')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  codeLang === 'python'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Python (apay SDK)
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('ts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  codeLang === 'ts'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                TypeScript / Node.js
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('langchain')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  codeLang === 'langchain'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                LangChain APayTool
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('curl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  codeLang === 'curl'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                cURL Raw 402
              </button>
            </div>

            {/* Code Block */}
            <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-xs text-sky-300 overflow-x-auto border border-slate-800">
              <button
                type="button"
                onClick={() => handleCopy(getCodeSnippet(activeCodeService, codeLang), true)}
                className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
              <pre className="pr-16 leading-relaxed">
                {getCodeSnippet(activeCodeService, codeLang)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveCodeService(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
