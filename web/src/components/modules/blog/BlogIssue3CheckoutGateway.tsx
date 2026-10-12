'use client';

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Laptop,
  Layers,
  Lock,
  Package,
  Percent,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Terminal,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { APay } from '@/checkout/checkout';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';

interface BlogIssue3CheckoutGatewayProps {
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tabId: string) => void;
  onSwitchIssue?: (issueId: 'paywalls' | 'vaults' | 'checkout') => void;
}

export function BlogIssue3CheckoutGateway({
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
  onSwitchIssue,
}: BlogIssue3CheckoutGatewayProps) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Interactive Live Checkout Simulator State
  const [simProduct, setSimProduct] = useState<'physical' | 'saas' | 'digital'>('physical');
  const [simCurrency, setSimCurrency] = useState<'USDC' | 'APAY'>('USDC');
  const [simPaidSuccess, setSimPaidSuccess] = useState(false);
  const [simTxHash, setSimTxHash] = useState<string | null>(null);

  // Interactive Fee Savings Calculator State
  const [monthlySales, setMonthlySales] = useState<number>(10000);
  const [avgTicket, setAvgTicket] = useState<number>(50);
  const [intlPercent, setIntlPercent] = useState<number>(35);

  // Code Tab Selector State
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'react' | 'webhook'>('html');

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const contracts = getNetworkContracts(activeNetwork);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareOnX = () => {
    if (typeof window !== 'undefined') {
      const tweetText = encodeURIComponent(
        'Traditional payment processors charge 2.9% + $0.30, delay payouts by 7 days, and leave merchants vulnerable to chargeback fraud.\n\n💳 A-Pay Checkout: The non-custodial Web3 payment gateway for physical e-commerce & digital SaaS.\n\nInstant 2-second Base L2 settlement. 0% chargebacks. 1.0% flat fee.\n\nRead the deep dive:',
      );
      const url = encodeURIComponent(window.location.href);
      window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  // Launch Live Checkout Modal using real A-Pay SDK
  const handleTestCheckout = () => {
    setSimPaidSuccess(false);
    setSimTxHash(null);

    const priceMap = {
      physical: { usdc: 45.0, apay: 350.0, name: 'Cyberpunk Heavyweight Hoodie (Physical)' },
      saas: { usdc: 29.0, apay: 220.0, name: 'Pro AI Analytics License (SaaS / Digital)' },
      digital: { usdc: 12.0, apay: 90.0, name: 'Autonomous Swarm Blueprint (eBook & Code)' },
    };

    const selected = priceMap[simProduct];
    const amount = simCurrency === 'USDC' ? selected.usdc : selected.apay;

    try {
      APay.checkout({
        amount: amount,
        currency: simCurrency,
        network: activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia',
        title: selected.name,
        description: `Instant A-Pay H2M/H2B Web3 Checkout (${simCurrency})`,
        receiver: contracts.EscrowVault.address,
        orderId: `ord_${Date.now().toString(36)}`,
        onSuccess: (receipt) => {
          setSimPaidSuccess(true);
          setSimTxHash(receipt.txHash);
        },
        onError: (err) => {
          console.warn('Checkout closed or cancelled:', err);
        },
      });
    } catch (e) {
      console.error('Error invoking APay.checkout:', e);
    }
  };

  // Calculations for Fee Savings Calculator
  const totalOrders = Math.max(1, Math.round(monthlySales / avgTicket));
  const legacyBaseFee = monthlySales * 0.029;
  const legacyFixedFee = totalOrders * 0.3;
  const legacyFxFee = monthlySales * (intlPercent / 100) * 0.02;
  const legacyChargebackLoss = monthlySales * 0.01 + totalOrders * 0.01 * 15;
  const totalLegacyCost = Math.round(
    legacyBaseFee + legacyFixedFee + legacyFxFee + legacyChargebackLoss,
  );

  const apayTotalCost = Math.round(monthlySales * 0.01);
  const monthlyNetSavings = Math.max(0, totalLegacyCost - apayTotalCost);
  const annualNetSavings = monthlyNetSavings * 12;
  const savingsPercent =
    totalLegacyCost > 0 ? Math.round((monthlyNetSavings / totalLegacyCost) * 100) : 80;

  const faqs = [
    {
      q: 'Is A-Pay Checkout only for crypto-native websites, or can traditional stores use it?',
      a: 'Any website can use A-Pay Checkout! Whether you run a Shopify apparel store selling physical t-shirts, a WooCommerce electronics store, a custom Next.js SaaS, or a digital creator platform, you simply add our 1-line script tag or React button. It functions as a modern non-custodial checkout button alongside your existing payment options.',
    },
    {
      q: 'Does the human customer need technical crypto knowledge to pay?',
      a: 'No. The checkout modal offers two intuitive paths: 1) One-Click browser wallet connection (Coinbase Wallet, MetaMask, Phantom, Rainbow), or 2) An instant mobile QR code that users can scan with their phone camera or mobile wallet app. In both flows, they verify the payment with FaceID or their device passcode in under 3 seconds.',
    },
    {
      q: 'How does A-Pay eliminate 100% of chargeback fraud?',
      a: 'Traditional credit card payments are reversible for up to 120 days. Fraudsters frequently order physical goods or software licenses and then file fraudulent "unauthorized transaction" claims with their credit card bank, costing merchants the merchandise, the money, and a $15-$25 dispute penalty. On Base L2, blockchain transactions are cryptographic and immutable. Once confirmed, payment is mathematically final with zero chargeback risk.',
    },
    {
      q: 'How and when does the merchant receive their money?',
      a: 'Instantaneous settlement! Unlike legacy processors which hold merchant funds for 3 to 7 business days (or lock up to 20% in rolling risk reserves for 90 days), A-Pay routes funds directly to the merchant’s non-custodial wallet address in under 2 seconds. The merchant has full custody and can immediately convert USDC to local fiat bank deposits via Coinbase, Circle, or local bank ramps.',
    },
    {
      q: 'How do I fulfill orders for physical products that require shipping addresses?',
      a: 'When calling APay.checkout(), you pass an orderId or metadata payload. When the customer pays, A-Pay’s webhook service dispatches an authenticated on-chain verification event (order.completed) to your fulfillment server, Shopify webhook, or Zapier integration so your warehouse can print shipping labels automatically.',
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* Article Hero Section */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950/40 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 backdrop-blur-2xl shadow-xl shadow-emerald-500/5 dark:shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>HUMAN-TO-MERCHANT (H2M / H2B) GATEWAY</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">Protocol Research Series #03</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 16 min deep read
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              September 2026 Edition
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              💳 A-Pay Checkout Gateway — [H2M / H2B]
            </h1>
            <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-300 bg-clip-text text-transparent leading-snug">
              The Modern Web3 Payment Gateway for Physical E-Commerce, Digital SaaS & Global
              Creators (A Non-Custodial Alternative to Traditional Processors)
            </p>
          </div>

          {/* Subtitle / Lead Paragraph */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
            A comprehensive guide for e-commerce founders, SaaS operators, and digital creators.
            Discover how to attach <strong>A-Pay Checkout</strong> to your website, accept Base L2
            USDC and crypto with <strong>instant 2-second settlement</strong>, eliminate 100% of
            chargeback fraud, and bypass the high fees and international card declines of legacy
            banking rails.
          </p>

          {/* Key Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Settlement Latency
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                &lt; 2 Seconds
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Direct to merchant wallet
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Protocol Fee
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-sky-400 mt-0.5">
                1.0% Flat
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Zero fixed minimum fee
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Chargeback Rate
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                0.00%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Immutable cryptographic finality
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Setup Speed
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                &lt; 60 Sec
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">1-line embed script</div>
            </div>
          </div>

          {/* Author & Share Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-emerald-500/20">
                AP
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>A-Pay Commerce & Checkout Group</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Human Web3 Merchant Infrastructure Core
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareOnX}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on X (Twitter)</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Table of Contents Pill Bar */}
      <section className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Curated Table of Contents (11 Commerce Sections)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-medium">
          <a
            href="#sec-what-is-checkout"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              01.
            </span>
            <span>What is A-Pay Checkout?</span>
          </a>
          <a
            href="#sec-physical-vs-digital"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              02.
            </span>
            <span>Physical Goods vs. Digital Products</span>
          </a>
          <a
            href="#sec-stripe-flaws"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              03.
            </span>
            <span>7 Lethal Flaws of Traditional Gateways</span>
          </a>
          <a
            href="#sec-customer-flow"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              04.
            </span>
            <span>The 4-Step Human Checkout Flow</span>
          </a>
          <a
            href="#sec-live-simulator"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              05.
            </span>
            <span>Interactive Live Checkout Simulator</span>
          </a>
          <a
            href="#sec-savings-calculator"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              06.
            </span>
            <span>Fee & Chargeback Savings Calculator</span>
          </a>
          <a
            href="#sec-integration"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              07.
            </span>
            <span>60-Second Drop-In Integration Code</span>
          </a>
          <a
            href="#sec-archetypes-checkout"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              08.
            </span>
            <span>6 Merchant Archetypes Who Need This</span>
          </a>
          <a
            href="#sec-gateway-matrix"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              09.
            </span>
            <span>Gateway Benchmark: A-Pay vs Legacy Processors</span>
          </a>
          <a
            href="#sec-faqs-checkout"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              10.
            </span>
            <span>Merchant FAQs & Global Payouts</span>
          </a>
          <a
            href="#sec-legal-notice"
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              11.
            </span>
            <span>Trademark & Legal Disclaimer</span>
          </a>
        </div>
      </section>

      {/* SECTION 01: WHAT IS A-PAY CHECKOUT? */}
      <section
        id="sec-what-is-checkout"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Store className="w-4 h-4" />
          <span>Section 01 • The Core Foundation</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          A Web3 Native Alternative to Traditional Gateways: Explained Simply
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed text-sm sm:text-base">
          <p>
            When an online business sells products on the internet today, they attach a{' '}
            <strong>Payment Gateway</strong> to their website. If a customer is buying a physical
            pair of sneakers or a monthly SaaS subscription, the payment gateway connects to Visa,
            Mastercard, or local bank rails (like UPI in India or SEPA in Europe) so the buyer can
            pay from their bank account.
          </p>
          <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-2.5">
            <div className="text-emerald-800 dark:text-emerald-300 font-bold text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>A-Pay Checkout is the Exact Same Payment Gateway — Powered by Crypto</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Just like a merchant embeds traditional checkout to accept credit cards, they embed{' '}
              <strong>A-Pay Checkout</strong> to accept instant payments in Base L2 USDC, ETH, or
              APAY tokens. In this scenario, <strong>the payer is a real human</strong>{' '}
              (Human-to-Machine / Human-to-Business, or <strong>H2M / H2B</strong>).
            </p>
          </div>
          <p>
            The customer doesn't type a 16-digit credit card number, expiration date, billing zip
            code, or wait for a SMS OTP from their bank. They simply click{' '}
            <strong>&ldquo;Pay with A-Pay&rdquo;</strong>, confirm on their browser wallet or scan a
            mobile QR code with FaceID, and the purchase is settled on Base L2 in{' '}
            <strong>less than 2 seconds</strong>.
          </p>
        </div>
      </section>

      {/* SECTION 02: PHYSICAL GOODS VS DIGITAL PRODUCTS */}
      <section
        id="sec-physical-vs-digital"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Package className="w-4 h-4" />
          <span>Section 02 • Universal Merchant Utility</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Physical Goods vs. Digital Products: How Any Merchant Can Sell with A-Pay
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            A common misconception is that crypto payments are only for buying NFTs or tokens.
            <strong>A-Pay Checkout is built for real-world global commerce:</strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-4">
            {/* Physical Goods Box */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  <span>1. Physical E-Commerce Products</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono text-[10px] font-bold">
                  Apparel, Hardware, Merch
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                A customer on your Shopify, WooCommerce, or custom React storefront selects a
                heavyweight hoodie ($45 USDC). At checkout, they pay via A-Pay.
              </p>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ On-Chain Verified (Base L2)
                </div>
                <div className="text-slate-500">
                  Webhook fires:{' '}
                  <code className="text-blue-500">order.paid(orderId: &quot;ord_892&quot;)</code>
                </div>
                <div className="text-slate-500">
                  Warehouse prints shipping label instantly. Zero chargeback risk!
                </div>
              </div>
            </div>

            {/* Digital Goods Box */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>2. Digital Products & Software SaaS</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold">
                  SaaS, Licenses, E-books, APIs
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                A user purchases a monthly Pro subscription ($29 USDC) or downloads an AI coding
                course. They don't need a US-issued credit card or traditional bank account.
              </p>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ Instant License Provisioning
                </div>
                <div className="text-slate-500">
                  Webhook fires: <code className="text-indigo-500">license.activated(userId)</code>
                </div>
                <div className="text-slate-500">Customer account upgraded in 1.4 seconds flat!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03: 7 LETHAL FLAWS OF TRADITIONAL GATEWAYS */}
      <section
        id="sec-stripe-flaws"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Section 03 • The Legacy Banking Trap</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The 7 Lethal Flaws of Traditional Gateways (Stripe, PayPal, Banks) vs A-Pay
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            For decades, online merchants had no choice but to accept the predatory rules of credit
            card payment processors. Here is what merchants suffer every single day with legacy
            gateways, and how A-Pay completely eliminates each problem:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Flaw 1 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>1. Chargeback Friendly Fraud</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> Buyers can dispute a charge 90 days after delivery. The
                merchant loses the product, the money, and pays a $15 fee.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> Cryptographic finality on Base L2. 0% chargebacks.
                Impossible to reverse.
              </p>
            </div>

            {/* Flaw 2 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>2. 3-7 Day Holding Delays</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> Funds take days to land in your bank, and up to 20% can be
                locked in &ldquo;rolling reserves&rdquo; for 90 days.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> Direct non-custodial wallet transfer in &lt; 2 seconds. Full
                liquidity instantly.
              </p>
            </div>

            {/* Flaw 3 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>3. Cross-Border FX Exploitation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> International cards incur 2% currency conversion fees plus
                cross-border penalties for both buyer and seller.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> Native USDC is borderless. Tokyo pays New York with 0%
                currency conversion markup.
              </p>
            </div>

            {/* Flaw 4 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>4. Geographic Incorporation Locks</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> Unavailable in 120+ countries. Founders must pay $500+ for
                incorporation services and US Delaware LLCs.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> Permissionless global access. All you need is an EVM wallet
                address to accept payments.
              </p>
            </div>

            {/* Flaw 5 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>5. 15-20% Card Decline Rates</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> Over-aggressive bank fraud filters decline 1 out of 5 valid
                international customer card attempts.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> If the wallet holds USDC and the human signs, the
                transaction succeeds 100% of the time.
              </p>
            </div>

            {/* Flaw 6 */}
            <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>6. Predatory Minimum Fees</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Legacy:</strong> Fixed $0.30 + 2.9% fee makes low-ticket purchases ($1 to
                $10) severely unprofitable.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <strong>A-Pay:</strong> Flat 1.0% protocol fee with zero fixed minimum. A $2.00
                purchase costs only 2 cents to process!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 04: THE 4-STEP HUMAN CHECKOUT FLOW */}
      <section
        id="sec-customer-flow"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <UserCheck className="w-4 h-4" />
          <span>Section 04 • Customer Experience</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          The 4-Step Customer Flow: What Real Humans Experience at Checkout
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Online shoppers hate friction. A-Pay Checkout is engineered to be faster and simpler
            than typing credit card details:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono font-bold flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Click &ldquo;Pay with A-Pay&rdquo;
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The shopper finishes adding items to their cart and clicks the branded A-Pay button
                on your website.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Select Wallet or QR Scan
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Desktop users click their browser extension (Coinbase/MetaMask/Phantom). Mobile
                users scan the auto-generated EIP-681 QR code.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Biometric FaceID Approval
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The customer approves the exact USDC amount with a single fingerprint or FaceID scan
                in their wallet. Zero manual typing.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold flex items-center justify-center">
                4
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Instant Order Confirmation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                In &lt; 2 seconds, Base L2 confirms the transaction. A verified receipt appears and
                the merchant webhook fulfills the order!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05: INTERACTIVE LIVE CHECKOUT SIMULATOR */}
      <section
        id="sec-live-simulator"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Section 05 • Interactive Live Simulator</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Try It Yourself: Test the Live A-Pay Checkout Engine Right Now
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Choose a demo product below and trigger the authentic A-Pay Checkout Modal to experience
            how fast and seamless human Web3 payments are on Base L2.
          </p>
        </div>

        {/* Simulator Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-6">
          {/* Product Selector Radios */}
          <div>
            <label className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300 block mb-3">
              Step 1: Choose a Sample Product:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSimProduct('physical');
                  setSimPaidSuccess(false);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  simProduct === 'physical'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-sky-400 font-bold">
                    Physical Product
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    Cyber Hoodie Merch
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    E-commerce apparel with auto-shipping webhook
                  </div>
                </div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  $45.00 USDC
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimProduct('saas');
                  setSimPaidSuccess(false);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  simProduct === 'saas'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                    Digital SaaS
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    Pro AI Analytics
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Monthly subscription license with instant account unlock
                  </div>
                </div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  $29.00 USDC
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimProduct('digital');
                  setSimPaidSuccess(false);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  simProduct === 'digital'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
                    Digital Download
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    Swarm AI Blueprint
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Creator eBook and code repository access
                  </div>
                </div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  $12.00 USDC
                </div>
              </button>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                Payment Currency:
              </span>
              <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setSimCurrency('USDC')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    simCurrency === 'USDC'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Circle USDC
                </button>
                <button
                  type="button"
                  onClick={() => setSimCurrency('APAY')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    simCurrency === 'APAY'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  $APAY (25% Discount)
                </button>
              </div>
            </div>

            {/* Launch Checkout Button */}
            <button
              type="button"
              onClick={handleTestCheckout}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>Launch Live A-Pay Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Success Banner if paid */}
          {simPaidSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Payment Confirmed on Base L2!</span>
              </div>
              <div>TxHash: {simTxHash}</div>
              <div>Merchant Webhook: HTTP 200 OK • Order fulfilled!</div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 06: INTERACTIVE FEE SAVINGS CALCULATOR */}
      <section
        id="sec-savings-calculator"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <Calculator className="w-4 h-4" />
          <span>Section 06 • Interactive Merchant Profit Calculator</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Calculate Your Fee & Chargeback Savings with A-Pay
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Slide the controls below to discover how much gross margin your business is losing to
            traditional payment processors each month, and how much you keep with A-Pay.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  Monthly Gross Revenue:
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ${monthlySales.toLocaleString()} / mo
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  Average Order Value (Ticket Size):
                </span>
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  ${avgTicket.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  International / Cross-Border Customers:
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {intlPercent}% of orders
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={intlPercent}
                onChange={(e) => setIntlPercent(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 flex justify-between items-center">
              <div>
                <span className="text-rose-900 dark:text-rose-300 font-semibold block">
                  Traditional Processor Cost:
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  2.9% + $0.30 fixed + 2% FX + ~1% chargebacks
                </span>
              </div>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                -${totalLegacyCost.toLocaleString()} / mo
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30 flex justify-between items-center">
              <div>
                <span className="text-blue-900 dark:text-sky-300 font-semibold block">
                  A-Pay Protocol Fee (1.0% Flat):
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Zero fixed minimum • 0% FX penalty • 0% chargebacks
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-sky-400">
                ${apayTotalCost.toLocaleString()} / mo
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
              <div>
                <span className="text-emerald-900 dark:text-emerald-300 font-bold text-sm block">
                  Net Merchant Savings with A-Pay:
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans">
                  {savingsPercent}% Lower Processing Overhead
                </span>
              </div>
              <div className="text-right">
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  +${monthlyNetSavings.toLocaleString()} / mo
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  (${annualNetSavings.toLocaleString()} / year kept)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 07: 60-SECOND DROP-IN INTEGRATION CODE */}
      <section
        id="sec-integration"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 dark:text-sky-400 uppercase tracking-wider font-semibold">
          <Code2 className="w-4 h-4" />
          <span>Section 07 • Drop-In Integration Code</span>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            How to Embed A-Pay Checkout in Any Website in Under 60 Seconds
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Choose your technical stack: A simple HTML script tag for Shopify / Webflow, a React /
            Next.js component, or backend webhook verification.
          </p>
        </div>

        {/* Code Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveCodeTab('html')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                activeCodeTab === 'html'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. HTML / Shopify / Webflow
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('react')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                activeCodeTab === 'react'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. React / Next.js Component
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('webhook')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                activeCodeTab === 'webhook'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Backend Webhook Verification
            </button>
          </div>

          {/* HTML Code */}
          {activeCodeTab === 'html' && (
            <div className="relative rounded-2xl bg-slate-950 text-slate-200 p-4 sm:p-5 font-mono text-xs border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() =>
                  copyCode(
                    `<!-- 1. Include A-Pay Checkout Widget (< 50KB bundle) -->
<script src="https://apayprotocol.org/checkout.js"></script>

<!-- 2. Attach payment trigger to any button or link -->
<button onclick="launchAPayCheckout()" class="btn-buy">
  Pay $45 with Crypto (A-Pay)
</button>

<script>
  function launchAPayCheckout() {
    APay.checkout({
      amount: 45.00,
      currency: 'USDC',
      network: 'base', // or 'base-sepolia' for testing
      receiver: '${contracts.EscrowVault.address}',
      title: 'Cyberpunk Hoodie (Physical)',
      orderId: 'shop_order_' + Date.now(),
      onSuccess: function(receipt) {
        alert('Payment successful! TxHash: ' + receipt.txHash);
        window.location.href = '/thank-you?order=' + receipt.orderId;
      }
    });
  }
</script>`,
                    'code-html',
                  )
                }
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedCodeId === 'code-html' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <pre className="text-slate-300 leading-relaxed">
                <code>{`<!-- 1. Include A-Pay Checkout Widget (< 50KB bundle) -->
<script src="https://apayprotocol.org/checkout.js"></script>

<!-- 2. Attach payment trigger to any button or link -->
<button onclick="launchAPayCheckout()" class="btn-buy">
  Pay $45 with Crypto (A-Pay)
</button>

<script>
  function launchAPayCheckout() {
    APay.checkout({
      amount: 45.00,
      currency: 'USDC',
      network: 'base', // or 'base-sepolia' for testing
      receiver: '${contracts.EscrowVault.address}',
      title: 'Cyberpunk Hoodie (Physical)',
      orderId: 'shop_order_' + Date.now(),
      onSuccess: function(receipt) {
        alert('Payment successful! TxHash: ' + receipt.txHash);
        window.location.href = '/thank-you?order=' + receipt.orderId;
      }
    });
  }
</script>`}</code>
              </pre>
            </div>
          )}

          {/* React Code */}
          {activeCodeTab === 'react' && (
            <div className="relative rounded-2xl bg-slate-950 text-slate-200 p-4 sm:p-5 font-mono text-xs border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() =>
                  copyCode(
                    `import React from 'react';
import { APay } from '@apay/checkout';

export function CheckoutButton({ planId, priceUsdc }: { planId: string; priceUsdc: number }) {
  const handlePayment = async () => {
    try {
      const receipt = await APay.checkout({
        amount: priceUsdc,
        currency: 'USDC',
        network: 'base',
        receiver: '${contracts.EscrowVault.address}',
        title: 'Pro SaaS Subscription',
        orderId: \`sub_\${planId}_\${Date.now()}\`,
      });

      console.log('Payment complete! Receipt:', receipt.txHash);
      // Route user to dashboard or trigger backend license activation
    } catch (err) {
      console.warn('Checkout cancelled or failed:', err);
    }
  };

  return (
    <button onClick={handlePayment} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">
      Pay \${priceUsdc} with A-Pay
    </button>
  );
}`,
                    'code-react',
                  )
                }
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedCodeId === 'code-react' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <pre className="text-slate-300 leading-relaxed">
                <code>{`import React from 'react';
import { APay } from '@apay/checkout';

export function CheckoutButton({ planId, priceUsdc }: { planId: string; priceUsdc: number }) {
  const handlePayment = async () => {
    try {
      const receipt = await APay.checkout({
        amount: priceUsdc,
        currency: 'USDC',
        network: 'base',
        receiver: '${contracts.EscrowVault.address}',
        title: 'Pro SaaS Subscription',
        orderId: \`sub_\${planId}_\${Date.now()}\`,
      });

      console.log('Payment complete! Receipt:', receipt.txHash);
      // Route user to dashboard or trigger backend license activation
    } catch (err) {
      console.warn('Checkout cancelled or failed:', err);
    }
  };

  return (
    <button onClick={handlePayment} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">
      Pay \${priceUsdc} with A-Pay
    </button>
  );
}`}</code>
              </pre>
            </div>
          )}

          {/* Webhook Code */}
          {activeCodeTab === 'webhook' && (
            <div className="relative rounded-2xl bg-slate-950 text-slate-200 p-4 sm:p-5 font-mono text-xs border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() =>
                  copyCode(
                    `// Node.js Express / Next.js Server Webhook Handler
import express from 'express';
import { verifyApayReceipt } from '@apay/sdk';

const app = express();
app.use(express.json());

app.post('/api/webhooks/apay', async (req, res) => {
  const { txHash, orderId, amount, payer, receiver } = req.body;

  // 1. Cryptographically verify the receipt against Base L2 on-chain RPC
  const isValid = await verifyApayReceipt({
    txHash,
    expectedAmount: amount,
    expectedReceiver: '${contracts.EscrowVault.address}',
    network: 'base'
  });

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid on-chain payment proof' });
  }

  // 2. Fulfill order (print physical shipping label or unlock SaaS license)
  console.log(\`Order \${orderId} paid by \${payer}! Fulfilling merchandise...\`);

  return res.json({ status: 'fulfilled', orderId });
});`,
                    'code-webhook',
                  )
                }
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedCodeId === 'code-webhook' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <pre className="text-slate-300 leading-relaxed">
                <code>{`// Node.js Express / Next.js Server Webhook Handler
import express from 'express';
import { verifyApayReceipt } from '@apay/sdk';

const app = express();
app.use(express.json());

app.post('/api/webhooks/apay', async (req, res) => {
  const { txHash, orderId, amount, payer, receiver } = req.body;

  // 1. Cryptographically verify the receipt against Base L2 on-chain RPC
  const isValid = await verifyApayReceipt({
    txHash,
    expectedAmount: amount,
    expectedReceiver: '${contracts.EscrowVault.address}',
    network: 'base'
  });

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid on-chain payment proof' });
  }

  // 2. Fulfill order (print physical shipping label or unlock SaaS license)
  console.log(\`Order \${orderId} paid by \${payer}! Fulfilling merchandise...\`);

  return res.json({ status: 'fulfilled', orderId });
});`}</code>
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 08: 6 MERCHANT ARCHETYPES WHO NEED THIS */}
      <section
        id="sec-archetypes-checkout"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
          <Store className="w-4 h-4" />
          <span>Section 08 • Merchant Archetypes</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Who Needs A-Pay Checkout Most? 6 High-Impact Business Models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              1. Global E-Commerce & DTC Apparel
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Selling streetwear, custom mechanical keyboards, or physical electronics
              internationally. Save 4-6% in cross-border foreign exchange conversion fees and
              eliminate friendly-fraud chargebacks completely.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              2. Independent SaaS & AI Tool Startups
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Founders living in India, Southeast Asia, Africa, or Eastern Europe who cannot access
              traditional merchant processors without setting up expensive Delaware corporations.
              Start billing global customers in USDC in 2 minutes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              3. Digital Creators & Course Educators
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Keep 99% of your course or e-book sales instead of losing 10-15% of your gross revenue
              to centralized digital platforms. Direct payouts directly to your own wallet.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              4. Gaming, Skins & Virtual Assets
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              High-frequency in-game cosmetic stores. Gaming transactions suffer from the highest
              chargeback rates in the world (up to 4.5%). A-Pay makes every skin purchase
              mathematically irreversible.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              5. High-Ticket Hardware & GPU Rigs
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Selling $2,000+ AI servers, 3D printers, or mining hardware. A single fraudulent
              chargeback can destroy a small hardware company's monthly margin. A-Pay guarantees
              100% final settlement.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              6. Digital Agencies & Freelancers
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Invoice international software clients with instant hosted checkout links. No 5-day
              SWIFT wire delays, zero intermediary bank deduction fees ($25-$45 wires), and
              immediate USDC access.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 09: GATEWAY BENCHMARK TABLE */}
      <section
        id="sec-gateway-matrix"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <TrendingUp className="w-4 h-4" />
          <span>Section 09 • Gateway Benchmark Matrix</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Payment Gateway Benchmark: A-Pay vs Legacy Processors (Stripe & PayPal)
        </h2>
        <div className="text-slate-600 dark:text-slate-300 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>How does A-Pay Checkout compare directly against traditional payment gateways?</p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-900 dark:text-white font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Gateway Dimension</th>
                  <th className="p-4 text-rose-600 dark:text-rose-400">Traditional Stripe</th>
                  <th className="p-4 text-amber-600 dark:text-amber-400">PayPal Commerce</th>
                  <th className="p-4 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold">
                    💳 A-Pay Checkout
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Payout Speed to Merchant
                  </td>
                  <td className="p-4">3 to 7 Days</td>
                  <td className="p-4">1 to 3 Days</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    &lt; 2 Seconds (Direct to Wallet)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Processing Fee
                  </td>
                  <td className="p-4">2.9% + $0.30</td>
                  <td className="p-4">3.49% + $0.49</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    1.0% Flat (Zero Fixed Minimum)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Chargeback Protection
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">
                    ❌ High Risk (Merchant pays $15 fine)
                  </td>
                  <td className="p-4 text-rose-600 dark:text-rose-400">
                    ❌ High Risk (Buyer dispute freezes funds)
                  </td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    ✅ 100% Cryptographic Finality (0% Risk)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Global Availability
                  </td>
                  <td className="p-4">47 Countries</td>
                  <td className="p-4">Supported, but strict limits</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    ✅ 195+ Countries (Permissionless Base L2)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Custody Model
                  </td>
                  <td className="p-4">Centralized Bank Intermediary</td>
                  <td className="p-4">Centralized Account Locks</td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    ✅ 100% Non-Custodial (Your Private Keys)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 10: TECHNICAL FAQS */}
      <section
        id="sec-faqs-checkout"
        className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
          <HelpCircle className="w-4 h-4" />
          <span>Section 10 • Merchant FAQs & Global Payouts</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions for E-Commerce & SaaS Founders
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors text-sm sm:text-base"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedFaq === idx ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 11: CALL TO ACTION */}
      <section
        id="sec-cta-checkout"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sm:p-12 shadow-2xl space-y-6"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-mono font-semibold">
            <Store className="w-3.5 h-3.5" />
            <span>START ACCEPTING CRYPTO PAYMENTS IN 60 SECONDS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Replace Chargebacks with 2-Second Non-Custodial Settlements?
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            Attach A-Pay Checkout to your store or software product today. Give your global human
            customers a seamless 1-click Web3 payment experience while keeping 99% of your
            hard-earned revenue.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/checkout-demo"
              className="px-6 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-slate-100 font-bold text-sm shadow-lg shadow-black/10 transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open Full Checkout Demo Store</span>
            </a>
            <button
              type="button"
              onClick={() => onNavigateToTab?.('paywalls')}
              className="px-5 py-3 rounded-2xl bg-emerald-500/30 hover:bg-emerald-500/50 border border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Create Paywall / Payment Link</span>
            </button>
            <button
              type="button"
              onClick={handleShareOnX}
              className="px-5 py-3 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Paper on X</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 12: LEGAL & TRADEMARK NOMINATIVE FAIR USE DISCLAIMER */}
      <section
        id="sec-legal-notice"
        className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-xs space-y-2 leading-relaxed"
      >
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Legal Disclaimer & Trademark Notice (Nominative Fair Use)</span>
        </div>
        <p>
          All trademarks, registered trademarks, company names, product names, logos, and brand
          identifiers referenced across A-Pay research papers, technical guides, benchmarks, and
          documentation (including but not limited to Stripe®, PayPal®, Visa®, Mastercard®,
          Shopify®, WooCommerce®, Gumroad®, Google®, Gemini®, Anthropic®, Claude®, OpenAI®,
          ByteDance®, and Razorpay®) are the property of their respective trademark holders.
        </p>
        <p>
          Their mention herein is strictly for factual comparative analysis, architectural
          benchmarking, educational commentary, and technical interoperability under nominative fair
          use principles. A-Pay is an independent open-source protocol and is not affiliated with,
          sponsored by, or endorsed by any of the aforementioned trademark holders.
        </p>
      </section>
    </div>
  );
}
