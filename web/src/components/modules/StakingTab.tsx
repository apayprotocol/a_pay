'use client';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  History,
  Lock,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import {
  type DisputeTelemetry,
  ensureNetwork,
  fetchLiveDisputes,
  fetchLiveStakingState,
  fetchLiveTokenStats,
  type LiveDisputeRecord,
  type LiveStakingState,
  type LiveTokenStats,
} from '@/services/blockchain';

export function StakingTab({
  tokenBalance,
  walletAddress,
  activeNetwork = 'base-sepolia',
}: {
  tokenBalance: string;
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
}) {
  const contracts = getNetworkContracts(activeNetwork);
  const chainConfig = contracts.chain;

  const [liveTokenStats, setLiveTokenStats] = useState<LiveTokenStats | null>(null);
  const [stakingState, setStakingState] = useState<LiveStakingState | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingStatus, setStakingStatus] = useState<string | null>(null);
  const [customStakeAmount, setCustomStakeAmount] = useState('500');

  // Dispute & Slashing Telemetry State
  const [disputeStats, setDisputeStats] = useState<DisputeTelemetry | null>(null);
  const [disputes, setDisputes] = useState<LiveDisputeRecord[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);

  // Dispute form state
  const [targetAgent, setTargetAgent] = useState('');
  const [challengerAddress, setChallengerAddress] = useState(walletAddress || '');
  const [disputeCategory, setDisputeCategory] = useState<
    'CORRUPTED_PAYLOAD' | 'SLA_TIMEOUT' | 'INVALID_SIGNATURE' | 'DOUBLE_SPEND' | 'MALFORMED_SPEC'
  >('CORRUPTED_PAYLOAD');
  const [slashAmountApay, setSlashAmountApay] = useState('100');
  const [disputeReason, setDisputeReason] = useState(
    'Corrupted payload SHA-256 hash mismatch on /v1/market-alpha',
  );
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeResult, setDisputeResult] = useState<{
    success: boolean;
    message: string;
    dispute: LiveDisputeRecord;
  } | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      setChallengerAddress(walletAddress);
    }
  }, [walletAddress]);

  const loadDisputes = React.useCallback(async () => {
    setLoadingDisputes(true);
    try {
      const res = await fetchLiveDisputes(activeNetwork);
      setDisputeStats(res.stats);
      setDisputes(res.disputes);
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoadingDisputes(false);
    }
  }, [activeNetwork]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleSelectSampleAgent = (
    agent: string,
    reason: string,
    cat:
      | 'CORRUPTED_PAYLOAD'
      | 'SLA_TIMEOUT'
      | 'INVALID_SIGNATURE'
      | 'DOUBLE_SPEND'
      | 'MALFORMED_SPEC',
  ) => {
    setTargetAgent(agent);
    setDisputeReason(reason);
    setDisputeCategory(cat);
  };

  const handleSubmitDispute = async () => {
    setIsSubmittingDispute(true);
    setDisputeResult(null);
    setDisputeError(null);
    try {
      const res = await fetch('/api/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: targetAgent,
          challengerAddress: challengerAddress,
          slashedAmountApay: Number(slashAmountApay) || 100,
          reason: disputeReason,
          category: disputeCategory,
          network: activeNetwork,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit dispute');
      }
      setDisputeResult(data);
      await loadDisputes();
      await loadStaking();
    } catch (err: any) {
      setDisputeError(err?.message || 'Dispute execution failed.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const loadStaking = React.useCallback(async () => {
    try {
      const state = await fetchLiveStakingState(
        (walletAddress as `0x${string}` | undefined) || undefined,
        activeNetwork,
      );
      setStakingState(state);
    } catch (err) {
      console.error('Failed to load staking state:', err);
    }
  }, [walletAddress, activeNetwork]);

  useEffect(() => {
    fetchLiveTokenStats(activeNetwork).then(setLiveTokenStats).catch(console.error);
    loadStaking();
  }, [loadStaking, activeNetwork]);

  const handleStakeBond = async (amountTokens = 500) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setStakingStatus('Please connect MetaMask or Coinbase Wallet.');
      return;
    }
    if (!walletAddress) {
      setStakingStatus('Please connect your wallet first.');
      return;
    }

    setIsStaking(true);
    try {
      const eth = (window as any).ethereum;
      // Ensure wallet is on the active network before sending transactions
      await ensureNetwork(eth, activeNetwork);

      const cleanUser = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const cleanVault = contracts.StakingVault.address
        .toLowerCase()
        .replace(/^0x/, '')
        .padStart(64, '0');
      const amountWei = BigInt(amountTokens) * BigInt(10 ** 18);
      const amountHex = amountWei.toString(16).padStart(64, '0');

      // 1. Approve StakingVault to pull APAY tokens
      setStakingStatus(`Step 1/2: Approving StakingVault to deposit ${amountTokens} $APAY...`);
      const approveCalldata = `0x095ea7b3${cleanVault}${amountHex}`;
      await eth.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contracts.APAYToken.address,
            data: approveCalldata,
          },
        ],
      });

      // 2. Call StakingVault.stake(address agent, uint256 amount)
      setStakingStatus(`Step 2/2: Staking ${amountTokens} $APAY into StakingVault.sol...`);
      const stakeCalldata = `0xadc9772e${cleanUser}${amountHex}`;
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contracts.StakingVault.address,
            data: stakeCalldata,
          },
        ],
      });

      setStakingStatus(`✅ Staked successfully! Tx: ${txHash.slice(0, 14)}...`);
      setTimeout(() => {
        loadStaking();
      }, 5000);
    } catch (err: any) {
      setStakingStatus(`Failed: ${err?.message || 'Transaction rejected'}`);
    } finally {
      setIsStaking(false);
    }
  };

  const allocation = [
    {
      label: 'Ecosystem, Staking & Agent Mining',
      pct: '40.0%',
      amount: '40,000,000 APAY',
      color: 'bg-blue-500',
    },
    {
      label: 'Protocol Treasury (R&D / Grants)',
      pct: '25.0%',
      amount: '25,000,000 APAY',
      color: 'bg-sky-500',
    },
    {
      label: 'Founders & Core Swarm (Vesting)',
      pct: '20.0%',
      amount: '20,000,000 APAY',
      color: 'bg-indigo-500',
    },
    {
      label: 'Public DEX Liquidity (Aerodrome)',
      pct: '15.0%',
      amount: '15,000,000 APAY',
      color: 'bg-emerald-500',
    },
  ];

  const numericBal = Number(tokenBalance.replace(/,/g, '')) || 0;

  const currentTierInfo =
    numericBal >= 200000
      ? {
          name: 'Tier 3 (VIP 80% OFF)',
          fee: '0.20%',
          color:
            'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
        }
      : numericBal >= 50000
        ? {
            name: 'Tier 2 (50% OFF)',
            fee: '0.50%',
            color:
              'text-blue-500 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800',
          }
        : numericBal >= 10000
          ? {
              name: 'Tier 1 (25% OFF)',
              fee: '0.75%',
              color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800',
            }
          : {
              name: 'Standard (No Discount)',
              fee: '1.00%',
              color:
                'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
            };

  const tiers = [
    {
      tier: 'Tier 1',
      holding: '10,000 $APAY',
      threshold: 10000,
      discount: '25% Discount',
      netFee: '0.75%',
      unlocked: numericBal >= 10000,
    },
    {
      tier: 'Tier 2',
      holding: '50,000 $APAY',
      threshold: 50000,
      discount: '50% Discount',
      netFee: '0.50%',
      unlocked: numericBal >= 50000,
    },
    {
      tier: 'Tier 3 (VIP)',
      holding: '200,000 $APAY',
      threshold: 200000,
      discount: '80% Discount',
      netFee: '0.20%',
      unlocked: numericBal >= 200000,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="font-spatial text-3xl font-black text-slate-900 dark:text-white">
          $APAY Tokenomics & Staking Hub
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Deflationary value-capture flywheel funded by 30% of global transaction protocol fees.
        </p>
      </div>

      {/* Flywheel Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow border-l-4 border-l-amber-500 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white">
              The Deflationary Burn Engine (30% Protocol Revenue)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For every 1.0% protocol fee collected in USDC, 30% automatically routes to Aerodrome
              DEX to market-buy $APAY and trigger on-chain burn().
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Initial Fixed Supply
            </span>
            <span className="font-spatial text-xl font-bold text-slate-900 dark:text-white">
              100,000,000
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Live Circulating Supply
            </span>
            <span className="font-spatial text-xl font-bold text-blue-600 dark:text-sky-400">
              {liveTokenStats ? liveTokenStats.totalSupply : '100,000,000'}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Total Burned to Date
            </span>
            <span className="font-spatial text-xl font-bold text-amber-500 flex items-center gap-1">
              {liveTokenStats ? liveTokenStats.burnedTokens : '0.00'}{' '}
              <Flame className="w-4 h-4 text-amber-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Token Distribution Matrix */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-blue-600 dark:text-sky-400" />
          Token Allocation Matrix (Hard Cap: 100M on Base L2)
        </h3>

        {/* Progress Bar Visual */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div style={{ width: '40%' }} className="bg-blue-500 h-full" title="Ecosystem 40%" />
          <div style={{ width: '25%' }} className="bg-sky-500 h-full" title="Treasury 25%" />
          <div style={{ width: '20%' }} className="bg-indigo-500 h-full" title="Founders 20%" />
          <div
            style={{ width: '15%' }}
            className="bg-emerald-500 h-full"
            title="DEX Liquidity 15%"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {allocation.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {item.pct}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-tight">
                {item.label}
              </div>
              <div className="text-[11px] font-mono text-slate-500">{item.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Discount Tiers (Dynamic based on connected wallet balance) */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Merchant & Agent Fee Discount Tiers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hold $APAY in your connected wallet to permanently lower gateway protocol fees.
            </p>
          </div>
          <span
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${currentTierInfo.color}`}
          >
            Your Active Tier: {currentTierInfo.name} ({currentTierInfo.fee} Fee)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((t, i) => {
            const progressPct = Math.min(100, Math.round((numericBal / t.threshold) * 100));

            return (
              <div
                key={i}
                className={`p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 transition-all space-y-3 relative ${
                  t.unlocked
                    ? 'border-emerald-500/60 dark:border-emerald-500/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-spatial font-bold text-sm text-slate-900 dark:text-white">
                    {t.tier}
                  </span>
                  {t.unlocked ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      LOCKED
                    </span>
                  )}
                </div>

                <div
                  className={`text-xl font-black font-spatial ${
                    t.unlocked
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.discount}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  Required: <span className="font-bold">{t.holding}</span>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Net Gateway Fee:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{t.netFee}</span>
                </div>

                {/* Progress bar towards this tier */}
                {!t.unlocked && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Progress</span>
                      <span>
                        {numericBal.toLocaleString()} / {t.holding} ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive AI Agent Staking & Anti-Spam Collateral Vault (Pillar 3.4) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow border border-blue-500/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                AI Agent Collateral & Slashing Staking Vault
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 font-bold">
                  StakingVault.sol
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stake $APAY bond to register AI agent APIs in the Global Directory. Malicious
                payloads trigger automated 50% burn + 50% challenger bounty.
              </p>
            </div>
          </div>
          <button
            onClick={loadStaking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Staking</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Active Staked Collateral
            </span>
            <span className="font-spatial text-2xl font-bold text-blue-600 dark:text-sky-400">
              {stakingState ? stakingState.stakedApay : '0'} $APAY
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Required Collateral Bond
            </span>
            <span className="font-spatial text-2xl font-bold text-slate-900 dark:text-white">
              {stakingState ? stakingState.minBondApay : '500'} $APAY
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Bond Verification Status
            </span>
            {stakingState?.isBonded ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" /> Bonded Provider (Verified)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" /> Unbonded (&lt; 500 APAY)
              </span>
            )}
          </div>
        </div>

        {/* Stake Actions */}
        <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={customStakeAmount}
                onChange={(e) => setCustomStakeAmount(e.target.value)}
                min="100"
                step="50"
                className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white"
                placeholder="500"
              />
              <span className="text-xs font-mono font-bold text-slate-500">$APAY</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStakeBond(Number(customStakeAmount) || 500)}
                disabled={isStaking || !walletAddress}
                className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Send className={`w-3.5 h-3.5 ${isStaking ? 'animate-spin' : ''}`} />
                <span>{isStaking ? 'Staking...' : 'Stake Collateral Bond'}</span>
              </button>
            </div>
          </div>

          {stakingStatus && (
            <div className="text-xs font-mono p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-sky-300">
              {stakingStatus}
            </div>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
            <span>
              Contract:{' '}
              <a
                href={`${chainConfig.explorerUrl}/address/${contracts.StakingVault.address}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                {contracts.StakingVault.address.slice(0, 8)}...
                {contracts.StakingVault.address.slice(-6)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
            <span>Unbonding Cooldown: 24 Hours</span>
          </div>
        </div>
      </div>

      {/* Interactive Challenger Dispute & Slashing Portal (Pillar 3.4 Game Theory) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow border border-rose-500/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Challenger Dispute &amp; Anti-Spam Slashing Portal
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold">
                  Pillar 3.4 Economic Security
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Challenge malicious AI agent outputs, SLA breaches, or voucher replay attacks. Valid
                challenges slash the offending agent&apos;s stake: 50% paid to challenger as
                immediate bounty refund, and 50% permanently burned.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDisputes}
            disabled={loadingDisputes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingDisputes ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Quick-Select Sample Offending Agents */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block">
            Select Test Provider or Enter Custom Address:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleSelectSampleAgent(
                  '0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C',
                  'Corrupted payload SHA-256 hash mismatch on /v1/market-alpha',
                  'CORRUPTED_PAYLOAD',
                )
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-400 font-mono transition-all text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Corrupted Market Agent (0x79A8...)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSelectSampleAgent(
                  '0x96C347AcA81843d3fEA4548708A2453ceaA57a1a',
                  'SLA breach: response latency exceeded 30,000ms threshold (HTTP 504)',
                  'SLA_TIMEOUT',
                )
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-400 font-mono transition-all text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="w-3 h-3 text-blue-500" />
              <span>Latency SLA Breach (0x96C3...)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSelectSampleAgent(
                  '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF',
                  'Repeated double-spend voucher replay attack detected',
                  'DOUBLE_SPEND',
                )
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-400 font-mono transition-all text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Replay Attack Agent (0x3E35...)</span>
            </button>
          </div>
        </div>

        {/* Dispute Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Offending Agent Address (0x...)
            </label>
            <input
              type="text"
              value={targetAgent}
              onChange={(e) => setTargetAgent(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Challenger Address (Reward Beneficiary)
            </label>
            <input
              type="text"
              value={challengerAddress}
              onChange={(e) => setChallengerAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Dispute Category / Violation Type
            </label>
            <select
              value={disputeCategory}
              onChange={(e) => setDisputeCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
            >
              <option value="CORRUPTED_PAYLOAD">Corrupted Payload (SHA-256 Mismatch)</option>
              <option value="SLA_TIMEOUT">SLA Timeout (&gt; 30s / HTTP 504)</option>
              <option value="DOUBLE_SPEND">Voucher Replay / Double Spend</option>
              <option value="INVALID_SIGNATURE">Invalid Cryptographic Signature</option>
              <option value="MALFORMED_SPEC">Malformed HTTP 402 Specification</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Amount to Slash ($APAY)
            </label>
            <input
              type="number"
              value={slashAmountApay}
              onChange={(e) => setSlashAmountApay(e.target.value)}
              min="10"
              step="10"
              placeholder="100"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Dispute Reason &amp; Cryptographic Proof String
            </label>
            <input
              type="text"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. SHA-256 payload mismatch or HTTP 504 trace"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Economic Game Theory Split Visualizer */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Economic Slashing Breakdown:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {Number(slashAmountApay) || 100} $APAY Total Slash
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400 block font-bold">
                50% Challenger Bounty (Refund)
              </span>
              <span className="font-spatial text-lg font-bold text-emerald-700 dark:text-emerald-300">
                +{(Number(slashAmountApay) || 100) / 2} $APAY
              </span>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Sent directly to challenger wallet as reward.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
              <span className="text-[10px] uppercase font-mono text-rose-600 dark:text-rose-400 block font-bold">
                50% Permanent Deflationary Burn
              </span>
              <span className="font-spatial text-lg font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                -{(Number(slashAmountApay) || 100) / 2} $APAY{' '}
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              </span>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                Destroyed on-chain via APAYToken.burn().
              </p>
            </div>
          </div>
        </div>

        {/* Action Button & Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Active Network:{' '}
            <span className="font-bold text-blue-600 dark:text-sky-400">
              {chainConfig.chainName} ({chainConfig.chainId})
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmitDispute}
            disabled={isSubmittingDispute || !targetAgent || !challengerAddress}
            className="py-3 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ShieldAlert className={`w-4 h-4 ${isSubmittingDispute ? 'animate-spin' : ''}`} />
            <span>
              {isSubmittingDispute ? 'Verifying & Slashing...' : 'Submit Slashing Challenge'}
            </span>
          </button>
        </div>

        {/* Success or Error Feedback */}
        {disputeResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Slashing Challenge Successfully Executed!</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
              {disputeResult.message}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
              <span className="text-slate-600 dark:text-slate-400">Tx Hash:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {disputeResult.dispute.txHash.slice(0, 16)}...
                {disputeResult.dispute.txHash.slice(-8)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(disputeResult.dispute.txHash)}
                className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTx === disputeResult.dispute.txHash ? 'Copied!' : 'Copy'}</span>
              </button>
              <a
                href={disputeResult.dispute.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {disputeError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{disputeError}</span>
          </div>
        )}
      </div>

      {/* Live Slashing & Bounty Activity Feed (Pillar 3.4 Telemetry) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Slashing &amp; Challenger Bounty Feed
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                  On-Chain Verified
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent real-time audit trail of all penalized AI agents and distributed
                challenger bounties.
              </p>
            </div>
          </div>
        </div>

        {/* Global Dispute Telemetry Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Total Slashed
            </span>
            <span className="font-spatial text-xl font-bold text-rose-600 dark:text-rose-400">
              {disputeStats ? disputeStats.totalSlashedApay.toLocaleString() : '1,850'} $APAY
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Bounties Paid
            </span>
            <span className="font-spatial text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {disputeStats ? disputeStats.totalBountiesPaidApay.toLocaleString() : '925'} $APAY
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Burned Forever
            </span>
            <span className="font-spatial text-xl font-bold text-amber-500 flex items-center gap-1">
              {disputeStats ? disputeStats.totalBurnedApay.toLocaleString() : '925'}{' '}
              <Flame className="w-4 h-4 text-amber-500" />
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Disputes Succeeded
            </span>
            <span className="font-spatial text-xl font-bold text-slate-900 dark:text-white">
              {disputeStats ? disputeStats.disputeCount : disputes.length}
            </span>
          </div>
        </div>

        {/* Dispute Events List */}
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              No dispute records found for the selected network.
            </div>
          ) : (
            disputes.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/90 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{item.slashedAmountApay} $APAY
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                      {item.network}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Offending Agent:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate block">
                      {item.agentAddress}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase">Challenger:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold truncate block">
                      {item.challengerAddress}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  Reason: &ldquo;{item.reason}&rdquo;
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Bounty: +{item.challengerBountyApay} $APAY
                    </span>
                    <span className="text-rose-500 font-bold">
                      Burned: -{item.burnedApay} $APAY
                    </span>
                  </div>

                  <a
                    href={item.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Tx: {item.txHash.slice(0, 10)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
