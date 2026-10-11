'use client';

import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  Code,
  Copy,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Send,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { APay, type PaymentReceipt } from '@/checkout/checkout';
import type { NetworkId } from '@/config/contracts';

export function ApiKeysTab({
  walletAddress,
  activeNetwork = 'base-sepolia',
}: {
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
}) {
  const [webhookUrl, setWebhookUrl] = useState('https://httpbin.org/post');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    durationMs?: number;
    error?: string;
    signature?: string;
    payload?: any;
    body?: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copiedPk, setCopiedPk] = useState(false);
  const [copiedSk, setCopiedSk] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDC' | 'APAY' | 'DUAL'>('DUAL');
  const [testAmountUsdc, setTestAmountUsdc] = useState('10.00');
  const [testAmountApay, setTestAmountApay] = useState('80.00');
  const [checkoutSuccess, setCheckoutSuccess] = useState<PaymentReceipt | null>(null);

  const [webhookLang, setWebhookLang] = useState<'node' | 'python' | 'go'>('node');
  const [webhookEventType, setWebhookEventType] = useState<
    'payment.successful' | 'order.created' | 'agent.budget_depleted'
  >('payment.successful');
  const [copiedCodeLang, setCopiedCodeLang] = useState(false);

  const [pkKey, setPkKey] = useState<string>('');
  const [skKey, setSkKey] = useState<string>('');

  const storageKey = `apay_credentials_${walletAddress ? walletAddress.toLowerCase() : 'default'}`;

  // Generate or load real cryptographic API keys
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPkKey(parsed.pk);
          setSkKey(parsed.sk);
          return;
        }
      } catch {
        // fallback to generate
      }
      generateNewKeyPair();
    }
  }, [storageKey]);

  const generateNewKeyPair = () => {
    const randomBytes = () => {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    };

    const newPk = `pk_live_${randomBytes()}`;
    const newSk = `sk_live_secret_${randomBytes()}${randomBytes().slice(0, 8)}`;

    setPkKey(newPk);
    setSkKey(newSk);

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify({ pk: newPk, sk: newSk }));
    }
  };

  const handleCurrencyChange = (curr: 'USDC' | 'APAY' | 'DUAL') => {
    setSelectedCurrency(curr);
  };

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTestWebhook = async () => {
    setIsSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhook-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          amount: selectedCurrency === 'APAY' ? testAmountApay : testAmountUsdc,
          amountApay: selectedCurrency === 'DUAL' ? testAmountApay : undefined,
          currency: selectedCurrency,
          secretKey: skKey,
          network: activeNetwork,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          error: data.error || 'Server rejected webhook dispatch.',
          signature: data.signature,
          payload: data.sentPayload,
        });
      } else {
        setTestResult({
          success: true,
          statusCode: data.statusCode,
          durationMs: data.durationMs,
          signature: data.signature,
          payload: data.sentPayload,
          body: data.responseBody,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: `Network error: ${err?.message || 'Failed to dispatch webhook'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLaunchCheckout = () => {
    setCheckoutSuccess(null);
    const amountVal =
      selectedCurrency === 'APAY'
        ? parseFloat(testAmountApay) || 80.0
        : parseFloat(testAmountUsdc) || 10.0;
    const amountApayVal = parseFloat(testAmountApay) || 80.0;

    APay.checkout({
      amount: amountVal,
      amountApay: selectedCurrency === 'DUAL' ? amountApayVal : undefined,
      currency: selectedCurrency,
      network: activeNetwork === 'base-mainnet' ? 'base' : 'base-sepolia',
      title: 'A-Pay Live Merchant Sandbox',
      orderId: `ord_${Math.floor(100000 + Math.random() * 900000)}`,
      onSuccess: async (receipt) => {
        setCheckoutSuccess(receipt);
        // Automatically dispatch real-time webhook if endpoint is configured
        if (webhookUrl?.trim() && skKey) {
          try {
            const res = await fetch('/api/webhook-dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: webhookUrl.trim(),
                amount: receipt.amount,
                currency: receipt.currency,
                secretKey: skKey,
              }),
            });
            const data = await res.json();
            if (data.success) {
              setTestResult({
                success: true,
                statusCode: data.statusCode,
                durationMs: data.durationMs,
                signature: data.signature,
                payload: data.sentPayload,
                body: data.responseBody,
              });
            }
          } catch {
            // Non-blocking background notification
          }
        }
      },
    });
  };

  const embedSnippet = `<!-- 1. Include A-Pay Checkout Bundle in <head> -->
<script src="https://apay-network.vercel.app/checkout.js" data-key="${pkKey}"></script>

<!-- 2. Launch 1-Click Autonomous Checkout Modal (${selectedCurrency === 'DUAL' ? 'DUAL: Accepts USDC & $APAY' : selectedCurrency}) -->
<button onclick="APay.checkout({
  amount: ${selectedCurrency === 'APAY' ? testAmountApay : testAmountUsdc},
  ${selectedCurrency === 'DUAL' ? `amountApay: ${testAmountApay},\n  ` : ''}currency: '${selectedCurrency}',
  title: 'My Store Order',
  orderId: 'ord_12345'
})">
  Pay with ${selectedCurrency === 'DUAL' ? 'Crypto (USDC or $APAY)' : selectedCurrency === 'APAY' ? '$APAY (Save 20%)' : 'A-Pay (USDC)'}
</button>`;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-spatial text-3xl font-black text-slate-900 dark:text-white">
            API Keys & Webhooks (H2B Checkout)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drop-in zero-chargeback crypto checkout gateway for e-commerce, SaaS, and digital
            merchant sites.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateNewKeyPair}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rotate Keys</span>
          </button>
          <Link
            href="/checkout-demo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-sky-300 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-sm"
          >
            <span>Open Checkout Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Keys Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-blue-600 dark:text-sky-400">
              Publishable Key (Client-Side)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-mono font-bold">
              Active
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
              {pkKey || 'Generating...'}
            </span>
            <button
              onClick={() => copyText(pkKey, setCopiedPk)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              {copiedPk ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use this public key in your frontend checkout widget and mobile React Native SDK.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
              Secret API Key (Server-Side HMAC)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 font-mono font-bold">
              Restricted
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
              {showSecret
                ? skKey
                : skKey
                  ? `${skKey.slice(0, 10)}${'•'.repeat(24)}`
                  : 'Generating...'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title={showSecret ? 'Hide Key' : 'Reveal Key'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => copyText(skKey, setCopiedSk)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                {copiedSk ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep this key confidential on your backend for verifying HMAC webhook signatures.
          </p>
        </div>
      </div>

      {/* 1-Click Embed Snippet + Live Test Drive Sandbox */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-spatial text-lg font-bold text-slate-900 dark:text-white">
                Live Interactive Checkout Sandbox
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Test the actual embeddable modal with real Web3 wallet interaction and dynamic QR
                scans.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Rail Toggle */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleCurrencyChange('APAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCurrency === 'APAY'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚡ $APAY
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('USDC')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCurrency === 'USDC'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                💵 USDC
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('DUAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCurrency === 'DUAL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🌐 DUAL
              </button>
            </div>

            {/* Price Inputs */}
            {selectedCurrency !== 'APAY' && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-blue-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={testAmountUsdc}
                  onChange={(e) => setTestAmountUsdc(e.target.value)}
                  className="w-16 sm:w-20 bg-transparent text-xs font-mono font-bold focus:outline-none text-slate-900 dark:text-white"
                  title="USDC Amount"
                />
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  USDC
                </span>
              </div>
            )}

            {selectedCurrency !== 'USDC' && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/60">
                <span className="text-xs font-mono font-bold text-amber-500">⚡</span>
                <input
                  type="number"
                  step="1.0"
                  value={testAmountApay}
                  onChange={(e) => setTestAmountApay(e.target.value)}
                  className="w-16 sm:w-20 bg-transparent text-xs font-mono font-bold focus:outline-none text-slate-900 dark:text-white"
                  title="$APAY Amount"
                />
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  $APAY
                </span>
              </div>
            )}

            <button
              onClick={handleLaunchCheckout}
              className={`butter-button px-5 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer ${
                selectedCurrency === 'DUAL'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                  : selectedCurrency === 'APAY'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700'
              }`}
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                Launch Live Checkout (
                {selectedCurrency === 'DUAL' ? 'DUAL: $APAY & USDC' : selectedCurrency})
              </span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {checkoutSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Payment Settled on Base L2!
              </div>
              <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Tx: {checkoutSuccess.txHash} ({checkoutSuccess.amount} {checkoutSuccess.currency})
              </div>
            </div>
            <a
              href={`${
                checkoutSuccess.network === 'base' || activeNetwork === 'base-mainnet'
                  ? 'https://basescan.org'
                  : 'https://sepolia.basescan.org'
              }/tx/${checkoutSuccess.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold underline text-emerald-700 dark:text-emerald-300 hover:opacity-80"
            >
              <span>View on Basescan</span>
            </a>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
            <Code className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            Drop-in HTML Snippet (Zero Dependencies)
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs overflow-x-auto whitespace-pre">
            {embedSnippet}
          </div>
        </div>
      </div>

      {/* Webhook Test Dispatcher */}
      <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold font-spatial text-slate-900 dark:text-white">
            <Bell className="w-4 h-4 text-emerald-500" />
            Live Webhook HMAC Event Dispatcher
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold">
            Real HTTP POST
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sends an authentic signed HTTP POST request with `X-APay-Signature: sha256=...` to your
          webhook endpoint.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Simulation Event:
          </span>
          {(['payment.successful', 'order.created', 'agent.budget_depleted'] as const).map(
            (evt) => (
              <button
                key={evt}
                type="button"
                onClick={() => setWebhookEventType(evt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                  webhookEventType === evt
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {evt}
              </button>
            ),
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-backend.com/api/apay-webhook"
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendTestWebhook}
            disabled={isSending}
            className="butter-button px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
            {isSending ? 'Dispatching Live Webhook...' : 'Dispatch Live Webhook'}
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded-2xl bg-slate-900 text-xs font-mono space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2 font-bold text-slate-200">
                {testResult.success ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                {testResult.success
                  ? `Delivered: HTTP ${testResult.statusCode} (${testResult.durationMs}ms)`
                  : 'Delivery Failed'}
              </span>
              {testResult.signature && (
                <span className="text-[10px] text-slate-400 truncate max-w-xs">
                  {testResult.signature.slice(0, 20)}...
                </span>
              )}
            </div>

            {testResult.error && (
              <div className="text-rose-400 leading-relaxed">{testResult.error}</div>
            )}

            {testResult.payload && (
              <div className="text-emerald-400 overflow-x-auto whitespace-pre">
                {JSON.stringify(testResult.payload, null, 2)}
              </div>
            )}

            {testResult.body && (
              <div className="pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
                <div className="text-slate-500 mb-1">Receiver Response Body:</div>
                <div className="truncate">{testResult.body}</div>
              </div>
            )}
          </div>
        )}

        {/* Server-Side HMAC Verification Guides */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-blue-500" />
              <span>Server-Side HMAC Signature Verification Recipes</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWebhookLang('node')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  webhookLang === 'node'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Node.js
              </button>
              <button
                type="button"
                onClick={() => setWebhookLang('python')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  webhookLang === 'python'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Python
              </button>
              <button
                type="button"
                onClick={() => setWebhookLang('go')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  webhookLang === 'go'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Go
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span>
                {webhookLang === 'node'
                  ? 'verify-webhook.js (Express)'
                  : webhookLang === 'python'
                    ? 'verify_webhook.py (FastAPI)'
                    : 'verify_webhook.go'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const code =
                    webhookLang === 'node'
                      ? `import crypto from 'node:crypto';\n\napp.post('/api/apay-webhook', express.raw({ type: 'application/json' }), (req, res) => {\n  const sig = req.headers['x-apay-signature']; // "sha256=..."\n  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.APAY_SECRET_KEY).update(req.body).digest('hex');\n  if (sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {\n    const event = JSON.parse(req.body.toString('utf8'));\n    console.log('✅ Payment Confirmed:', event.data.order_id);\n    return res.status(200).json({ received: true });\n  }\n  return res.status(401).send('Invalid Signature');\n});`
                      : webhookLang === 'python'
                        ? `import hmac, hashlib\nfrom fastapi import FastAPI, Request, HTTPException\n\n@app.post("/api/apay-webhook")\nasync def handle_webhook(request: Request):\n    sig = request.headers.get("X-APay-Signature") # "sha256=..."\n    raw_body = await request.body()\n    expected = "sha256=" + hmac.new(SECRET_KEY.encode(), raw_body, hashlib.sha256).hexdigest()\n    if not hmac.compare_digest(sig or "", expected):\n        raise HTTPException(status_code=401, detail="Invalid signature")\n    event = await request.json()\n    return {"received": True}`
                        : `func handleWebhook(w http.ResponseWriter, r *http.Request) {\n    sig := r.Header.Get("X-APay-Signature")\n    body, _ := io.ReadAll(r.Body)\n    mac := hmac.New(sha256.New, []byte(secretKey))\n    mac.Write(body)\n    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))\n    if !hmac.Equal([]byte(sig), []byte(expected)) {\n        http.Error(w, "Invalid signature", http.StatusUnauthorized)\n        return\n    }\n    w.WriteHeader(http.StatusOK)\n}`;
                  copyText(code, setCopiedCodeLang);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedCodeLang ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedCodeLang ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="text-slate-300 leading-relaxed whitespace-pre">
              {webhookLang === 'node' &&
                `import crypto from 'node:crypto';\n\napp.post('/api/apay-webhook', express.raw({ type: 'application/json' }), (req, res) => {\n  const sig = req.headers['x-apay-signature']; // "sha256=..."\n  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.APAY_SECRET_KEY)\n    .update(req.body)\n    .digest('hex');\n\n  // Constant-time check prevents timing attacks\n  if (sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {\n    const event = JSON.parse(req.body.toString('utf8'));\n    console.log('✅ Payment Confirmed:', event.data.order_id);\n    return res.status(200).json({ received: true });\n  }\n  return res.status(401).send('Invalid Signature');\n});`}
              {webhookLang === 'python' &&
                `import hmac, hashlib\nfrom fastapi import FastAPI, Request, HTTPException\n\n@app.post("/api/apay-webhook")\nasync def handle_webhook(request: Request):\n    sig = request.headers.get("X-APay-Signature") # "sha256=..."\n    raw_body = await request.body()\n    expected = "sha256=" + hmac.new(\n        SECRET_KEY.encode(), raw_body, hashlib.sha256\n    ).hexdigest()\n\n    if not hmac.compare_digest(sig or "", expected):\n        raise HTTPException(status_code=401, detail="Invalid HMAC signature")\n\n    event = await request.json()\n    print("✅ Payment Confirmed:", event["data"]["order_id"])\n    return {"received": True}`}
              {webhookLang === 'go' &&
                `func handleWebhook(w http.ResponseWriter, r *http.Request) {\n    sig := r.Header.Get("X-APay-Signature")\n    body, _ := io.ReadAll(r.Body)\n    mac := hmac.New(sha256.New, []byte(secretKey))\n    mac.Write(body)\n    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))\n\n    if !hmac.Equal([]byte(sig), []byte(expected)) {\n        http.Error(w, "Invalid signature", http.StatusUnauthorized)\n        return\n    }\n    w.WriteHeader(http.StatusOK)\n}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
