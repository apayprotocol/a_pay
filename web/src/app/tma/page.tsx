'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPublicClient, formatEther, formatUnits, http, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { ApayBrandLogo } from '@/components/ApayBrandLogo';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { AgentVaultsTab } from '@/components/modules/AgentVaultsTab';
import { AiGuidelinesTab } from '@/components/modules/AiGuidelinesTab';
import { ApiKeysTab } from '@/components/modules/ApiKeysTab';
import { BlogTab } from '@/components/modules/BlogTab';
import { CommunityTab } from '@/components/modules/CommunityTab';
import { DocsTab } from '@/components/modules/DocsTab';
import { MarketplaceTab } from '@/components/modules/MarketplaceTab';
import { McpHubTab } from '@/components/modules/McpHubTab';
import { OverviewTab } from '@/components/modules/OverviewTab';
import { PaywallsTab } from '@/components/modules/PaywallsTab';
import { PlaygroundTab } from '@/components/modules/PlaygroundTab';
import { StakingTab } from '@/components/modules/StakingTab';
// Full Console Components
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

type TmaMiniTab =
  | 'faucet'
  | 'scanner'
  | 'playground'
  | 'stats'
  | 'paywall'
  | 'marketplace'
  | 'contracts';

const ERC20_ABI = parseAbi(['function balanceOf(address account) external view returns (uint256)']);

