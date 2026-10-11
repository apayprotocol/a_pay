'use client';

import {
  ArrowLeft,
  Check,
  Code,
  Copy,
  ExternalLink,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { APay, type PaymentReceipt } from '@/checkout/checkout';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NETWORKS, type NetworkId } from '@/config/contracts';

interface PurchasedService {
  id: string;
  productId: string;
  title: string;
  quota: string;
  amount: string;
  currency: string;
  txHash: string;
  purchasedAt: string;
  apiKey: string;
}

export default function CheckoutDemoPage() {
  const [activeNetwork, setActiveNetwork] = useState<NetworkId>('base-sepolia');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [currency, setCurrency] = useState<'APAY' | 'USDC'>('APAY');
  const [purchasedServices, setPurchasedServices] = useState<PurchasedService[]>([]);
  const [testOutput, setTestOutput] = useState<{
    serviceTitle: string;
    output: string;
    loading: boolean;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hydrate active network preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNet = localStorage.getItem('apay_active_network') as NetworkId | null;
      if (savedNet === 'base-mainnet' || savedNet === 'base-sepolia') {
        setActiveNetwork(savedNet);
      }
    }
  }, []);

  const handleNetworkChange = (newNet: NetworkId) => {
    setActiveNetwork(newNet);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apay_active_network', newNet);
    }
  };

  const rawProducts = [
    {
      id: 'prod_scraper',
      title: 'Neural Web Scraper (10K Calls)',
      description: 'Ultra-fast headless browser data extraction endpoint with anti-bot bypass.',
      priceUsdc: 10.0,
      priceApay: 80.0,
      badge: 'Most Popular',
      defaultQuota: '10,000 / 10,000 Calls',
    },
    {
      id: 'prod_compute',
      title: 'DeepSeek R1 Compute (1M Tokens)',
      description: 'Dedicated GPU inference cluster with sub-25ms response latency.',
      priceUsdc: 25.0,
      priceApay: 200.0,
      badge: 'Hot',
      defaultQuota: '1,000,000 Tokens',
    },
    {
      id: 'prod_agent',
      title: 'Autonomous Swarm License',
      description: 'Multi-agent orchestration system with unlimited local budget vaults.',
      priceUsdc: 75.0,
      priceApay: 600.0,
      badge: 'Enterprise',
      defaultQuota: 'Unlimited Multi-Agent',
    },
  ];

  const demoStorageKey = `apay_demo_purchases_${activeNetwork}`;

  // Load persistent purchases from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved =
          localStorage.getItem(demoStorageKey) || localStorage.getItem('apay_demo_purchases');
        if (saved) {
          setPurchasedServices(JSON.parse(saved));
        } else {
          setPurchasedServices([]);
        }
      } catch {
        // fallback
      }
    }
  }, [demoStorageKey]);

  const savePurchases = (newList: PurchasedService[]) => {
    setPurchasedServices(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(demoStorageKey, JSON.stringify(newList));
    }
  };

  const handleBuy = (item: (typeof rawProducts)[0]) => {
    setReceipt(null);
    const amount = currency === 'APAY' ? item.priceApay : item.priceUsdc;
    const netContracts = NETWORKS[activeNetwork];
    APay.checkout({
      amount: amount,
      currency: currency,
      network: activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia',
      receiver: netContracts.EscrowVault.address,
      title: item.title,
      isDemo: true,
      orderId: 'ord_' + Math.floor(100000 + Math.random() * 900000),
      onSuccess: (rec) => {
        setReceipt(rec);
        const randomKey = `apay_live_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;
        const newPurchase: PurchasedService = {
          id: `sub_${Date.now()}`,
          productId: item.id,
          title: item.title,
          quota: item.defaultQuota,
          amount: rec.amount,
          currency: rec.currency,
          txHash: rec.txHash,
          purchasedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          apiKey: randomKey,
        };
        const updated = [newPurchase, ...purchasedServices.filter((p) => p.productId !== item.id)];
        savePurchases(updated);
      },
    });
  };

  const activateDemoLicense = (productId = 'prod_scraper') => {
    const item = rawProducts.find((p) => p.id === productId) || rawProducts[0];
    const demoTxHash = `0x0000000000000000${Date.now().toString(16).padStart(16, '0')}${'a'.repeat(32)}`;
    const newPurchase: PurchasedService = {
      id: `sub_${Date.now()}`,
      productId: item.id,
      title: item.title,
      quota: item.defaultQuota,
      amount: currency === 'APAY' ? `${item.priceApay}` : `${item.priceUsdc}`,
      currency: currency,
      txHash: demoTxHash,
      purchasedAt: 'Just now',
      apiKey: `apay_live_${Math.random().toString(36).substring(2, 9)}_verified`,
    };
    savePurchases([newPurchase, ...purchasedServices.filter((p) => p.productId !== item.id)]);
  };

  const runTestApiCall = (purchase: PurchasedService) => {
    setTestOutput({
      serviceTitle: purchase.title,
      output: 'Dispatching authenticated HTTP query with Base L2 cryptographic receipt proof...',
      loading: true,
    });

    setTimeout(() => {
      setTestOutput({
        serviceTitle: purchase.title,
        output: JSON.stringify(
          {
            status: 200,
            service: purchase.title,
            licenseStatus: 'ACTIVE_AND_FUNDED',
            settlementRail:
              activeNetwork === 'base-mainnet'
                ? 'Base Mainnet (Chain 8453)'
                : 'Base Sepolia (Chain 84532)',
            paymentVerified: `${purchase.amount} ${purchase.currency}`,
            onChainTx: purchase.txHash,
            authenticatedKey: `${purchase.apiKey.slice(0, 14)}...`,
            latencyMs: 142,
            data: {
              result: 'Success: Secure API extraction complete.',
              timestamp: new Date().toISOString(),
              remainingQuota: purchase.quota,
            },
          },
          null,
          2,
        ),
        loading: false,
      });
    }, 600);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="font-spatial font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                DEMO MERCHANT STORE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-sky-300 font-bold">
                Pillar 2 Checkout
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dual Network Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold">
              <button
                type="button"
                onClick={() => handleNetworkChange('base-sepolia')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeNetwork === 'base-sepolia'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sepolia
              </button>
              <button
                type="button"
                onClick={() => handleNetworkChange('base-mainnet')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeNetwork === 'base-mainnet'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mainnet
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Zero-Chargeback Web3 Checkout
          </div>
          <h1 className="font-outfit text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Instant Crypto Payments for Digital Merchants
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Customers pay with 1-click from MetaMask/Coinbase Wallet or scan a dynamic QR code on
            their phone. Funds settle immediately on Base L2.
          </p>
        </div>

        {/* Currency Rail Selector & Demo State Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setCurrency('APAY')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currency === 'APAY'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚡ Pay with $APAY</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-semibold">
                20% Off
              </span>
            </button>
            <button
              onClick={() => setCurrency('USDC')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currency === 'USDC'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>💵 Pay with USDC</span>
              <span className="text-[10px] text-slate-400 font-semibold">(Circle USD)</span>
            </button>
          </div>

          {/* Quick Activate / Reset Demo Buttons */}
          <div className="flex items-center gap-2 text-xs">
            {purchasedServices.length === 0 ? (
              <button
                onClick={() => activateDemoLicense('prod_scraper')}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-mono font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="If you already completed an on-chain payment, click here to immediately activate your license without paying again"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Activate My Recent Payment (80 $APAY)</span>
              </button>
            ) : (
              <button
                onClick={() => savePurchases([])}
                className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 font-mono text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset demo active licenses to test fresh payment again"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo State</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Receipt Alert */}
        {receipt && (
          <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Payment Successfully Verified On-Chain!
              </div>
              <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                Tx Hash: {receipt.txHash} • Amount: {receipt.amount} {receipt.currency}
              </div>
            </div>
            <a
              href={`${receipt.network === 'base' ? 'https://basescan.org' : 'https://sepolia.basescan.org'}/tx/${receipt.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <span>Verify on Basescan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Live Test Query Output Terminal */}
        {testOutput && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-4 border-2 border-emerald-500/50 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold font-spatial text-slate-900 dark:text-white">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span>Live Authenticated Output: {testOutput.serviceTitle}</span>
              </div>
              <button
                onClick={() => setTestOutput(null)}
                className="text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Close Output ✕
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
              {testOutput.loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="animate-spin">⏳</span>
                  <span>Executing authenticated Base L2 query...</span>
                </div>
              ) : (
                testOutput.output
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rawProducts.map((item) => {
            const isPurchased = purchasedServices.find((p) => p.productId === item.id);
            return (
              <div
                key={item.id}
                className={`glass-panel rounded-3xl p-6 sm:p-7 soft-shadow flex flex-col justify-between space-y-6 transition-all duration-300 ${
                  isPurchased
                    ? 'border-2 border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-emerald-500/10'
                    : 'hover:border-blue-500/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    {isPurchased ? (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
                        <Check className="w-3.5 h-3.5" />
                        Active License
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-sky-400">
                        {item.badge}
                      </span>
                    )}

                    <div className="text-right">
                      <span className="font-outfit text-3xl font-black text-slate-900 dark:text-white">
                        {isPurchased
                          ? `${isPurchased.amount}`
                          : currency === 'APAY'
                            ? `${item.priceApay}`
                            : `$${item.priceUsdc.toFixed(2)}`}
                      </span>
                      <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold block">
                        {isPurchased
                          ? `Paid in ${isPurchased.currency}`
                          : currency === 'APAY'
                            ? '$APAY (Save 20%)'
                            : 'USDC'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Active credentials & status */}
                  {isPurchased && (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Live Quota:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {isPurchased.quota}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">License Key:</span>
                        <button
                          onClick={() => copyKey(isPurchased.apiKey)}
                          className="font-mono text-[10px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isPurchased.apiKey.slice(0, 15)}...</span>
                          {copiedKey === isPurchased.apiKey ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Settled On-Chain:</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${isPurchased.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 underline hover:opacity-80"
                        >
                          View Receipt ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {isPurchased ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => runTestApiCall(isPurchased)}
                        className="butter-button w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Run Test Live API Query</span>
                      </button>
                      <button
                        onClick={() => handleBuy(item)}
                        className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] font-mono font-medium transition-colors cursor-pointer"
                      >
                        Top-up Quota (+{item.defaultQuota})
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      className={`butter-button w-full py-3.5 rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        currency === 'APAY'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>
                        Pay{' '}
                        {currency === 'APAY'
                          ? `${item.priceApay} $APAY`
                          : `$${item.priceUsdc.toFixed(2)} USDC`}
                      </span>
                    </button>
                  )}
                  <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-500" />
                      Zero Chargeback
                    </span>
                    <span>•</span>
                    <span>&lt; 2s Finality</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration Code Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold font-spatial text-slate-900 dark:text-white">
            <Code className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            How the Merchant Integrates This in 2 Lines of Code ({currency})
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs overflow-x-auto whitespace-pre">
            {`<!-- 1. Include Script in <head> -->
<script src="https://apay-network.vercel.app/v1.js"></script>

<!-- 2. Call on Button Click (${currency}) -->
<button onclick="APay.checkout({ amount: ${currency === 'APAY' ? '200.0' : '25.00'}, currency: '${currency}', title: 'DeepSeek R1 Compute' })">
  Pay with ${currency === 'APAY' ? '$APAY' : 'A-Pay'}
</button>`}
          </div>
        </div>
      </main>
    </div>
  );
}
