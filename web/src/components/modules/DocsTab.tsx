'use client';

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Code,
  Coins,
  Copy,
  Cpu,
  ExternalLink,
  FileCode,
  Flame,
  Globe,
  Layers,
  Lock,
  Play,
  Search,
  Server,
  Shield,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface DocsTabProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
}

/**
 * Tokenize a single code line into colorized syntax spans
 */
function tokenizeLine(line: string, _language: string): React.ReactNode {
  if (!line) return <span>&nbsp;</span>;

  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|#(?:.*)$|\/\/(?:.*)$|--[a-zA-Z0-9_-]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b|\b\d+(?:\.\d+)?n?\b|[^\s\w"`#-]+|\s+)/g;

  const matches = line.match(tokenRegex);
  if (!matches) return <span>{line}</span>;

  const keywords = new Set([
    'from',
    'import',
    'as',
    'def',
    'class',
    'return',
    'async',
    'await',
    'if',
    'else',
    'elif',
    'for',
    'in',
    'while',
    'try',
    'except',
    'with',
    'const',
    'let',
    'var',
    'function',
    'new',
    'export',
    'type',
    'interface',
    'curl',
    'npx',
    'apay',
    'docker',
    'run',
    'pip',
    'npm',
  ]);

  const builtins = new Set([
    'APaySession',
    'AgentWallet',

    'AgentWalletTS',
    'APayTool',
    'APayOpenAITool',
    'create_openai_tool',
    'handle_openai_tool_call',
    'create_swarm_tool',
    'create_llamaindex_tool',
    'create_crew_tool',
    'create_apay_crew_tool',
    'createAPayToolkit',
    'createAPayAITool',
    'Agent',
    'APayClient',
    'APayClientTS',
    'PaymentAuthorization',
    'Response',
    'Promise',
    'True',
    'False',
    'None',
    'true',
    'false',
    'null',
    'undefined',
  ]);

  const methods = new Set(['get', 'post', 'json', 'protect', 'checkout', 'open', 'print']);

  return matches.map((token, idx) => {
    // Strings
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith('`') && token.endsWith('`'))
    ) {
      return (
        <span key={idx} className="text-emerald-400 dark:text-emerald-300">
          {token}
        </span>
      );
    }

    // Comments
    if (token.startsWith('#') || token.startsWith('//')) {
      return (
        <span key={idx} className="text-slate-500 italic">
          {token}
        </span>
      );
    }

    // CLI Flags
    if (token.startsWith('--')) {
      return (
        <span key={idx} className="text-pink-400 font-medium">
          {token}
        </span>
      );
    }

    // Keywords
    if (keywords.has(token.toLowerCase())) {
      return (
        <span key={idx} className="text-purple-400 font-semibold">
          {token}
        </span>
      );
    }

    // Builtins & Types
    if (builtins.has(token)) {
      if (['true', 'false', 'True', 'False', 'None', 'null', 'undefined'].includes(token)) {
        return (
          <span key={idx} className="text-rose-400 font-semibold">
            {token}
          </span>
        );
      }
      return (
        <span key={idx} className="text-sky-300 font-semibold">
          {token}
        </span>
      );
    }

    // Methods
    if (methods.has(token)) {
      return (
        <span key={idx} className="text-amber-300 font-medium">
          {token}
        </span>
      );
    }

    // Numbers & Hex
    if (/^(0x[a-fA-F0-9]+|\d+(\.\d+)?n?)$/.test(token)) {
      return (
        <span key={idx} className="text-amber-400 font-mono">
          {token}
        </span>
      );
    }

    // Plain text
    return (
      <span key={idx} className="text-slate-200">
        {token}
      </span>
    );
  });
}

/**
 * Syntax-Highlighted Code Block with Language Tabs, Line Numbers, and Copy Feedback
 */
