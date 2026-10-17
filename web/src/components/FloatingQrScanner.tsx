'use client';

import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  Coins,
  ExternalLink,
  GripVertical,
  Move,
  QrCode,
  RefreshCw,
  ScanLine,
  Send,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { parsePaymentQrData } from '@/checkout/qr';
import { QrScannerModal } from '@/components/QrScannerModal';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import { fetchLiveWalletBalances, getBasename, transferTokensOrEth } from '@/services/blockchain';

interface FloatingQrScannerProps {
  walletAddress: string | null;
  activeNetwork?: NetworkId;
  onNavigateToTab?: (tab: string) => void;
  onConnectWallet?: () => void;
}

export function FloatingQrScanner({
  walletAddress,
  activeNetwork = 'base-sepolia',
  onNavigateToTab,
  onConnectWallet,
}: FloatingQrScannerProps) {
  const pathname = usePathname();
  const contracts = getNetworkContracts(activeNetwork);

  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  // Modals & Payment State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);

  // Scanned Transfer State
  const [recipient, setRecipient] = useState('');
  const [resolvedBasename, setResolvedBasename] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<'APAY' | 'ETH'>('APAY');
  const [balances, setBalances] = useState({ eth: '0.0000', apay: '0' });
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<{
    txHash: string;
    explorerUrl: string;
    amount: string;
    asset: string;
  } | null>(null);

  // Drag tracking refs
  const dragRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe Mount & Load Saved Position
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load saved coordinates if available
    try {
      const saved = localStorage.getItem('apay_floating_scanner_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.max(12, Math.min(window.innerWidth - 76, parsed.x));
          const clampedY = Math.max(68, Math.min(window.innerHeight - 76, parsed.y));
          setPosition({ x: clampedX, y: clampedY });
        }
      } else {
        // Default starting position: Left side middle, easy to reach without colliding with bottom-right Telegram bot
        setPosition({
          x: 20,
          y: Math.max(140, Math.round(window.innerHeight * 0.42)),
        });
      }
    } catch {
      // ignore JSON error
    }

    setIsMounted(true);

    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - 76, prev.x)),
        y: Math.max(68, Math.min(window.innerHeight - 76, prev.y)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Idle Timer — automatically dims opacity after 3.5s of no interaction
  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 3800);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Fetch balances when QuickPay opens or wallet changes
  useEffect(() => {
    if (!walletAddress || !isQuickPayOpen) return;
    fetchLiveWalletBalances(walletAddress as `0x${string}`, activeNetwork)
      .then((b) => setBalances({ eth: b.eth, apay: b.apay }))
      .catch(() => {});
  }, [walletAddress, activeNetwork, isQuickPayOpen]);

  // Resolve Basename if recipient changes
  useEffect(() => {
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setResolvedBasename(null);
      return;
    }
    let isCancelled = false;
    getBasename(recipient, activeNetwork).then((name) => {
      if (!isCancelled) setResolvedBasename(name);
    });
    return () => {
      isCancelled = true;
    };
  }, [recipient, activeNetwork]);

  if (!isMounted || pathname === '/tma') return null;

  // ── Drag & Click Pointer Handlers ─────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    resetIdleTimer();
    hasMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };

    // Capture pointer
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > 5) {
      hasMovedRef.current = true;
      setIsDragging(true);
      resetIdleTimer();

      const newX = Math.max(12, Math.min(window.innerWidth - 76, initialPosRef.current.x + deltaX));
      const newY = Math.max(
        68,
        Math.min(window.innerHeight - 76, initialPosRef.current.y + deltaY),
      );

      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isDragging) {
      setIsDragging(false);
      // Persist newly dragged coordinates in local storage
      try {
        localStorage.setItem('apay_floating_scanner_pos', JSON.stringify(position));
      } catch {
        // ignore
      }
    } else if (!hasMovedRef.current) {
      // Clean click / tap: Open the Camera QR Scanner!
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      } catch {
        // ignore
      }
      setIsScannerOpen(true);
    }

    resetIdleTimer();
  };

  // ── QR Scan Callback ──────────────────────────────────────────────────
  const handleScanSuccess = (decodedText: string) => {
    const parsed = parsePaymentQrData(decodedText);
    const targetAddr = parsed.address || decodedText.trim();

    setRecipient(targetAddr);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.asset) setAsset(parsed.asset);

    setSendError(null);
    setSendSuccess(null);
    setIsQuickPayOpen(true);
  };

  // ── Execute Quick Payment Transfer ─────────────────────────────────────
  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setSendError('Please connect your Web3 wallet first.');
      return;
    }

    const cleanRecipient = recipient.trim();
    if (!cleanRecipient || !/^0x[a-fA-F0-9]{40}$/.test(cleanRecipient)) {
      setSendError('Please provide a valid 42-character Base L2 EVM address (0x...).');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || Number.isNaN(numAmount)) {
      setSendError('Please enter a valid positive transfer amount.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const result = await transferTokensOrEth({
        recipient: cleanRecipient as `0x${string}`,
        amount: amount.trim(),
        asset,
        networkId: activeNetwork,
        fromAddress: walletAddress as `0x${string}`,
      });

      setSendSuccess({
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        amount: amount.trim(),
        asset,
      });

      // Refresh balances
      fetchLiveWalletBalances(walletAddress as `0x${string}`, activeNetwork).then((b) =>
        setBalances({ eth: b.eth, apay: b.apay }),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed or rejected by wallet.';
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* ── 1. DRAGGABLE FLOATING ANIMATED SCANNER FLYER ──────────────────── */}
      <div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => {
          setIsHovered(true);
          resetIdleTimer();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          resetIdleTimer();
        }}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
        className={`fixed top-0 left-0 z-40 touch-none select-none flex flex-col items-center cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
          isDragging ? 'scale-110' : ''
        } ${isIdle && !isHovered && !isDragging ? 'opacity-35 hover:opacity-100' : 'opacity-100'}`}
        role="button"
        tabIndex={0}
        aria-label="Drag to move QR scanner flyer, click to scan payment QR"
      >
        {/* Sleek Floating Hover Speech / Label Badge */}
        <div
          className={`mb-1 px-2.5 py-0.5 rounded-full border backdrop-blur-xl shadow-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all duration-300 pointer-events-none whitespace-nowrap ${
            isHovered || isDragging || !isIdle
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          } bg-slate-950/90 border-cyan-500/50 text-cyan-300 shadow-cyan-950/60`}
        >
          <GripVertical className="w-2.5 h-2.5 opacity-60 text-slate-400" />
          <Zap className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
          <span>Scan to Pay</span>
        </div>

        {/* Outer Animated HUD / Holographic Reticle Ring */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          {/* Outer Rotating Conic-Gradient Laser Ring */}
          <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-500 animate-[spin_8s_linear_infinite] shadow-[0_0_20px_rgba(34,211,238,0.5)]" />

          {/* Glowing Ambient Radial Backdrop */}
          <div
            className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${
              isHovered || isDragging ? 'bg-cyan-500/60 scale-125' : 'bg-blue-500/30 scale-100'
            }`}
          />

          {/* Inner Cyberpunk Scanner Orb */}
          <div className="relative w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] rounded-full bg-slate-950 border border-cyan-400/60 flex items-center justify-center overflow-hidden shadow-inner">
            {/* Horizontal Sweeping Laser Scanline */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-pulse" />

            {/* Futuristic Corner Targeting Brackets */}
            <div className="absolute inset-2 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <span className="w-1.5 h-1.5 border-t border-l border-cyan-400" />
                <span className="w-1.5 h-1.5 border-t border-r border-cyan-400" />
              </div>
              <div className="flex justify-between">
                <span className="w-1.5 h-1.5 border-b border-l border-cyan-400" />
                <span className="w-1.5 h-1.5 border-b border-r border-cyan-400" />
              </div>
            </div>

            {/* Core Icon: Animated Scanner Reticle */}
            <div className="flex items-center justify-center text-cyan-400 transition-transform duration-200 group-hover:scale-110">
              <ScanLine className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
            </div>

            {/* Center Aperture Dot */}
            <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </div>

          {/* Small Corner Badge: Camera / Live Status */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-[8px] font-bold text-white items-center justify-center border border-white dark:border-slate-900 shadow-md">
              <Camera className="w-2.5 h-2.5" />
            </span>
          </span>
        </div>
      </div>

      {/* ── 2. LIVE CAMERA SCANNER MODAL ─────────────────────────────────── */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />

      {/* ── 3. QUICK ON-CHAIN PAYMENT SHEET MODAL ───────────────────────── */}
      {isQuickPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Instant QR Payment</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-300 border border-blue-500/20">
                      {contracts.chain.shortName}
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Cryptographically sign & settle micro-payment on Base L2
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickPayOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close Quick Pay Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSendTransfer} className="p-5 sm:p-6 space-y-4">
              {/* Scanned Recipient Target */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient EVM Address:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickPayOpen(false);
                      setIsScannerOpen(true);
                    }}
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-500 transition-colors"
                    title="Re-scan QR code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {resolvedBasename && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Verified Basename: {resolvedBasename}</span>
                  </div>
                )}
              </div>

              {/* Currency Selector & Amount */}
              <div className="grid grid-cols-2 gap-3">
                {/* Asset Select */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Currency:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAsset('APAY')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        asset === 'APAY'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      $APAY
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsset('ETH')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        asset === 'ETH'
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-sky-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      ETH
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Amount:</span>
                    <span className="text-[10px] text-slate-400">
                      Bal: {asset === 'APAY' ? balances.apay : balances.eth}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={asset === 'APAY' ? 'e.g. 5.0' : 'e.g. 0.001'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const raw =
                          asset === 'APAY' ? balances.apay.replace(/,/g, '') : balances.eth;
                        setAmount(raw);
                      }}
                      className="absolute right-2 top-2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {sendError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Success Receipt */}
              {sendSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      Payment of {sendSuccess.amount} {sendSuccess.asset} Settled!
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="truncate max-w-[220px]">{sendSuccess.txHash}</span>
                    <a
                      href={sendSuccess.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1 font-bold shrink-0"
                    >
                      <span>BaseScan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                {!walletAddress ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickPayOpen(false);
                      onConnectWallet?.();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Wallet to Pay</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSending || !recipient || !amount}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Broadcasting to Base L2...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm & Send Payment</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Link to Full Profile Hub */}
              {onNavigateToTab && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickPayOpen(false);
                      onNavigateToTab('profile');
                    }}
                    className="text-[11px] font-mono text-blue-600 dark:text-sky-400 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <span>Open full Identity & Profile Terminal</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
