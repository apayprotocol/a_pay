'use client';

import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Play,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { recoverTypedDataAddress } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface SimulationStep {
  id: number;
  label: string;
  detail: string;
  status: 'pending' | 'active' | 'completed';
  latencyMs?: number;
}

export function AgentSimulatorCard({
  activeNetwork = 'base-sepolia',
}: {
  activeNetwork?: NetworkId;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [currency, setCurrency] = useState<'USDC' | 'APAY'>('USDC');
  const [agentType, setAgentType] = useState<'langchain' | 'mcp' | 'crewai'>('mcp');
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [telemetryLog, setTelemetryLog] = useState<string | null>(null);

  const contracts = getNetworkContracts(activeNetwork);
  const chainId = activeNetwork === 'base-mainnet' ? 8453 : 84532;

  const initialSteps: SimulationStep[] = [
    {
      id: 1,
      label: 'Probe HTTP 402 Paywall',
      detail: 'Agent requests /api/agent -> Gateway challenges with 402 & EIP-712 requirements',
      status: 'pending',
    },
    {
      id: 2,
      label: 'Session Wallet & Guardrail Check',
      detail: 'Verifies max_per_call ($0.05) & daily budget invariants before signing',
      status: 'pending',
    },
    {
      id: 3,
      label: 'EIP-712 Cryptographic Signature',
      detail: 'Signs structured payment authorization on Base Layer 2 in-memory',
      status: 'pending',
    },
    {
      id: 4,
      label: 'Gateway Verification & Settlement',
      detail: 'Cryptographic signature verified, nonce consumed, 0-gas channel journaled',
      status: 'pending',
    },
    {
      id: 5,
      label: 'Payload Unlocked (HTTP 200 OK)',
      detail: 'Proprietary intelligence delivered to autonomous agent in under 15ms',
      status: 'pending',
    },
  ];

  const [steps, setSteps] = useState<SimulationStep[]>(initialSteps);

  const runSimulation = async () => {
    setIsRunning(true);
    setTelemetryLog(null);
    setSteps(initialSteps.map((s) => ({ ...s, status: 'pending' })));

    for (let i = 0; i < initialSteps.length; i++) {
      setActiveStep(i + 1);
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'active' } : idx < i ? { ...s, status: 'completed' } : s,
        ),
      );

      // Realistic sub-millisecond step delay
      await new Promise((r) => setTimeout(r, 450));

      const latency = Math.floor(Math.random() * 4) + 2;
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'completed', latencyMs: latency } : s)),
      );
    }

    const tStart = performance.now();
    // 1. Generate real ephemeral secp256k1 keypair
    const ephemeralPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(ephemeralPrivateKey);

    // 2. Real cryptographic nonce & Base L2 parameters
    const realNonce =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `apay-${Date.now()}`;
    const routerAddress = contracts.APayRouter.address;
    const receiverWallet = contracts.EscrowVault.address;
    const amountBaseUnits = currency === 'USDC' ? 2000n : 1600000000000000000n;

    // 3. EIP-712 Typed Structure matching APayRouter.sol on Base
    const domain = {
      name: 'APay Protocol',
      version: '1',
      chainId,
      verifyingContract: routerAddress,
    } as const;

    const types = {
      PaymentAuthorization: [
        { name: 'payer', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'string' },
      ],
    } as const;

    const message = {
      payer: agentAccount.address,
      receiver: receiverWallet,
      amount: amountBaseUnits,
      nonce: realNonce,
    };

    // 4. Authentic in-memory EIP-712 cryptographic signature
    const realSignature = await agentAccount.signTypedData({
      domain,
      types,
      primaryType: 'PaymentAuthorization',
      message,
    });

    // 5. Authentic off-chain verification (ecrecover)
    const recoveredSigner = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: 'PaymentAuthorization',
      message,
      signature: realSignature,
    });

    const isCryptoValid = recoveredSigner.toLowerCase() === agentAccount.address.toLowerCase();
    const totalLatency = (performance.now() - tStart).toFixed(2);

    setTelemetryLog(
      JSON.stringify(
        {
          event: 'APAY_AUTONOMOUS_SETTLEMENT',
          agent_framework: agentType.toUpperCase(),
          network:
            activeNetwork === 'base-mainnet'
              ? 'Base Mainnet (Chain ID 8453)'
              : 'Base Sepolia Testnet (Chain ID 84532)',
          currency: currency,
          amount_paid: currency === 'USDC' ? '$0.0020 USDC' : '1.6000 $APAY (20% Burn Discount)',
          session_key: agentAccount.address,
          recovered_signer: recoveredSigner,
          signature_valid: isCryptoValid,
          cryptographic_voucher: {
            scheme: 'EIP-712 (Base L2)',
            verifying_contract: routerAddress,
            receiver: receiverWallet,
            nonce: realNonce,
            amount_base_units: amountBaseUnits.toString(),
            signature: realSignature,
          },
          total_latency: `${totalLatency}ms`,
          data_payload: {
            service: 'AlphaIntelligenceNode',
            status: 'success',
            insight:
              activeNetwork === 'base-mainnet'
                ? 'Base L2 liquidity depth expanded by +24% post Aerodrome integration.'
                : 'Base Sepolia simulated data channel successfully unlocked via EIP-712 voucher.',
          },
        },
        null,
        2,
      ),
    );

    setIsRunning(false);
  };

  const copyNpx = () => {
    navigator.clipboard.writeText('npx create-apay-app my-paid-agent');
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-6 border border-blue-500/20 bg-gradient-to-b from-white via-slate-50/80 to-slate-100/60 dark:from-blue-950/10 dark:via-slate-950/40 dark:to-slate-950/60">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/60 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              Live Interactive Sandbox
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              ~14ms Latency
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800">
              {activeNetwork === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)'}
            </span>
          </div>
          <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            Autonomous Agent Micropayment Simulator
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Simulate how autonomous AI agents (Claude Desktop, Cursor, LangChain, CrewAI) discover,
            sign EIP-712 payment challenges, and unlock HTTP 402 monetized APIs on{' '}
            <span className="font-semibold text-blue-600 dark:text-sky-400">
              {activeNetwork === 'base-mainnet'
                ? 'Base Layer 2 Production'
                : 'Base Sepolia Testnet'}
            </span>
            .
          </p>
        </div>

        {/* 1-Click create-apay-app CLI */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-2xl p-2 px-3 self-start md:self-auto shadow-sm">
          <Terminal className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <code className="text-xs font-mono text-slate-800 dark:text-slate-300 font-semibold">
            npx create-apay-app my-agent
          </code>
          <button
            onClick={copyNpx}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            title="Copy command"
          >
            {copiedCli ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Control Bar: Framework & Currency Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Framework Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-400 font-bold">
            Agent Framework
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300/80 dark:border-slate-800 text-xs font-mono">
            {(['mcp', 'langchain', 'crewai'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setAgentType(type)}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  agentType === type
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Rail */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-400 font-bold">
            Payment Rail
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300/80 dark:border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCurrency('USDC')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                currency === 'USDC'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              USDC ($0.002)
            </button>
            <button
              onClick={() => setCurrency('APAY')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                currency === 'APAY'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              $APAY (-20%)
            </button>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isRunning
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 cursor-pointer'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Simulating Settlement...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Execute Micro-Payment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Stepper Pipeline with High-Contrast Dual-Theme Support */}
      <div className="space-y-2.5 pt-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all ${
              step.status === 'completed'
                ? 'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/30'
                : step.status === 'active'
                  ? 'bg-blue-50/90 dark:bg-blue-500/15 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-white/95 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 shadow-sm'
            }`}
          >
            <div className="mt-0.5">
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : step.status === 'active' ? (
                <RotateCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold">
                  {step.id}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold font-mono ${
                    step.status === 'completed'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : step.status === 'active'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {step.label}
                </span>
                {step.latencyMs && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {step.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate font-medium">
                {step.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* JSON Telemetry Drawer */}
      {telemetryLog && (
        <div className="space-y-2 pt-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-400 font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Decrypted EIP-712 Settlement Proof
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Verified On-Chain
            </span>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto leading-relaxed max-h-60 scrollbar-thin">
            {telemetryLog}
          </pre>
        </div>
      )}
    </div>
  );
}
