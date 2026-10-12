'use client';

import {
  Activity,
  Bot,
  Check,
  Code,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { generatePrivateKey } from 'viem/accounts';
import type { NetworkId } from '@/config/contracts';

export function McpHubTab({
  walletAddress,
  activeNetwork = 'base-sepolia',
}: {
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<'claude' | 'cursor' | 'antigravity'>(
    'claude',
  );
  const [configCurrency, setConfigCurrency] = useState<'APAY' | 'USDC' | 'DUAL'>('DUAL');
  const [maxCallUsdc, setMaxCallUsdc] = useState('0.05');
  const [dailyBudgetUsdc, setDailyBudgetUsdc] = useState('2.00');
  const [maxCallApay, setMaxCallApay] = useState('10.0');
  const [dailyBudgetApay, setDailyBudgetApay] = useState('100.0');
  const [copiedConfig, setCopiedConfig] = useState(false);

  // Simulator State
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simCurrency, setSimCurrency] = useState<'APAY' | 'USDC' | 'DUAL'>('APAY');
  const [simPriceApay, setSimPriceApay] = useState('4.0');
  const [simPriceUsdc, setSimPriceUsdc] = useState('0.001');
  const [simUrl, setSimUrl] = useState('https://api.alphainsights.com/v1/market-intelligence');

  const [agentPrivateKey, setAgentPrivateKey] = useState<string>('');

  const generateNewKey = () => {
    const pk = generatePrivateKey();
    setAgentPrivateKey(pk);
  };

  const effectiveKey = agentPrivateKey || '0xYourAgentPrivateKeyHere';

  const networkEnv = activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia';

  const getArgs = () => {
    const baseArgs = ['run', 'apay', 'mcp'];
    if (configCurrency === 'APAY') {
      return [
        ...baseArgs,
        '--currency',
        'APAY',
        '--max-call-apay',
        maxCallApay,
        '--daily-budget-apay',
        dailyBudgetApay,
      ];
    }
    if (configCurrency === 'USDC') {
      return [
        ...baseArgs,
        '--currency',
        'USDC',
        '--max-call',
        maxCallUsdc,
        '--daily-budget',
        dailyBudgetUsdc,
      ];
    }
    return [
      ...baseArgs,
      '--currency',
      'DUAL',
      '--max-call',
      maxCallUsdc,
      '--daily-budget',
      dailyBudgetUsdc,
      '--max-call-apay',
      maxCallApay,
      '--daily-budget-apay',
      dailyBudgetApay,
    ];
  };

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        apay: {
          command: 'uv',
          args: getArgs(),
          env: {
            APAY_PRIVATE_KEY: effectiveKey,
            APAY_NETWORK: networkEnv,
            APAY_CURRENCY: configCurrency,
          },
        },
      },
    },
    null,
    2,
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        'apay-agent-wallet': {
          command: 'uv',
          args: getArgs(),
          env: {
            APAY_PRIVATE_KEY: effectiveKey,
            APAY_NETWORK: networkEnv,
            APAY_CURRENCY: configCurrency,
          },
        },
      },
    },
    null,
    2,
  );

  const antigravityConfig = JSON.stringify(
    {
      name: 'apay-protocol',
      type: 'mcp-stdio',
      command: 'uv run apay mcp',
      settings: {
        currency: configCurrency,
        ...(configCurrency !== 'APAY' && {
          max_call_usdc: Number(maxCallUsdc),
          daily_budget_usdc: Number(dailyBudgetUsdc),
        }),
        ...(configCurrency !== 'USDC' && {
          max_call_apay: Number(maxCallApay),
          daily_budget_apay: Number(dailyBudgetApay),
        }),
        network:
          activeNetwork === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base L2 Sepolia (84532)',
      },
    },
    null,
    2,
  );

  const activeConfig =
    selectedPlatform === 'claude'
      ? claudeConfig
      : selectedPlatform === 'cursor'
        ? cursorConfig
        : antigravityConfig;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeConfig);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
      setTimeout(() => {
        setSimStep(3);
        setTimeout(() => {
          setSimStep(4);
          setTimeout(() => {
            setSimStep(5);
            setIsSimulating(false);
          }, 600);
        }, 600);
      }, 700);
    }, 600);
  };

  const steps = [
    {
      num: 1,
      title: 'Agent Probe',
      desc: 'AI Agent sends unauthenticated GET to protected API',
      status: simStep >= 1 ? (simStep === 1 ? 'active' : 'done') : 'pending',
    },
    {
      num: 2,
      title: 'HTTP 402 Challenge',
      desc: 'Gateway responds with 402 & EIP-712 challenge nonce',
      status: simStep >= 2 ? (simStep === 2 ? 'active' : 'done') : 'pending',
    },
    {
      num: 3,
      title: 'Sign & Guardrails',
      desc: 'Agent checks budget cap & cryptographically signs (<15ms)',
      status: simStep >= 3 ? (simStep === 3 ? 'active' : 'done') : 'pending',
    },
    {
      num: 4,
      title: 'Anti-Replay Verify',
      desc: 'Server verifies signature & consumes single-use nonce',
      status: simStep >= 4 ? (simStep === 4 ? 'active' : 'done') : 'pending',
    },
    {
      num: 5,
      title: '200 OK & Unlock',
      desc: 'Request forwarded & confidential payload delivered',
      status: simStep >= 5 ? 'done' : 'pending',
    },
  ];

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/20 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-4">
            <Bot className="w-3.5 h-3.5" />
            <span>MODEL CONTEXT PROTOCOL (MCP) RUNTIME</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Universal AI Agent Wallet & Interactive 402 Simulator
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Equip <strong>Claude Desktop, Cursor IDE, Windsurf</strong>, and custom AI agents with
            autonomous spending authority on Base L2. No smart contract coding required—just plug in
            the MCP server and let agents trade data, compute, and APIs safely.
          </p>
        </div>
      </div>

      {/* Section 1: Interactive Visual 5-Step 402 Protocol Simulator */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Live HTTP 402 Lifecycle Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Watch an autonomous machine-to-machine micropayment challenge execute in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                isSimulating
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95'
              }`}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Negotiating Settlement...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Run Live Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settlement Currency Rail Selector */}
        <div className="mt-6 space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Settlement Currency Rail</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-normal">
                (0% Protocol Fee on $APAY)
              </span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              Active Network:{' '}
              <strong className="text-blue-600 dark:text-sky-400 font-semibold">
                {activeNetwork === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)'}
              </strong>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSimCurrency('APAY')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                simCurrency === 'APAY'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚡ $APAY</span>
              <span className="hidden sm:inline text-[9px] opacity-90">(Native 0% Fee)</span>
            </button>
            <button
              type="button"
              onClick={() => setSimCurrency('USDC')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                simCurrency === 'USDC'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>💵 USDC</span>
              <span className="hidden sm:inline text-[9px] opacity-90">(Circle USD)</span>
            </button>
            <button
              type="button"
              onClick={() => setSimCurrency('DUAL')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                simCurrency === 'DUAL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🌐 DUAL</span>
              <span className="hidden sm:inline text-[9px] opacity-90">(Multi-Rail)</span>
            </button>
          </div>
        </div>

        {/* Target Endpoint & Price Simulation Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div
            className={`${simCurrency === 'DUAL' ? 'sm:col-span-1' : 'sm:col-span-2'} space-y-1.5`}
          >
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Target Paid Endpoint
            </label>
            <input
              type="text"
              value={simUrl}
              onChange={(e) => setSimUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          {simCurrency === 'APAY' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>Per-Call Price ($APAY)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                  0% Fee
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={simPriceApay}
                  onChange={(e) => setSimPriceApay(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-200 pr-20"
                />
                <span className="absolute right-3 top-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ⚡ $APAY
                </span>
              </div>
            </div>
          )}

          {simCurrency === 'USDC' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-blue-600 dark:text-sky-400 flex items-center justify-between">
                <span>Per-Call Price (USDC)</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">Circle USD</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={simPriceUsdc}
                  onChange={(e) => setSimPriceUsdc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 pr-16"
                />
                <span className="absolute right-3 top-2 text-[11px] font-bold text-blue-600 dark:text-sky-400">
                  USDC
                </span>
              </div>
            </div>
          )}

          {simCurrency === 'DUAL' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>⚡ $APAY Price</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                    0% Fee
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={simPriceApay}
                    onChange={(e) => setSimPriceApay(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-200 pr-16"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    $APAY
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-600 dark:text-sky-400 flex items-center justify-between">
                  <span>💵 USDC Price</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Standard</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={simPriceUsdc}
                    onChange={(e) => setSimPriceUsdc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 pr-16"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-blue-600 dark:text-sky-400">
                    USDC
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 5-Step Visual Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-8">
          {steps.map((st) => (
            <div
              key={st.num}
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                st.status === 'active'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-md shadow-blue-500/10 scale-102'
                  : st.status === 'done'
                    ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    st.status === 'done'
                      ? 'bg-emerald-500 text-white'
                      : st.status === 'active'
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st.status === 'done' ? <Check className="w-3.5 h-3.5" /> : st.num}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {st.status}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{st.title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Real Simulation Inspection Output */}
        {simStep > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 font-mono text-[11px] space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                Live Wire Protocol Inspection
              </span>
              <span>Step {simStep} of 5</span>
            </div>

            {simStep === 1 && (
              <div className="space-y-1 text-slate-300">
                <p className="text-emerald-400">&gt; GET /v1/market-intelligence HTTP/1.1</p>
                <p>Host: api.alphainsights.com</p>
                <p>User-Agent: APay-Agent/1.0.0 (MCP-Client)</p>
                <p className="text-slate-500 italic mt-1">
                  &#47;&#47; Waiting for server challenge...
                </p>
              </div>
            )}

            {simStep === 2 && (
              <div className="space-y-1 text-amber-300">
                <p className="font-bold text-amber-400">&lt; HTTP/1.1 402 Payment Required</p>
                <p>X-APay-Version: 1.0.0</p>
                <p>X-APay-Currency: {simCurrency}</p>
                {simCurrency === 'APAY' && (
                  <>
                    <p>
                      X-APay-Amount:{' '}
                      {(Number(simPriceApay || '4.0') * 1e18).toLocaleString('fullwide', {
                        useGrouping: false,
                      })}{' '}
                      ({simPriceApay} $APAY)
                    </p>
                    <p className="text-emerald-400">
                      X-APay-Fee: 0% (Protocol Fee Exempt on Native $APAY)
                    </p>
                  </>
                )}
                {simCurrency === 'USDC' && (
                  <>
                    <p>
                      X-APay-Amount: {(Number(simPriceUsdc || '0.001') * 1e6).toFixed(0)} base units
                      (${simPriceUsdc} USDC)
                    </p>
                    <p>X-APay-Fee: 0.1% ($0.000001 USDC -&gt; Protocol Fee Pool)</p>
                  </>
                )}
                {simCurrency === 'DUAL' && (
                  <>
                    <p>
                      X-APay-Amount-Apay:{' '}
                      {(Number(simPriceApay || '4.0') * 1e18).toLocaleString('fullwide', {
                        useGrouping: false,
                      })}{' '}
                      ({simPriceApay} $APAY - 0% Fee)
                    </p>
                    <p>
                      X-APay-Amount-Usdc: {(Number(simPriceUsdc || '0.001') * 1e6).toFixed(0)} ($
                      {simPriceUsdc} USDC)
                    </p>
                    <p className="text-purple-300">X-APay-Multi-Rail: Supported</p>
                  </>
                )}
                <p>X-APay-Receiver: {walletAddress || '0xYourReceiverWalletAddress...'}</p>
                <p>X-APay-Nonce: c2b849e7-4029-4fb2-80ea-98da2b34a10e</p>
                <p>X-APay-Scheme: eip712</p>
              </div>
            )}

            {simStep === 3 && (
              <div className="space-y-1 text-blue-300">
                <p className="font-bold text-blue-400">
                  ⚙️ Agent Checking Spending Guardrails (can_spend)...
                </p>
                {simCurrency === 'APAY' && (
                  <>
                    <p className="text-emerald-400">
                      ✓ Limit Approved: {simPriceApay} $APAY &lt; Max per call ({maxCallApay} $APAY)
                    </p>
                    <p className="text-amber-300">
                      ⚡ Native Rail Benefit: 0% protocol fee (100% of tokens to receiver)
                    </p>
                  </>
                )}
                {simCurrency === 'USDC' && (
                  <p className="text-emerald-400">
                    ✓ Limit Approved: ${simPriceUsdc} USDC &lt; Max per call (${maxCallUsdc} USDC)
                  </p>
                )}
                {simCurrency === 'DUAL' && (
                  <>
                    <p className="text-purple-300">
                      🌐 Dual-Rail Optimization: Agent detected both APAY &amp; USDC options
                    </p>
                    <p className="text-emerald-400">
                      ✓ Auto-selected $APAY rail: {simPriceApay} $APAY &lt; Max limit ({maxCallApay}{' '}
                      $APAY) for 0% fee efficiency
                    </p>
                  </>
                )}
                <p className="text-slate-300">
                  🔐 EIP-712 Signature Generated: 0x8a72b94f...c94e (Latency: 11.2 ms)
                </p>
              </div>
            )}

            {simStep === 4 && (
              <div className="space-y-1 text-purple-300">
                <p className="font-bold text-purple-400">
                  &gt; Presenting Cryptographic Authorization:
                </p>
                <p className="text-slate-300 break-all">
                  Authorization: APay eip712:0x8a72b94f...c94e:
                  {walletAddress ? `${walletAddress.slice(0, 10)}...` : '0xAgentWallet'}:nonce:
                  {simCurrency === 'USDC' ? '1000' : '4000000000000000000'}
                </p>
                <p className="text-emerald-400">
                  ✓ Gateway verified signer on{' '}
                  {activeNetwork === 'base-mainnet'
                    ? 'Base Mainnet (Chain ID 8453)'
                    : 'Base Sepolia (Chain ID 84532)'}{' '}
                  (<span className="text-white">12 ms</span>)
                </p>
                <p className="text-emerald-400">
                  ✓ Nonce consumed into memory (Zero-replay guaranteed)
                </p>
              </div>
            )}

            {simStep === 5 && (
              <div className="space-y-1 text-emerald-300">
                <p className="font-bold text-emerald-400">&lt; HTTP/1.1 200 OK</p>
                <p>X-APay-Settled: true</p>
                <p>
                  X-APay-Settled-Token:{' '}
                  {simCurrency === 'USDC' ? 'USDC' : '$APAY (Native 0% Protocol Fee)'}
                </p>
                <p>Content-Type: application/json</p>
                <div className="text-white bg-slate-800/80 p-2.5 rounded-lg mt-2 font-mono text-[11px]">
                  {`{ "status": "success", "secret_data": "CONFIDENTIAL ALPHA: Institutional Inflows +$450M today", "latency": "14ms" }`}
                </div>
                <p className="text-xs text-sky-400 font-semibold pt-1">
                  🎉 Data Unlocked &amp; Paid in{' '}
                  {simCurrency === 'USDC' ? `$${simPriceUsdc} USDC` : `${simPriceApay} $APAY`} in
                  14ms! No human friction or KYC required.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: 1-Click MCP Config Generator */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Code className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                1-Click MCP Config Generator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your platform, adjust spending guardrails, and copy the plug-and-play JSON
              configuration.
            </p>
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedPlatform('claude')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPlatform === 'claude'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setSelectedPlatform('cursor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPlatform === 'cursor'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cursor IDE
            </button>
            <button
              onClick={() => setSelectedPlatform('antigravity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPlatform === 'antigravity'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Antigravity / Windsurf
            </button>
          </div>
        </div>

        {/* Currency Rail Selector for MCP Client */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Agent Settlement Currency Mode</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                (Configure multi-token guardrails)
              </span>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setConfigCurrency('DUAL')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                configCurrency === 'DUAL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🌐 DUAL (Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigCurrency('APAY')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                configCurrency === 'APAY'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚡ $APAY Only</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigCurrency('USDC')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                configCurrency === 'USDC'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>💵 USDC Only</span>
            </button>
          </div>
        </div>

        {/* Guardrail Controls */}
        <div
          className={`grid grid-cols-1 ${
            configCurrency === 'DUAL' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'
          } gap-4 mt-6`}
        >
          {configCurrency !== 'APAY' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  Max Call Limit (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={maxCallUsdc}
                  onChange={(e) => setMaxCallUsdc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  Daily Budget (USDC)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dailyBudgetUsdc}
                  onChange={(e) => setDailyBudgetUsdc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            </>
          )}

          {configCurrency !== 'USDC' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Max Call Limit ($APAY)
                </label>
                <input
                  type="number"
                  step="1"
                  value={maxCallApay}
                  onChange={(e) => setMaxCallApay(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Daily Budget ($APAY)
                </label>
                <input
                  type="number"
                  step="10"
                  value={dailyBudgetApay}
                  onChange={(e) => setDailyBudgetApay(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-200"
                />
              </div>
            </>
          )}
        </div>

        {/* Code Snippet Box */}
        <div className="relative mt-6 rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
            <span className="text-[11px]">
              {selectedPlatform === 'claude'
                ? 'claude_desktop_config.json'
                : selectedPlatform === 'cursor'
                  ? '.cursor/mcp.json'
                  : 'antigravity-mcp.json'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateNewKey}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Generate an authentic 256-bit agent private key"
              >
                <span>🔑 Generate Key</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <pre className="text-slate-300 whitespace-pre leading-relaxed">{activeConfig}</pre>
        </div>
      </div>

      {/* Section 3: Native MCP Tools Reference Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600 dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Native MCP Tools Injected into LLMs
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-sky-400">
                apay_request(url, method, json_body)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                CORE
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sends an HTTP request to any API. Automatically detects 402 challenge, verifies safety
              guardrails, signs EIP-712 voucher, and returns decrypted response in &lt;25ms.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                apay_get_wallet_status()
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Inspects active wallet address on Base L2, remaining daily budget, per-call cap, and
              total amount spent in USDC and $APAY tokens.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                apay_set_budget(max_call, daily_budget)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold">
                GUARDRAILS
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Dynamically updates local client spending limits to prevent infinite loop bankruptcies
              or overcharging by malicious APIs.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                apay_inspect_endpoint(url)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold">
                ZERO-SPEND
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Probes an endpoint to check if it is protected by A-Pay and inspects the exact price
              quote, currency, and receiver wallet without signing or spending any funds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
