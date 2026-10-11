'use client';

import React, { useEffect, useState } from 'react';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { LandingPage } from '@/components/landing/LandingPage';
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
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { CONTRACTS, getNetworkContracts, NETWORKS, type NetworkId } from '@/config/contracts';
import { fetchLiveWalletBalances } from '@/services/blockchain';

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<'landing' | 'console'>('landing');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeNetwork, setActiveNetwork] = useState<NetworkId>('base-mainnet');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Hydrate active network and tab preference from client storage / URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apay_active_network') as NetworkId | null;
      if (saved && (saved === 'base-sepolia' || saved === 'base-mainnet')) {
        setActiveNetwork(saved);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const viewParam = urlParams.get('view');
      if (tabParam) {
        setActiveTab(tabParam);
        setViewMode('console');
      } else if (viewParam === 'console') {
        setViewMode('console');
      } else if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          setActiveTab(hash);
          setViewMode('console');
        }
      }
    }
  }, []);

  const activeNetworkRef = React.useRef(activeNetwork);
  activeNetworkRef.current = activeNetwork;

  const contracts = getNetworkContracts(activeNetwork);
  const isFounder = Boolean(
    walletAddress && walletAddress.toLowerCase() === contracts.founder.toLowerCase(),
  );

  const fetchLiveBalance = React.useCallback(async (addr: string, net: NetworkId) => {
    try {
      const bal = await fetchLiveWalletBalances(addr as `0x${string}`, net);
      setTokenBalance(bal.apay);
    } catch {
      const netContracts = getNetworkContracts(net);
      const isFounderWallet = addr.toLowerCase() === netContracts.founder.toLowerCase();
      setTokenBalance(isFounderWallet ? '100,000,000' : '0');
    }
  }, []);

  // Synchronize live wallet balances immediately whenever activeNetwork or walletAddress changes
  useEffect(() => {
    if (walletAddress) {
      fetchLiveBalance(walletAddress, activeNetwork);
    }
  }, [walletAddress, activeNetwork, fetchLiveBalance]);

  const handleNetworkChange = (newNet: NetworkId) => {
    setActiveNetwork(newNet);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apay_active_network', newNet);
    }
    if (walletAddress) {
      fetchLiveBalance(walletAddress, newNet);
    }
  };

  // Prevent concurrent / redundant session checks and listener thrashing
  const isCheckingSessionRef = React.useRef(false);
  const lastSessionCheckTimeRef = React.useRef(0);

  // Active session check function (verifies accounts authorized under EIP-1193)
  const checkWalletSession = React.useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setWalletAddress((prev) => {
        if (prev !== null) {
          setTokenBalance('0');
          return null;
        }
        return prev;
      });
      return;
    }

    if (isCheckingSessionRef.current) return;
    isCheckingSessionRef.current = true;

    try {
      const eth = (window as any).ethereum;
      eth?.setMaxListeners?.(100);
      eth?._events?.setMaxListeners?.(100);

      // Check if user manually disconnected previously in this browser session
      const isManuallyDisconnected =
        typeof window !== 'undefined' && localStorage.getItem('apay_manual_disconnect') === 'true';
      if (isManuallyDisconnected) {
        setWalletAddress((prev) => {
          if (prev !== null) {
            setTokenBalance('0');
            return null;
          }
          return prev;
        });
        return;
      }

      // Query eth_accounts non-intrusively (Standard EIP-1193)
      const accounts: string[] = await eth.request({ method: 'eth_accounts' });

      if (accounts && Array.isArray(accounts) && accounts.length > 0 && accounts[0]) {
        const activeAddr = accounts[0];
        setWalletAddress(activeAddr);
        fetchLiveBalance(activeAddr, activeNetworkRef.current);
      } else {
        // Locked, logged out, or not authorized
        setWalletAddress((prev) => {
          if (prev !== null) {
            setTokenBalance('0');
            return null;
          }
          return prev;
        });
      }
    } catch {
      setWalletAddress((prev) => {
        if (prev !== null) {
          setTokenBalance('0');
          return null;
        }
        return prev;
      });
    } finally {
      isCheckingSessionRef.current = false;
    }
  }, [fetchLiveBalance]);

  const checkWalletSessionRef = React.useRef(checkWalletSession);
  checkWalletSessionRef.current = checkWalletSession;

  const fetchLiveBalanceRef = React.useRef(fetchLiveBalance);
  fetchLiveBalanceRef.current = fetchLiveBalance;

  const handleNetworkChangeRef = React.useRef(handleNetworkChange);
  handleNetworkChangeRef.current = handleNetworkChange;

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    // Set listener cap to prevent MetaMask multiplex warnings
    eth?.setMaxListeners?.(100);
    eth?._events?.setMaxListeners?.(100);

    // Verify session once on initial mount
    checkWalletSessionRef.current();

    // Listen for accountsChanged (fired when user unlocks, locks, switches account, or disconnects)
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0 && accounts[0]) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('apay_manual_disconnect');
        }
        setWalletAddress(accounts[0]);
        fetchLiveBalanceRef.current(accounts[0], activeNetworkRef.current);
      } else {
        // User locked MetaMask or disconnected
        setWalletAddress(null);
        setTokenBalance('0');
      }
    };

    // Listen for network / chain changes
    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      if (chainId === 8453) {
        handleNetworkChangeRef.current('base-mainnet');
      } else if (chainId === 84532) {
        handleNetworkChangeRef.current('base-sepolia');
      }
    };

    // Re-verify session when user returns to tab/window with throttle (at most once every 3s)
    const handleVisibilityOrFocus = () => {
      const now = Date.now();
      if (now - lastSessionCheckTimeRef.current < 3000) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        lastSessionCheckTimeRef.current = now;
        checkWalletSessionRef.current();
      }
    };

    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (eth.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      } else if (eth.off) {
        eth.off('accountsChanged', handleAccountsChanged);
        eth.off('chainChanged', handleChainChanged);
      }
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const handleConnectWallet = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apay_manual_disconnect');
    }
    setIsModalOpen(true);
  };

  const handleWalletConnected = async (addr: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apay_manual_disconnect');
    }
    setWalletAddress(addr);
    setViewMode('console');
    await fetchLiveBalance(addr, activeNetwork);
  };

  const handleDisconnectWallet = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apay_manual_disconnect', 'true');
    }
    setWalletAddress(null);
    setTokenBalance('0');
    setViewMode('landing');
  };

  const handleEnterConsole = (targetTab?: string) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setViewMode('console');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateToLanding = () => {
    setViewMode('landing');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <LandingPage
          walletAddress={walletAddress}
          onConnectWallet={handleConnectWallet}
          onEnterConsole={handleEnterConsole}
          activeNetwork={activeNetwork}
          onSelectNetwork={handleNetworkChange}
        />

        {/* Global Wallet Connect Modal (Available from Landing Page) */}
        <ConnectWalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConnected={handleWalletConnected}
          activeNetwork={activeNetwork}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* High-Tech Left Sidebar (Desktop Fixed + Mobile Slide-over Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        activeNetwork={activeNetwork}
        onNavigateToLanding={handleNavigateToLanding}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar with Dynamic Breadcrumbs, Base L2 Network Switcher, ThemeToggle & Wallet */}
        <TopBar
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          walletAddress={walletAddress}
          connectWallet={handleConnectWallet}
          disconnectWallet={walletAddress ? handleDisconnectWallet : undefined}
          tokenBalance={tokenBalance}
          isFounder={isFounder}
          activeNetwork={activeNetwork}
          onSelectNetwork={handleNetworkChange}
          onNavigateToLanding={handleNavigateToLanding}
        />

        {/* Dynamic Tab Views */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'overview' && (
            <OverviewTab
              walletAddress={walletAddress}
              tokenBalance={tokenBalance}
              isFounder={isFounder}
              onConnect={handleConnectWallet}
              activeNetwork={activeNetwork}
            />
          )}
          {activeTab === 'marketplace' && (
            <MarketplaceTab
              walletAddress={walletAddress}
              activeNetwork={activeNetwork}
              onNavigateToTab={setActiveTab}
            />
          )}
          {activeTab === 'playground' && (
            <PlaygroundTab
              walletAddress={walletAddress}
              activeNetwork={activeNetwork}
              onNavigateToTab={setActiveTab}
            />
          )}
          {activeTab === 'mcphub' && (
            <McpHubTab walletAddress={walletAddress} activeNetwork={activeNetwork} />
          )}
          {activeTab === 'paywalls' && (
            <PaywallsTab
              walletAddress={walletAddress}
              onConnect={handleConnectWallet}
              activeNetwork={activeNetwork}
            />
          )}
          {activeTab === 'docs' && (
            <DocsTab activeNetwork={activeNetwork} onNavigateToTab={setActiveTab} />
          )}
          {activeTab === 'apikeys' && (
            <ApiKeysTab walletAddress={walletAddress} activeNetwork={activeNetwork} />
          )}
          {activeTab === 'vaults' && (
            <AgentVaultsTab
              walletAddress={walletAddress}
              activeNetwork={activeNetwork}
              onConnect={handleConnectWallet}
            />
          )}
          {activeTab === 'staking' && (
            <StakingTab
              tokenBalance={tokenBalance}
              walletAddress={walletAddress}
              activeNetwork={activeNetwork}
            />
          )}
          {activeTab === 'blog' && (
            <BlogTab activeNetwork={activeNetwork} onNavigateToTab={setActiveTab} />
          )}
          {activeTab === 'community' && (
            <CommunityTab
              walletAddress={walletAddress}
              isFounder={isFounder}
              onConnect={handleConnectWallet}
              activeNetwork={activeNetwork}
            />
          )}
          {activeTab === 'aiguidelines' && (
            <AiGuidelinesTab activeNetwork={activeNetwork} onNavigateToTab={setActiveTab} />
          )}
        </main>

        {/* Protocol Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-spatial font-bold text-slate-900 dark:text-white">
                A-PAY PROTOCOL
              </span>
              <span>
                • {NETWORKS[activeNetwork].chain.chainName} (ChainID:{' '}
                {NETWORKS[activeNetwork].chain.chainId})
              </span>
            </div>
            <div className="font-mono text-[11px]">
              Audited ERC-20 • Non-Custodial Architecture • 100M Cap
            </div>
          </div>
        </footer>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnected={handleWalletConnected}
        activeNetwork={activeNetwork}
      />
    </div>
  );
}