export default function TelegramMiniAppPage() {
  const { isAvailable, user, haptic, openTelegramLink, openLink } = useTelegramWebApp();

  // Mode: 'mini' (Quick Mobile Cards) or 'full' (Complete Web Dashboard Console)
  const [consoleMode, setConsoleMode] = useState<'mini' | 'full'>('mini');

  const [activeNetwork, setActiveNetwork] = useState<NetworkId>('base-mainnet');
  const [activeMiniTab, setActiveMiniTab] = useState<TmaMiniTab>('faucet');

  // Full Console Active Tab
  const [fullConsoleTab, setFullConsoleTab] = useState<string>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [apayBalance, setApayBalance] = useState<string>('0.00');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Temporary Session Burner Key (Zero-Wallet Instant Testing)
  const [sessionKey, setSessionKey] = useState<{ address: string; privateKey: string } | null>(
    null,
  );
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Faucet State
  const [faucetAddressInput, setFaucetAddressInput] = useState('');
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetResult, setFaucetResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
    explorerUrl?: string;
  } | null>(null);

  // Scanner State
  const [scanUrlInput, setScanUrlInput] = useState('techcrunch.com');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(0.5);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      haptic.selection();
      setTimeout(() => setCopiedKey(null), 2000);
    },
    [haptic],
  );

  // Fetch balances
  const loadBalances = useCallback(async (targetAddr: string, network: NetworkId) => {
    if (!targetAddr) return;
    setIsLoadingBalances(true);
    try {
      const isMainnet = network === 'base-mainnet';
      const client = createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http(isMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org', {
          timeout: 5000,
        }),
      });

      const contracts = getNetworkContracts(network);
      const [ethBal, apayBal] = await Promise.all([
        client.getBalance({ address: targetAddr as `0x${string}` }).catch(() => 0n),
        client
          .readContract({
            address: contracts.APAYToken.address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [targetAddr as `0x${string}`],
          })
          .catch(() => 0n),
      ]);

      setEthBalance(Number(formatEther(ethBal)).toFixed(4));
      setApayBalance(
        Number(formatUnits(apayBal, 18)).toLocaleString('en-US', {
          maximumFractionDigits: 2,
        }),
      );
    } catch (err) {
      console.warn('[TMA] Balance load error:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  useEffect(() => {
    const currentAddr = walletAddress || sessionKey?.address;
    if (currentAddr) {
      loadBalances(currentAddr, activeNetwork);
    }
  }, [walletAddress, sessionKey, activeNetwork, loadBalances]);

  // Generate Instant Test Session Key
  const handleGenerateSessionKey = () => {
    haptic.impact('medium');
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const privKey =
      '0x' +
      Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const addrBytes = new Uint8Array(20);
    crypto.getRandomValues(addrBytes);
    const mockAddr =
      '0x' +
      Array.from(addrBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    setSessionKey({ address: mockAddr, privateKey: privKey });
    setFaucetAddressInput(mockAddr);
    haptic.notification('success');
  };

  // Handle Faucet Claim
  const handleClaimFaucet = async () => {
    const target = faucetAddressInput.trim() || walletAddress || sessionKey?.address;
    if (!target) {
      haptic.notification('error');
      setFaucetResult({
        success: false,
        message: 'Please connect a wallet or enter an EVM 0x address.',
      });
      return;
    }

    setFaucetLoading(true);
    setFaucetResult(null);
    haptic.impact('light');

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: target, network: 'base-sepolia' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        setFaucetResult({
          success: true,
          message: '50.00 Testnet $APAY successfully sent on Base Sepolia!',
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
        });
        loadBalances(target, 'base-sepolia');
      } else {
        haptic.notification('warning');
        setFaucetResult({
          success: false,
          message: data.error || 'Faucet claim cooldown active or rate limited.',
        });
      }
    } catch {
      haptic.notification('error');
      setFaucetResult({
        success: false,
        message: 'Network request failed. Please verify connection and retry.',
      });
    } finally {
      setFaucetLoading(false);
    }
  };

  // Handle AI Crawler Scan
  const handleRunScan = async () => {
    if (!scanUrlInput.trim()) return;
    setScanLoading(true);
    setScanResult(null);
    haptic.impact('medium');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrlInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        setScanResult(data);
      } else {
        haptic.notification('error');
        setScanResult({
          error: data.error || 'Failed to analyze website. Verify the domain format.',
        });
      }
    } catch {
      haptic.notification('error');
      setScanResult({ error: 'Network probe timed out. Origin server unreachable.' });
    } finally {
      setScanLoading(false);
    }
  };

  const displayName = user?.first_name || user?.username || 'Builder';
  const contracts = getNetworkContracts(activeNetwork);
  const isFounder = Boolean(
    walletAddress && walletAddress.toLowerCase() === contracts.founder.toLowerCase(),
  );

  // Stripe vs A-Pay Math
  const stripeFee = Number((calcAmount * 0.029 + 0.3).toFixed(3));
  const stripePctLost = Math.min(100, Math.round((stripeFee / calcAmount) * 100));
  const apayFee = Number((calcAmount * 0.01 + 0.0001).toFixed(4));

  // ── FULL CONSOLE MODE RENDER ────────────────────────────────────────────────
  if (consoleMode === 'full') {
    return (
      <div className="h-screen flex bg-background text-foreground transition-colors duration-300 overflow-hidden flex-col">
        {/* Sticky Mobile Telegram Top Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-blue-500/30 px-3 py-2 flex items-center justify-between text-xs font-mono shrink-0 z-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-white font-medium">Full Web Console</span>
            <span className="text-[10px] text-slate-400 hidden xs:inline">
              ({activeNetwork === 'base-mainnet' ? 'Mainnet' : 'Sepolia'})
            </span>
          </div>
          <button
            onClick={() => {
              setConsoleMode('mini');
              haptic.selection();
            }}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 text-[11px] shadow-sm transition-all"
          >
            <span>📱</span>
            <span>Quick Mini View</span>
          </button>
        </div>

        {/* Console Container with Sidebar and Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <Sidebar
            activeTab={fullConsoleTab}
            setActiveTab={setFullConsoleTab}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            activeNetwork={activeNetwork}
            onNavigateToLanding={() => setConsoleMode('mini')}
          />

          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <TopBar
              activeTab={fullConsoleTab}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              walletAddress={walletAddress}
              connectWallet={() => setIsWalletModalOpen(true)}
              disconnectWallet={walletAddress ? () => setWalletAddress(null) : undefined}
              tokenBalance={apayBalance}
              isFounder={isFounder}
              activeNetwork={activeNetwork}
              onSelectNetwork={setActiveNetwork}
              onNavigateToLanding={() => setConsoleMode('mini')}
            />

            <div ref={mainScrollRef} className="flex-1 overflow-y-auto min-w-0 flex flex-col">
              <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                {fullConsoleTab === 'overview' && (
                  <OverviewTab
                    walletAddress={walletAddress}
                    tokenBalance={apayBalance}
                    isFounder={isFounder}
                    onConnect={() => setIsWalletModalOpen(true)}
                    activeNetwork={activeNetwork}
                  />
                )}
                {fullConsoleTab === 'marketplace' && (
                  <MarketplaceTab
                    walletAddress={walletAddress}
                    activeNetwork={activeNetwork}
                    onNavigateToTab={setFullConsoleTab}
                  />
                )}
                {fullConsoleTab === 'playground' && (
                  <PlaygroundTab
                    walletAddress={walletAddress}
                    activeNetwork={activeNetwork}
                    onNavigateToTab={setFullConsoleTab}
                  />
                )}
                {fullConsoleTab === 'mcphub' && (
                  <McpHubTab walletAddress={walletAddress} activeNetwork={activeNetwork} />
                )}
                {fullConsoleTab === 'paywalls' && (
                  <PaywallsTab
                    walletAddress={walletAddress}
                    onConnect={() => setIsWalletModalOpen(true)}
                    activeNetwork={activeNetwork}
                  />
                )}
                {fullConsoleTab === 'vaults' && (
                  <AgentVaultsTab
                    walletAddress={walletAddress}
                    activeNetwork={activeNetwork}
                    onConnect={() => setIsWalletModalOpen(true)}
                  />
                )}
                {fullConsoleTab === 'staking' && (
                  <StakingTab
                    walletAddress={walletAddress}
                    tokenBalance={apayBalance}
                    activeNetwork={activeNetwork}
                  />
                )}
                {fullConsoleTab === 'docs' && (
                  <DocsTab activeNetwork={activeNetwork} onNavigateToTab={setFullConsoleTab} />
                )}
                {fullConsoleTab === 'aiguidelines' && (
                  <AiGuidelinesTab
                    activeNetwork={activeNetwork}
                    onNavigateToTab={setFullConsoleTab}
                  />
                )}
                {fullConsoleTab === 'community' && (
                  <CommunityTab
                    walletAddress={walletAddress}
                    isFounder={isFounder}
                    onConnect={() => setIsWalletModalOpen(true)}
                    activeNetwork={activeNetwork}
                  />
                )}
                {fullConsoleTab === 'apikeys' && <ApiKeysTab walletAddress={walletAddress} />}
                {fullConsoleTab === 'blog' && (
                  <BlogTab activeNetwork={activeNetwork} onNavigateToTab={setFullConsoleTab} />
                )}
              </main>
            </div>
          </div>
        </div>

        <ConnectWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnected={async (addr) => {
            setWalletAddress(addr);
            setIsWalletModalOpen(false);
            haptic.notification('success');
            await loadBalances(addr, activeNetwork);
          }}
          activeNetwork={activeNetwork}
        />
      </div>
    );
  }

  // ── MINI VIEW MODE RENDER (FAST TOUCH CARDS) ────────────────────────────────
  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-20">
      {/* ── TOP HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#07080b]/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ApayBrandLogo size={30} animated={false} withGlow={true} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-spatial font-black text-white text-sm tracking-wider">
                A-PAY
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">
                TMA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
              Namaste, <span className="text-white font-medium">{displayName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Network Selector Badge */}
          <button
            onClick={() => {
              const nextNet = activeNetwork === 'base-mainnet' ? 'base-sepolia' : 'base-mainnet';
              setActiveNetwork(nextNet);
              haptic.selection();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors ${
              activeNetwork === 'base-mainnet'
                ? 'bg-blue-950/60 text-blue-400 border-blue-600/40 hover:border-blue-500'
                : 'bg-amber-950/60 text-amber-400 border-amber-600/40 hover:border-amber-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                activeNetwork === 'base-mainnet' ? 'bg-blue-400' : 'bg-amber-400'
              }`}
            />
            {activeNetwork === 'base-mainnet' ? 'Base 8453' : 'Sepolia'}
          </button>

          {/* Full Console Switcher — Highlighted Pro Button */}
          <button
            onClick={() => {
              setConsoleMode('full');
              haptic.selection();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white border border-blue-400/50 text-[11px] font-mono font-bold transition-all shadow-md shadow-blue-600/40 active:scale-95"
            title="Open complete A-Pay Web Dashboard inside Telegram"
          >
            <span className="text-sm">🌐</span>
            <span>Full Console</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold uppercase tracking-tight">
              12 Tabs
            </span>
          </button>
        </div>
      </header>

      {/* ── WALLET / SESSION CARD ────────────────────────────────────────────── */}
      <section className="px-3.5 pt-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/90 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {walletAddress
                ? 'Connected EVM Wallet'
                : sessionKey
                  ? '⚡ Instant Session Key'
                  : 'Account Status'}
            </span>
            {walletAddress ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Active
              </span>
            ) : sessionKey ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                Ephemeral
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Not Connected
              </span>
            )}
          </div>

          {walletAddress || sessionKey ? (
            <div>
              <div className="flex items-center justify-between mb-2.5 bg-black/40 p-2 rounded-xl border border-slate-800">
                <span className="text-xs font-mono text-slate-300 truncate max-w-[200px]">
                  {walletAddress || sessionKey?.address}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(walletAddress || sessionKey?.address || '', 'wallet')
                  }
                  className="text-xs text-blue-400 font-mono hover:text-blue-300 font-medium shrink-0 ml-2"
                >
                  {copiedKey === 'wallet' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              {/* Balances Grid */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">
                    $APAY Balance
                  </span>
                  <span className="text-base font-bold font-spatial text-white">
                    {isLoadingBalances ? '...' : apayBalance}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">
                    ETH Balance
                  </span>
                  <span className="text-base font-bold font-spatial text-white">
                    {isLoadingBalances ? '...' : ethBalance}
                  </span>
                </div>
              </div>

              {sessionKey && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Session Private Key:</span>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      {showPrivateKey ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  {showPrivateKey ? (
                    <div className="mt-1 bg-black/60 p-2 rounded text-[10px] break-all text-amber-300 border border-amber-500/20">
                      {sessionKey.privateKey}
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-500">••••••••••••••••••••••••••••••••••••</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your mobile Web3 wallet via Deep Link (MetaMask, OKX, Rainbow) or generate
                an instant session key to test A-Pay features inside Telegram!
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    haptic.selection();
                    setIsWalletModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs text-center shadow-md font-mono"
                >
                  🔗 Connect Wallet
                </button>
                <button
                  onClick={handleGenerateSessionKey}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-medium text-xs text-center font-mono"
                >
                  ⚡ Instant Session
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TMA NAVIGATION TABS ──────────────────────────────────────────────── */}
      <nav className="px-3.5 pt-3">
        <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveMiniTab('faucet');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'faucet'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💧 Faucet
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('playground');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'playground'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 Playground
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('scanner');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔍 Scanner
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('stats');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'stats'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Stats
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('paywall');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'paywall'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛍️ Paywall
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('marketplace');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'marketplace'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 Marketplace
          </button>
          <button
            onClick={() => {
              setActiveMiniTab('contracts');
              haptic.selection();
            }}
            className={`py-1.5 px-3 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-all ${
              activeMiniTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Base
          </button>
        </div>
      </nav>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────────── */}
      <main className="px-3.5 pt-3 flex-1">
        {/* ── TAB: FAUCET ── */}
        {activeMiniTab === 'faucet' && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-spatial font-bold text-white text-base">
                  💧 50 Testnet $APAY Faucet
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Base Sepolia (84532)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Claim 50 free testnet tokens directly into your wallet or session key to test
                autonomous AI micropayments. Cooldown: 6 hours.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400">
                Recipient Address (0x...):
              </label>
              <input
                type="text"
                value={faucetAddressInput}
                onChange={(e) => setFaucetAddressInput(e.target.value)}
                placeholder="0xYourBaseSepoliaAddress"
                className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              onClick={handleClaimFaucet}
              disabled={faucetLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-medium text-xs font-mono tracking-wider shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {faucetLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Dispensing On-Chain...
                </>
              ) : (
                '💧 Dispense 50 $APAY'
              )}
            </button>

            {faucetResult && (
              <div
                className={`p-3 rounded-xl text-xs font-mono border ${
                  faucetResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                <p className="font-semibold">
                  {faucetResult.success ? '✅ Success' : '⚠️ Faucet Notice'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed">{faucetResult.message}</p>
                {faucetResult.txHash && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-[10px] truncate max-w-[180px]">
                      {faucetResult.txHash}
                    </span>
                    <button
                      onClick={() =>
                        openLink(
                          faucetResult.explorerUrl ||
                            `https://sepolia.basescan.org/tx/${faucetResult.txHash}`,
                        )
                      }
                      className="text-sky-400 hover:underline text-[11px] font-bold"
                    >
                      BaseScan ↗
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PLAYGROUND (AI AGENT RUNNER) ── */}
        {activeMiniTab === 'playground' && (
          <div className="rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/30">
            <PlaygroundTab
              walletAddress={walletAddress || sessionKey?.address}
              activeNetwork={activeNetwork}
              onNavigateToTab={(tab) => {
                if (tab === 'faucet') setActiveMiniTab('faucet');
              }}
            />
          </div>
        )}

        {/* ── TAB: STATS & OVERVIEW ── */}
        {activeMiniTab === 'stats' && (
          <div className="rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/30">
            <OverviewTab
              walletAddress={walletAddress || sessionKey?.address || null}
              tokenBalance={apayBalance}
              isFounder={isFounder}
              onConnect={() => setIsWalletModalOpen(true)}
              activeNetwork={activeNetwork}
            />
          </div>
        )}

        {/* ── TAB: SCANNER ── */}
        {activeMiniTab === 'scanner' && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div>
              <h3 className="font-spatial font-bold text-white text-base">
                🔍 AI Bot Crawler Auditor
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Discover if OpenAI GPTBot, ClaudeBot, and Perplexity are scraping your website for
                free without compensating you.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={scanUrlInput}
                onChange={(e) => setScanUrlInput(e.target.value)}
                placeholder="domain.com"
                className="flex-1 bg-black/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleRunScan}
                disabled={scanLoading}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium shrink-0 disabled:opacity-50"
              >
                {scanLoading ? '...' : 'Scan'}
              </button>
            </div>

            {scanResult && !scanResult.error && (
              <div className="space-y-3 pt-1">
                <div
                  className={`p-3 rounded-xl border ${
                    scanResult.status === 'protected'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : scanResult.status === 'blocked'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <p className="font-bold text-xs">
                    {scanResult.status === 'protected'
                      ? '🛡️ Protected by A-Pay (HTTP 402 Active)'
                      : scanResult.status === 'blocked'
                        ? '⚠️ AI Bots Completely Blocked ($0 Earned)'
                        : '🚨 VULNERABLE: AI Bots Scraping for Free!'}
                  </p>
                  <p className="text-[11px] mt-1 text-slate-300">
                    Host: <span className="font-mono text-white">{scanResult.host}</span> • Drain:{' '}
                    {scanResult.estimatedLossMonthly}
                  </p>
                </div>

                {/* Bot Details */}
                <div className="bg-black/40 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  {Object.values(scanResult.bots || {}).map((bot: any) => (
                    <div key={bot.name} className="flex items-center justify-between">
                      <span className="text-slate-300">{bot.name}:</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          bot.status.includes('Monetized')
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : bot.status.includes('Blocked')
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {bot.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs">
                  <p className="text-blue-300 font-bold mb-1">Recommended Solution:</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                    {scanResult.recommendation}
                  </p>
                  <button
                    onClick={() => openLink('https://wordpress.org/plugins/apay-web3-ai-paywall/')}
                    className="text-xs text-sky-400 font-mono hover:underline font-bold"
                  >
                    🔌 1-Click WordPress.org Plugin ↗
                  </button>
                </div>
              </div>
            )}

            {scanResult?.error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 font-mono">
                {scanResult.error}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PAYWALL & CHECKOUT ── */}
        {activeMiniTab === 'paywall' && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div>
              <h3 className="font-spatial font-bold text-white text-base">
                ⚖️ Stripe vs A-Pay Economics
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Slide the transaction price to see how Stripe&apos;s $0.30 fixed fee destroys
                micro-billing margins compared to A-Pay on Base L2.
              </p>
            </div>

            {/* Slider */}
            <div className="bg-black/40 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Micro-Transaction Price:</span>
                <span className="text-base font-bold font-spatial text-white">
                  ${calcAmount.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="5.00"
                step="0.05"
                value={calcAmount}
                onChange={(e) => {
                  setCalcAmount(Number.parseFloat(e.target.value));
                  haptic.selection();
                }}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>$0.10 (Micro-Query)</span>
                <span>$2.50</span>
                <span>$5.00 (API Pack)</span>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                <span className="text-rose-400 font-bold block">🔴 Traditional Stripe</span>
                <span className="text-xs text-slate-300">Fee: ${stripeFee.toFixed(3)}</span>
                <div className="pt-1">
                  <span className="text-lg font-spatial font-bold text-rose-300">
                    -{stripePctLost}%
                  </span>
                  <p className="text-[10px] text-slate-400">Lost to fees & delays</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-400 font-bold block">🟢 A-Pay (Base L2)</span>
                <span className="text-xs text-slate-300">Fee: ${apayFee.toFixed(4)}</span>
                <div className="pt-1">
                  <span className="text-lg font-spatial font-bold text-emerald-300">99% Keep</span>
                  <p className="text-[10px] text-slate-400">Instant finality, 0 hold</p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => openLink('https://apayprotocol.org/checkout-demo')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-medium text-center shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                🛍️ Open Full Checkout Demo Store ↗
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: MARKETPLACE ── */}
        {activeMiniTab === 'marketplace' && (
          <div className="rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/30">
            <MarketplaceTab
              walletAddress={walletAddress || sessionKey?.address}
              activeNetwork={activeNetwork}
              onNavigateToTab={(tab) => {
                if (tab === 'playground') setActiveMiniTab('playground');
              }}
            />
          </div>
        )}

        {/* ── TAB: ON-CHAIN BASE CONTRACTS ── */}
        {activeMiniTab === 'contracts' && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-spatial font-bold text-white text-base">
                  📜 Verified Base Contracts
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Chain ID: 8453
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Fixed Supply: 100M $APAY (Zero Inflation) • Basename: apayprotocol.base.eth
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between">
                <div className="truncate max-w-[210px]">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    $APAY Token (ERC-20)
                  </span>
                  <span className="text-white text-xs">{contracts.APAYToken.address}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(contracts.APAYToken.address, 'token_addr')}
                  className="text-blue-400 hover:text-blue-300 text-[11px] ml-2"
                >
                  {copiedKey === 'token_addr' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between">
                <div className="truncate max-w-[210px]">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    EscrowVault (Session Keys)
                  </span>
                  <span className="text-white text-xs">{contracts.EscrowVault.address}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(contracts.EscrowVault.address, 'vault_addr')}
                  className="text-blue-400 hover:text-blue-300 text-[11px] ml-2"
                >
                  {copiedKey === 'vault_addr' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between">
                <div className="truncate max-w-[210px]">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    APayRouterV2 Enterprise
                  </span>
                  <span className="text-white text-xs">{contracts.APayRouterV2.address}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(contracts.APayRouterV2.address, 'router_addr')}
                  className="text-blue-400 hover:text-blue-300 text-[11px] ml-2"
                >
                  {copiedKey === 'router_addr' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between">
                <div className="truncate max-w-[210px]">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    StakingVault (Anti-Spam)
                  </span>
                  <span className="text-white text-xs">{contracts.StakingVault.address}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(contracts.StakingVault.address, 'staking_addr')}
                  className="text-blue-400 hover:text-blue-300 text-[11px] ml-2"
                >
                  {copiedKey === 'staking_addr' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() =>
                  openLink(`https://basescan.org/token/${contracts.APAYToken.address}`)
                }
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-blue-500/30 text-blue-400 font-mono text-xs font-medium hover:border-blue-400 text-center"
              >
                🔍 View $APAY on BaseScan Explorer ↗
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM STICKY ACTION BAR ────────────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#07080b]/95 backdrop-blur-lg border-t border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => openTelegramLink('https://t.me/apay_protocol')}
          className="flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300"
        >
          <span>💬</span>
          <span className="font-semibold">Join Live Chat</span>
        </button>

        <button
          onClick={() => {
            setConsoleMode('full');
            haptic.selection();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 hover:from-blue-800/50 hover:to-indigo-800/50 text-sky-300 border border-blue-500/40 hover:border-blue-400 text-xs font-mono font-semibold transition-all shadow-sm"
        >
          <span>🌐</span>
          <span>Full Console (12 Tabs) ↗</span>
        </button>
      </footer>

      {/* ── WALLET CONNECT MODAL ────────────────────────────────────────────── */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnected={async (addr) => {
          setWalletAddress(addr);
          setFaucetAddressInput(addr);
          setIsWalletModalOpen(false);
          haptic.notification('success');
          await loadBalances(addr, activeNetwork);
        }}
        activeNetwork={activeNetwork}
      />
    </div>
  );
}
