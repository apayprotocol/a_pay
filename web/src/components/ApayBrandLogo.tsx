'use client';

import React from 'react';

interface ApayBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  animated?: boolean;
  withGlow?: boolean;
  withText?: boolean;
  className?: string;
  subtitle?: string;
}

export function ApayBrandLogo({
  size = 'md',
  animated = true,
  withGlow = true,
  withText = false,
  className = '',
  subtitle,
}: ApayBrandLogoProps) {
  // Dimension mapping
  const sizeMap: Record<string, { container: string; iconSize: number; textClass: string }> = {
    sm: { container: 'w-7 h-7 rounded-xl', iconSize: 28, textClass: 'text-sm' },
    md: { container: 'w-10 h-10 rounded-2xl', iconSize: 40, textClass: 'text-lg sm:text-xl' },
    lg: { container: 'w-12 h-12 rounded-2xl', iconSize: 48, textClass: 'text-xl sm:text-2xl' },
    xl: { container: 'w-16 h-16 rounded-3xl', iconSize: 64, textClass: 'text-2xl sm:text-3xl' },
  };

  const currentSize =
    typeof size === 'number'
      ? {
          container: `w-[${size}px] h-[${size}px] rounded-2xl`,
          iconSize: size,
          textClass: 'text-base',
        }
      : sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Animated Brand Mark Container */}
      <div
        className={`relative ${currentSize.container} shrink-0 bg-[#07080B] border border-slate-800/80 p-1 flex items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden ${
          withGlow
            ? 'shadow-md shadow-blue-600/25 hover:shadow-blue-500/40 hover:border-blue-500/50'
            : ''
        }`}
      >
        {/* Subtle Ambient Radial Glow */}
        {withGlow && (
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-sky-500/10 to-indigo-600/20 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Orbiting Tech Ring Highlight */}
        {animated && (
          <div className="absolute inset-0 rounded-[inherit] border border-sky-400/20 animate-pulse pointer-events-none" />
        )}

        {/* Official Concept 3 Vector Mark */}
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          className={`relative z-10 transition-transform duration-300 ${
            animated ? 'group-hover:scale-105' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="apayBlueRailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0052FF" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="apayWhiteLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>
            <filter id="apayMarkGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Precision Circular Track Ring */}
          <circle
            cx="256"
            cy="256"
            r="216"
            fill="none"
            stroke="#151821"
            strokeWidth="3"
            strokeDasharray="6 4"
            opacity="0.7"
          />

          <g transform="translate(256, 256)" filter={withGlow ? 'url(#apayMarkGlow)' : undefined}>
            {/* Left Ascending Rail (Base Cobalt Blue #0052FF) */}
            <path
              d="M-115,130 L-25,-120 C-15,-150 15,-150 25,-120 L55,-35 L10,-35 L-6,-85 L-70,105 L-115,130 Z"
              fill="url(#apayBlueRailGrad)"
            />

            {/* Right Descending & Infinite M2M Payment Loop (Crisp Pure White) */}
            <path
              d="M115,130 L25,-120 C18,-140 0,-140 -5,-125 L-25,-65 L20,-65 L60,50 L-40,50 C-60,50 -75,35 -75,15 C-75,-5 -60,-20 -40,-20 L-10,-20 L-2,-50 L-40,-50 C-75,-50 -105,-20 -105,15 C-105,50 -75,80 -40,80 L70,80 L85,130 Z"
              fill="url(#apayWhiteLoopGrad)"
            />
          </g>
        </svg>

        {/* Live Status Indicator Dot */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 z-20" />
      </div>

      {/* Typography Wordmark if requested */}
      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-spatial font-black text-slate-900 dark:text-white tracking-wider ${currentSize.textClass}`}
            >
              A-PAY
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 font-bold uppercase tracking-wider">
              M2M
            </span>
          </div>
          {subtitle ? (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight">
              {subtitle}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight">
              Base L2 Settlement
            </span>
          )}
        </div>
      )}
    </div>
  );
}
