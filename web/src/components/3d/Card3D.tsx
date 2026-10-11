'use client';

import { Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export function Card3D({
  walletAddress,
  tokenBalance,
  isFounder,
}: {
  walletAddress?: string | null;
  tokenBalance?: string;
  isFounder?: boolean;
}) {
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    setRotY((x / card.width) * 22);
    setRotX(-(y / card.height) * 22);
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
  };

  const isConnected = Boolean(walletAddress);
  const displayAddr =
    isConnected && walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Not Connected';

  // State-specific styling
  const gradientBg = isFounder
    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #d97706 100%)'
    : isConnected
      ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 50%, #0284c7 100%)'
      : 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)';

  const glowShadow = isFounder
    ? '0 25px 50px -12px rgba(245, 158, 11, 0.35), 0 0 0 1px rgba(251, 191, 36, 0.3)'
    : isConnected
      ? '0 25px 50px -12px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(52, 211, 153, 0.2)'
      : '0 25px 50px -12px rgba(14, 165, 233, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)';

  return (
    <div
      className="perspective-1000 w-full max-w-md mx-auto cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative h-56 rounded-3xl p-6 text-white overflow-hidden transition-transform duration-200 ease-out shadow-2xl"
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformStyle: 'preserve-3d',
          background: gradientBg,
          boxShadow: glowShadow,
        }}
      >
        {/* Holographic Gloss Sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + rotY * 2}% ${50 - rotX * 2}%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)`,
          }}
        />

        {/* Card Header */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-sky-300 font-bold">
                A-Pay Protocol
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {isFounder
                  ? '👑 Founder Master Enclave'
                  : isConnected
                    ? 'Merchant Settled Vault'
                    : '🔒 Non-Custodial Vault (Locked)'}
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${
              isFounder
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                : isConnected
                  ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                  : 'bg-slate-700/50 border border-slate-600/40 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            {isFounder ? 'Protocol Master' : isConnected ? 'Base L2 Active' : 'Connect to Unlock'}
          </div>
        </div>

        {/* EMV Microchip graphic */}
        <div className="mt-4 flex items-center gap-3 relative z-10">
          <div
            className={`w-10 h-7 rounded-lg border shadow-inner flex items-center justify-center ${
              isFounder
                ? 'bg-gradient-to-tr from-amber-400 to-amber-200 border-amber-500/70'
                : isConnected
                  ? 'bg-gradient-to-tr from-emerald-400 to-emerald-200 border-emerald-500/70'
                  : 'bg-gradient-to-tr from-slate-400 to-slate-200 border-slate-500/60'
            }`}
          >
            <Cpu className="w-5 h-5 text-slate-800/70" />
          </div>
          <div className="text-[11px] font-mono text-slate-300 tracking-wider">
            {isFounder
              ? 'FOUNDER ALLOCATION VAULT'
              : isConnected
                ? 'EIP-712 CRYPTO VAULT'
                : 'GUEST MODE • READ ONLY'}
          </div>
        </div>

        {/* Card Balance & Details */}
        <div className="mt-5 flex justify-between items-end relative z-10">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300">
              {isFounder
                ? 'Total Founder Allocation'
                : isConnected
                  ? 'Your $APAY Balance'
                  : 'Wallet Balance'}
            </div>
            <div className="text-2xl font-black tracking-tight font-spatial text-white drop-shadow-md">
              {isConnected ? tokenBalance || '0' : '0.00'}{' '}
              <span className="text-sm font-semibold text-sky-400">$APAY</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-300">
              {isFounder ? 'Founder' : 'Owner'}
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">{displayAddr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