function CodeBlock({
  code,
  language,
  id,
  title,
  tabs,
  activeTab,
  onTabChange,
  copiedId,
  onCopy,
}: {
  code: string;
  language: string;
  id: string;
  title?: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const isCopied = copiedId === id;
  const lines = code.split('\n');

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-950 overflow-hidden shadow-xl transition-all duration-300 hover:border-slate-700">
      {/* Code Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* Window Control Dots */}
          <div className="flex items-center gap-1.5 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
          </div>

          {title && (
            <span className="text-xs font-mono font-semibold text-slate-300 pl-1 border-l border-slate-700/60">
              {title}
            </span>
          )}

          {/* Sub-tabs if multiple languages are available */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              {tabs.map((tab) => {
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange?.(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                      isTabActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={() => onCopy(code, id)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
            isCopied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60'
          }`}
          title="Copy code to clipboard"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighted Lines */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed select-text">
        <div className="table w-full">
          {lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="table-row group hover:bg-slate-900/40 transition-colors"
            >
              <span className="table-cell pr-4 text-right select-none text-slate-600 font-mono text-[11px] opacity-40 group-hover:opacity-75">
                {lineIndex + 1}
              </span>
              <span className="table-cell whitespace-pre font-mono text-xs">
                {tokenizeLine(line, language)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DocsTab({ activeNetwork = 'base-sepolia', onNavigateToTab }: DocsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('quickstart');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Sub-tabs state for code blocks
  const [buyerLang, setBuyerLang] = useState<'python' | 'ts' | 'curl'>('python');
  const [sellerFramework, setSellerFramework] = useState<'cli' | 'nextjs' | 'fastapi'>('cli');
  const [frameworkTab, setFrameworkTab] = useState<
    'openai' | 'crewai' | 'llamaindex' | 'vercel' | 'langchain' | 'mcp' | 'autogen'
  >('openai');
  const [gatewayTab, setGatewayTab] = useState<'cloudflare' | 'docker' | 'nginx'>('cloudflare');

  const contracts = getNetworkContracts(activeNetwork);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const navCategories = [
    {
      id: 'quickstart',
      label: 'Quickstart (60s)',
      icon: Zap,
      badge: 'Start Here',
      color: 'text-amber-500 dark:text-amber-400',
    },
    {
      id: 'http402',
      label: 'HTTP 402 Wire Protocol',
      icon: Shield,
      badge: 'EIP-712',
      color: 'text-blue-500 dark:text-sky-400',
    },
    {
      id: 'frameworks',
      label: 'AI Frameworks (OpenAI/CrewAI/Llama)',
      icon: Bot,
      badge: 'Tools',
      color: 'text-emerald-500 dark:text-emerald-400',
    },

    {
      id: 'contracts',
      label: 'Smart Contracts & ABIs',
      icon: Coins,
      badge: 'Base L2',
      color: 'text-purple-500 dark:text-purple-400',
    },
    {
      id: 'gateways',
      label: 'Reverse Proxy & Cloudflare',
      icon: Server,
      badge: 'Edge',
      color: 'text-sky-500 dark:text-sky-300',
    },
    {
      id: 'errors',
      label: 'Error Codes & Troubleshooting',
      icon: AlertCircle,
      badge: 'Status',
      color: 'text-rose-500 dark:text-rose-400',
    },
  ];

  // Search and Section Visibility Filter
  const isSearching = searchQuery.trim().length > 0;
  const matchesSearch = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  const shouldShowSection = (sectionId: string, keywords: string) => {
    if (isSearching) {
      return matchesSearch(keywords);
    }
    return activeCategory === sectionId;
  };

  const visibleCount = useMemo(() => {
    if (!isSearching) return 1;
    let count = 0;
    if (matchesSearch('quickstart python buyer seller curl nodejs 60-second')) count++;
    if (
      matchesSearch(
        'http 402 eip-712 wire protocol challenge nonce signature voucher specification',
      )
    )
      count++;
    if (matchesSearch('frameworks langchain crewai mcp autogen agent tools')) count++;
    if (matchesSearch('smart contracts abis apaytoken router escrow staking basescan tokens'))
      count++;
    if (matchesSearch('reverse proxy cloudflare docker nginx gateway protect edge')) count++;
    if (matchesSearch('error codes troubleshooting 402 401 429 budget replay')) count++;
    return count;
  }, [searchQuery, isSearching]);

  // Dynamic Network Snippets
  const networkFlag = activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia';
  const networkDisplayName = contracts.chain.chainName;

  const buyerCodeSnippets = {
    python: `from apay import APaySession, AgentWallet

# 1. Initialize local non-custodial agent wallet with strict spending guardrails
wallet = AgentWallet(
    private_key="0xYourAgentPrivateKeyHere",
    max_per_call_usdc=0.01,           # Strict cap per individual API call ($0.01 USDC)
    daily_budget_usdc=5.0             # Strict 24h rolling budget cap ($5.00 USDC)
)
session = APaySession(wallet)

# 2. Automatically intercepts HTTP 402, cryptographically signs EIP-712 voucher & delivers data
response = session.get("https://api.domain.com/v1/intelligence")
print(response.json())`,
    ts: `import { APayClient } from 'apay-gateway';

// 1. Initialize TypeScript Agent Client on ${networkDisplayName}
const client = new APayClient({
  privateKey: process.env.AGENT_PRIVATE_KEY || '0x...',
  maxPerCallUsdc: 0.01,
  dailyBudgetUsdc: 5.0,
  network: '${networkFlag}'
});

// 2. Fetch monetized endpoint with auto-intercepted HTTP 402 settlement
const response = await client.fetch('https://api.domain.com/v1/intelligence');
const data = await response.json();
console.log('Unlocked Intelligence:', data);`,
    curl: `# 1. Query endpoint directly to receive structured HTTP 402 challenge:
curl -i https://api.domain.com/v1/intelligence

# 2. Response returns required payment headers:
# HTTP/1.1 402 Payment Required
# X-APay-Receiver: 0xMerchantPayoutAddress...
# X-APay-Amount: 1000 (0.001 USDC)
# X-APay-Nonce: 5ab11ca4-7061-4d7f-af2c-f76ced8444f0
# X-APay-Network: ${networkFlag}

# 3. Submit request with EIP-712 cryptographic authorization voucher:
curl -H "X-APay-Payer: 0xAgentWalletAddress..." \\
     -H "X-APay-Signature: 0xSignatureBytes..." \\
     -H "X-APay-Nonce: 5ab11ca4-7061-4d7f-af2c-f76ced8444f0" \\
     https://api.domain.com/v1/intelligence`,
  };

  const sellerCodeSnippets = {
    cli: `# 1. Scaffold fullstack monetized app (Next.js, FastAPI, or Express) in 60s:
npx create-apay-app my-paid-agent

# 2. Or wrap ANY existing local or remote server with an instant zero-code HTTP 402 Paywall:
apay protect --target http://localhost:8000 --price 0.001 --wallet 0xYourPayoutWalletAddress`,
    nextjs: `// middleware.ts - Instant Next.js Edge Paywall
import { apayMiddleware } from 'apay-gateway/next';

export const middleware = apayMiddleware({
  receiver: '0xYourPayoutWalletAddress',
  price: '0.002 USDC',
  network: '${networkFlag}',
  protectedRoutes: ['/api/agent/*', '/api/v1/intelligence/*']
});

export const config = {
  matcher: ['/api/agent/:path*', '/api/v1/intelligence/:path*'],
};`,
    fastapi: `# main.py - 1-Line FastAPI Route Monetization
from fastapi import FastAPI, Depends
from apay.fastapi import APayPaywall, VerifiedClaim

app = FastAPI(title="Monetized AI Agent Service")
paywall = APayPaywall(
    receiver="0xYourPayoutWalletAddress",
    price_usdc=0.002,
    network="${networkFlag}"
)

@app.get("/api/v1/intelligence")
async def get_alpha(claim: VerifiedClaim = Depends(paywall)):
    return {
        "status": "success",
        "payer": claim.payer,
        "amount_paid": claim.amount,
        "alpha_data": "High-signal institutional analytics delivered!"
    }`,
  };

  const frameworkCodeSnippets = {
    openai: `from apay.integrations.openai import create_openai_tool, handle_openai_tool_call
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=2.0)

# Build standard OpenAI function calling tool
alpha_tool = create_openai_tool(
    name="get_crypto_alpha",
    description="Fetches verified whale movements and on-chain intelligence",
    target_url="https://api.alphainsights.com/v1/alpha",
    wallet=wallet,
    currency="USDC",
)

# 1. Pass to OpenAI Chat Completions:
# completion = client.chat.completions.create(
#     model="gpt-4o",
#     messages=messages,
#     tools=[alpha_tool.to_openai_tool()]
# )
# 2. Auto-settle payment for returned tool_call:
# tool_msg = handle_openai_tool_call(tool_call, [alpha_tool])
# messages.append(tool_msg)`,
    crewai: `from apay.integrations.crewai import create_crew_tool
from apay.wallet import AgentWallet
from crewai import Agent

wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=3.0)
research_tool = create_crew_tool(
    name="research_engine",
    target_url="https://api.research.ai/data",
    wallet=wallet,
    description="Autonomous research engine with HTTP 402 settlement",
)

researcher = Agent(
    role="Autonomous Web Researcher",
    goal="Extract high-signal intelligence while strictly managing machine budget",
    tools=[research_tool]
)`,
    llamaindex: `from apay.integrations.llamaindex import create_llamaindex_tool
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=1.0)

# Native LlamaIndex FunctionTool that auto-unlocks HTTP 402 vector searches
rag_tool = create_llamaindex_tool(
    name="paid_vector_search",
    description="Query gated institutional research papers on Base L2",
    target_url="https://api.research.ai/vector-query",
    wallet=wallet,
)`,
    vercel: `// Vercel AI SDK Integration
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentWalletTS, createAPayToolkit } from 'apay-gateway';

const wallet = AgentWalletTS.create({ maxPerCallUsdc: 0.05, dailyBudgetUsdc: 2.0 });

// Map protected APIs into native AI SDK tools
const tools = createAPayToolkit(wallet, {
  marketAlpha: {
    url: 'https://api.market.com/alpha',
    description: 'Autonomous paid intelligence feed on Base L2',
  },
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Fetch the latest crypto momentum signals',
});`,
    langchain: `from apay.integrations.langchain import create_apay_tool
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=2.0)

# Register as standard tool in any LangChain / LangGraph agent
market_tool = create_apay_tool(
    name="market_alpha",
    target_url="https://api.alphainsights.com/v1/data",
    description="Fetches real-time institutional alpha data behind an A-Pay HTTP 402 paywall",
    wallet=wallet,
)`,
    mcp: `// claude_desktop_config.json or Cursor MCP Configuration:
{
  "mcpServers": {
    "apay-protocol": {
      "command": "npx",
      "args": ["-y", "apay-mcp-server"],
      "env": {
        "APAY_NETWORK": "${networkFlag}",
        "APAY_AGENT_KEY": "0xYourAgentPrivateKeyHere",
        "MAX_PER_CALL_USDC": "0.05"
      }
    }
  }
}`,
    autogen: `from apay.integrations.autogen import APayAutoGenToolkit
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=0.50)
toolkit = APayAutoGenToolkit(wallet=wallet, currency="USDC")

# Register paid function with assistant and user_proxy
toolkit.register(
    assistant=assistant_agent,
    user_proxy=user_proxy_agent,
    target_url="https://api.example.com/compute-task",
    name="run_compute_task",
)`,
  };

  const gatewayCodeSnippets = {
    cloudflare: `// Cloudflare Worker: 0-Cold-Start Edge HTTP 402 Reverse Proxy
import { createEdgePaywall } from 'apay-gateway/cloudflare';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const paywall = createEdgePaywall({
      upstreamUrl: 'https://backend-service.internal.domain.com',
      receiverWallet: '0xYourPayoutWalletAddress',
      priceUsdc: 0.001,
      network: '${networkFlag}'
    });
    return paywall.handle(request);
  }
};`,
    docker: `# Run production-grade A-Pay Reverse Proxy as Docker container:
docker run -d \\
  --name apay-gateway \\
  -p 8080:8080 \\
  -e TARGET_URL=http://backend:3000 \\
  -e RECEIVER_WALLET=0xYourPayoutWalletAddress \\
  -e PRICE_USDC=0.001 \\
  -e NETWORK=${networkFlag} \\
  apaynetwork/gateway:latest`,
    nginx: `# Nginx subrequest authentication pattern:
location /api/monetized/ {
    auth_request /apay-auth;
    proxy_pass http://internal_backend;
}

location = /apay-auth {
    internal;
    proxy_pass http://127.0.0.1:8100/verify-voucher;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
}`,
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Banner with Day & Night Adaptive Styling */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-white/95 dark:from-slate-900/90 dark:via-blue-950/40 dark:to-slate-900/90 border border-blue-200/80 dark:border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-lg dark:shadow-2xl shadow-blue-500/5 transition-all duration-300">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-sky-300 text-xs font-mono font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>A-PAY PROTOCOL SPECIFICATION & REFERENCE</span>
            </div>
            <h1 className="font-spatial text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Developer Documentation & API Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Everything you need to integrate zero-friction HTTP 402 machine-to-machine
              micropayments, in-memory agent wallets, edge paywalls, and Base L2 smart contract
              rails into your autonomous AI swarms.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('mcphub')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg shadow-blue-600/25 active:scale-95 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Launch Agent Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={contracts.chain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>BaseScan Contracts</span>
            </a>
          </div>
        </div>

        {/* Ambient Decorative Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Documentation Layout (Navigation Sidebar + Content Pane) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Categories Sidebar (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search Box with Clear Button & Keyboard Shortcut Hint */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation (e.g. EIP-712, 402, Python)..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Query Result Feedback */}
          {searchQuery && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-sky-300 font-mono">
              <span>Matching Sections</span>
              <span className="font-bold">{visibleCount} Guides</span>
            </div>
          )}

          {/* Category Navigation Pills (Responsive Mobile Horizontal Ribbon & Desktop Vertical List) */}
          <div className="glass-panel rounded-3xl p-2 sm:p-2.5 shadow-sm">
            <div className="flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 pb-1 lg:pb-0">
              {navCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id && !isSearching;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchQuery('');
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        contentAreaRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }
                    }}
                    className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl text-left text-xs font-semibold transition-all group cursor-pointer flex-shrink-0 lg:w-full ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-600 dark:bg-blue-600/30 dark:text-sky-200 dark:border-blue-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl transition-all ${
                          isActive
                            ? 'bg-white/20 text-white dark:bg-blue-500/30 dark:text-sky-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:scale-110'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="whitespace-nowrap">{cat.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30 dark:bg-blue-500/20 dark:text-sky-200 dark:border-blue-400/30'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Protocol Quick Telemetry Card */}
          <div className="glass-panel rounded-3xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <span className="font-spatial font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                Protocol Settlement
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Target Settlement</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 font-bold text-[10px]">
                  {contracts.chain.chainName}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Cryptographic Scheme</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                  EIP-712 Typed
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Sign & Verify Latency</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  &lt; 15 ms
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Deflationary Mechanism</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  30% Fee Burn
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Pane (8 Columns) */}
        <div ref={contentAreaRef} className="lg:col-span-8 space-y-6">
          {/* Breadcrumb Navigation when viewing active category */}
          {!isSearching && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>Docs</span>
                <span>/</span>
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  {navCategories.find((c) => c.id === activeCategory)?.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Guide {navCategories.findIndex((c) => c.id === activeCategory) + 1} of{' '}
                {navCategories.length}
              </span>
            </div>
          )}

          {/* 1. Quickstart Section */}
          {shouldShowSection(
            'quickstart',
            'quickstart buyer seller python curl nodejs 60-second',
          ) && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      60-Second Quickstart
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Integrate autonomous machine micropayments in 2 lines of code
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-semibold">
                  Python 3.11+ / Node.js 18+
                </span>
              </div>

              {/* Step 1: Buyer Agent */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                    1. For Autonomous AI Agents (The Buyers)
                  </h3>
                </div>

                <CodeBlock
                  code={buyerCodeSnippets[buyerLang]}
                  language={
                    buyerLang === 'python' ? 'python' : buyerLang === 'ts' ? 'typescript' : 'bash'
                  }
                  id="code-buyer"
                  title="Buyer Agent Client"
                  tabs={[
                    { id: 'python', label: 'Python SDK' },
                    { id: 'ts', label: 'TypeScript / Node' },
                    { id: 'curl', label: 'cURL API' },
                  ]}
                  activeTab={buyerLang}
                  onTabChange={(t) => setBuyerLang(t as 'python' | 'ts' | 'curl')}
                  copiedId={copiedId}
                  onCopy={copyCode}
                />
              </div>

              {/* Step 2: Sellers / APIs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    2. Protect Any Website or API (The Sellers)
                  </h3>
                </div>

                <CodeBlock
                  code={sellerCodeSnippets[sellerFramework]}
                  language={
                    sellerFramework === 'fastapi'
                      ? 'python'
                      : sellerFramework === 'nextjs'
                        ? 'typescript'
                        : 'bash'
                  }
                  id="code-seller"
                  title="Seller Integration"
                  tabs={[
                    { id: 'cli', label: 'CLI Paywall' },
                    { id: 'nextjs', label: 'Next.js Middleware' },
                    { id: 'fastapi', label: 'FastAPI Decorator' },
                  ]}
                  activeTab={sellerFramework}
                  onTabChange={(t) => setSellerFramework(t as 'cli' | 'nextjs' | 'fastapi')}
                  copiedId={copiedId}
                  onCopy={copyCode}
                />
              </div>
            </div>
          )}

          {/* 2. HTTP 402 Protocol Specification */}
          {shouldShowSection(
            'http402',
            'http 402 eip-712 wire protocol challenge nonce signature voucher specification',
          ) && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      HTTP 402 Wire Protocol & EIP-712 Spec
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standardized machine-to-machine challenge-response cycle on Base Layer 2
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-semibold">
                  RFC Standard Spec
                </span>
              </div>

              {/* 4-Step Interactive Flow Visualizer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    Step 1
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    GET /resource
                  </div>
                  <div className="text-[11px] text-slate-500">Unauthenticated</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Step 2
                  </span>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-300">
                    HTTP 402
                  </div>
                  <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                    Nonce Challenge
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400 uppercase">
                    Step 3
                  </span>
                  <div className="text-xs font-bold text-blue-600 dark:text-sky-300">
                    Sign EIP-712
                  </div>
                  <div className="text-[11px] text-blue-600/80 dark:text-sky-400/80">
                    In-Memory Secp256k1
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Step 4
                  </span>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    200 Settle
                  </div>
                  <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                    Data Delivered
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  When an autonomous agent accesses an A-Pay protected endpoint without payment, the
                  server responds with an{' '}
                  <span className="font-mono text-blue-600 dark:text-sky-400 font-bold">
                    HTTP 402 Payment Required
                  </span>{' '}
                  status containing cryptographically verifiable response headers:
                </p>

                {/* Challenge Headers Inspector */}
                <div className="rounded-2xl border border-slate-800/90 bg-slate-950 p-4 font-mono space-y-2 text-xs text-slate-300">
                  <div className="text-slate-500 italic pb-1 border-b border-slate-800">
                    {'// Server Challenge Response Headers (HTTP 402):'}
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span>X-APay-Receiver:</span>
                    <span className="text-slate-100 font-semibold">
                      {contracts.APayRouter.treasury}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span>X-APay-Amount:</span>
                    <span className="text-slate-100 font-semibold">
                      1000 (0.001 USDC base units)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span>X-APay-Currency:</span>
                    <span className="text-slate-100 font-semibold">USDC | APAY | DUAL</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span>X-APay-Nonce:</span>
                    <span className="text-slate-100 font-semibold">
                      5ab11ca4-7061-4d7f-af2c-f76ced8444f0
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span>X-APay-Network:</span>
                    <span className="text-slate-100 font-semibold">
                      {contracts.chain.id} (Chain ID {contracts.chain.chainId})
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="font-spatial text-base font-bold text-slate-900 dark:text-white pb-2">
                    EIP-712 Typed Data Structure
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pb-3">
                    The agent wallet hashes and cryptographically signs the challenge parameters
                    with domain separation to prevent cross-chain or cross-application replay
                    attacks:
                  </p>

                  <CodeBlock
                    code={`{
  "domain": {
    "name": "APay Protocol",
    "version": "1",
    "chainId": ${contracts.chain.chainId},
    "verifyingContract": "${contracts.APayRouter.address}"
  },
  "types": {
    "PaymentAuthorization": [
      { "name": "payer", "type": "address" },
      { "name": "receiver", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "nonce", "type": "string" }
    ]
  },
  "primaryType": "PaymentAuthorization",
  "message": {
    "payer": "0xAgentWalletAddress...",
    "receiver": "0xMerchantPayoutAddress...",
    "amount": "1000",
    "nonce": "5ab11ca4-7061-4d7f-af2c-f76ced8444f0"
  }
}`}
                    language="json"
                    id="code-eip712"
                    title="EIP-712 Payment Voucher Schema"
                    copiedId={copiedId}
                    onCopy={copyCode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. AI Framework Integrations */}
          {shouldShowSection(
            'frameworks',
            'frameworks openai swarm llamaindex vercel langchain crewai mcp autogen agent tools',
          ) && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      AI Framework Integrations
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Native wrappers for OpenAI (Swarm & Functions), CrewAI, LlamaIndex, Vercel AI
                      SDK, LangChain, MCP, and AutoGen
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-semibold">
                  Drop-In Tools
                </span>
              </div>

              <CodeBlock
                code={frameworkCodeSnippets[frameworkTab]}
                language={
                  frameworkTab === 'mcp'
                    ? 'json'
                    : frameworkTab === 'vercel'
                      ? 'typescript'
                      : 'python'
                }
                id="code-framework"
                title="AI Agent Tool Definition"
                tabs={[
                  { id: 'openai', label: 'OpenAI (Swarm/Functions)' },
                  { id: 'crewai', label: 'CrewAI' },
                  { id: 'llamaindex', label: 'LlamaIndex' },
                  { id: 'vercel', label: 'Vercel AI SDK (TS)' },
                  { id: 'langchain', label: 'LangChain' },
                  { id: 'mcp', label: 'Claude / Cursor (MCP)' },
                  { id: 'autogen', label: 'AutoGen' },
                ]}
                activeTab={frameworkTab}
                onTabChange={(t) =>
                  setFrameworkTab(
                    t as
                      | 'openai'
                      | 'crewai'
                      | 'llamaindex'
                      | 'vercel'
                      | 'langchain'
                      | 'mcp'
                      | 'autogen',
                  )
                }
                copiedId={copiedId}
                onCopy={copyCode}
              />
            </div>
          )}

          {/* 4. Live Smart Contracts & ABIs */}
          {shouldShowSection(
            'contracts',
            'smart contracts abis apaytoken router escrow staking basescan tokens',
          ) && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Live Smart Contracts ({contracts.chain.shortName})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Non-custodial, verified smart contracts on Base L2
                    </p>
                  </div>
                </div>
                <a
                  href={contracts.chain.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-mono font-semibold"
                >
                  <span>BaseScan Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* APAYToken */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      $APAY Protocol Token
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                      ERC-20 (100M Cap)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <span className="truncate">{contracts.APAYToken.address}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(contracts.APAYToken.address, 'copy-token-addr')}
                      className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {copiedId === 'copy-token-addr' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Decimals: 18 • Hard Cap: 100,000,000 APAY
                  </div>
                </div>

                {/* APayRouter V1 */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      APayRouter (V1 Gateway)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/30 font-bold">
                      1.0% Protocol Fee
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <span className="truncate">{contracts.APayRouter.address}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(contracts.APayRouter.address, 'copy-router-addr')}
                      className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {copiedId === 'copy-router-addr' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Direct EIP-712 voucher clearing & relayer execution
                  </div>
                </div>

                {/* APayRouter V2 */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      APayRouterV2 (Enterprise)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold">
                      Merkle Channels
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <span className="truncate">{contracts.APayRouterV2.address}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(contracts.APayRouterV2.address, 'copy-router2-addr')}
                      className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {copiedId === 'copy-router2-addr' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Batch cumulative settling & Merkle proof claims
                  </div>
                </div>

                {/* EscrowVault */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      EscrowVault (Session Keys)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                      Sub-Agent Delegations
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <span className="truncate">{contracts.EscrowVault.address}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(contracts.EscrowVault.address, 'copy-escrow-addr')}
                      className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {copiedId === 'copy-escrow-addr' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Time-bound session locks without exposing master keys
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Reverse Proxy & Cloudflare Edge (NEW HIGH-IMPACT SECTION) */}
          {shouldShowSection(
            'gateways',
            'reverse proxy cloudflare docker nginx gateway protect edge',
          ) && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Reverse Proxy & Edge Gateways
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deploy 0-cold-start HTTP 402 paywalls at edge with Cloudflare, Docker, or
                      Nginx
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-semibold">
                  Zero Code Modification
                </span>
              </div>

              <CodeBlock
                code={gatewayCodeSnippets[gatewayTab]}
                language={gatewayTab === 'cloudflare' ? 'typescript' : 'bash'}
                id="code-gateway"
                title="Edge Gateway Integration"
                tabs={[
                  { id: 'cloudflare', label: 'Cloudflare Worker' },
                  { id: 'docker', label: 'Docker Daemon' },
                  { id: 'nginx', label: 'Nginx Config' },
                ]}
                activeTab={gatewayTab}
                onTabChange={(t) => setGatewayTab(t as 'cloudflare' | 'docker' | 'nginx')}
                copiedId={copiedId}
                onCopy={copyCode}
              />
            </div>
          )}

          {/* 6. Error Codes & Troubleshooting */}
          {shouldShowSection('errors', 'error codes troubleshooting 402 401 429 budget replay') && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-spatial text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Error Codes & Troubleshooting
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard protocol HTTP codes, replay defense, and client guardrail rejections
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                      HTTP 402 Payment Required
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                      Standard Challenge
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Normal initial response when accessing a monetized endpoint without valid
                    EIP-712 payment voucher headers. The client should parse the headers and submit
                    a signed voucher.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-rose-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                      HTTP 401 Replay Attack Detected
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/30">
                      Security Invariant
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Triggered when the challenge nonce was already consumed or has expired (&gt; 5
                    minutes TTL). Agents must request a fresh challenge nonce before re-submitting.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-sky-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-sky-400">
                      A-Pay Guardrail Triggered: Budget Exceeded
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-sky-300 font-semibold border border-blue-500/30">
                      Client Defense
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Thrown locally inside the agent wallet before signing if the website attempts to
                    charge more than{' '}
                    <code className="text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">
                      max_per_call_usdc
                    </code>{' '}
                    or if the agent's{' '}
                    <code className="text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">
                      daily_budget_usdc
                    </code>{' '}
                    has been fully exhausted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Empty State */}
          {isSearching && visibleCount === 0 && (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-slate-200/80 dark:border-slate-800/80">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white">
                  No Documentation Found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  No reference section matched &quot;{searchQuery}&quot;. Try searching for
                  &quot;HTTP 402&quot;, &quot;LangChain&quot;, &quot;Smart Contracts&quot;, or
                  &quot;Reverse Proxy&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
              >
                Clear Search Query
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
