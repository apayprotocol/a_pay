'use client';

import Image from 'next/image';
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
  const sizeMap: Record<string, { container: string; pixelSize: number; textClass: string }> = {
    sm: { container: 'w-8 h-8 rounded-xl', pixelSize: 32, textClass: 'text-sm' },
    md: { container: 'w-10 h-10 rounded-2xl', pixelSize: 40, textClass: 'text-lg sm:text-xl' },
    lg: { container: 'w-12 h-12 rounded-2xl', pixelSize: 48, textClass: 'text-xl sm:text-2xl' },
    xl: { container: 'w-16 h-16 rounded-3xl', pixelSize: 64, textClass: 'text-2xl sm:text-3xl' },
  };

  const currentSize =
    typeof size === 'number'
      ? {
          container: `w-[${size}px] h-[${size}px] rounded-2xl`,
          pixelSize: size,
          textClass: 'text-base',
        }
      : sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-3 select-none ${className}`}>
      {/* Brand Mark Container */}
      <div
        className={`relative ${currentSize.container} shrink-0 bg-[#07080B] border border-slate-800/90 p-0.5 flex items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden ${
          withGlow
            ? 'shadow-md shadow-blue-600/30 hover:shadow-blue-500/50 hover:border-blue-500/60'
            : ''
        }`}
      >
        {/* Subtle Ambient Radial Glow */}
        {withGlow && (
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/25 via-sky-500/15 to-indigo-600/25 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        {/* Orbiting Tech Ring Highlight */}
        {animated && (
          <div className="absolute inset-0 rounded-[inherit] border border-sky-400/20 group-hover:border-sky-400/40 transition-colors pointer-events-none" />
        )}

        {/* Official Crisp Brand Mark */}
        <Image
          src="/brand/apay-official-logo.png"
          alt="A-Pay Protocol Logo"
          width={currentSize.pixelSize * 2}
          height={currentSize.pixelSize * 2}
          className={`relative z-10 w-full h-full object-contain rounded-[inherit] transition-transform duration-300 ${
            animated ? 'group-hover:scale-105' : ''
          }`}
          priority
        />
      </div>

      {/* Typography Wordmark if requested */}
      {withText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`font-spatial font-black text-slate-900 dark:text-white tracking-wider truncate ${currentSize.textClass}`}
            >
              A-PAY
            </span>
            <span className="hidden xs:inline text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 font-bold uppercase tracking-wider shrink-0">
              M2M
            </span>
          </div>
          {subtitle ? (
            <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight truncate">
              {subtitle}
            </span>
          ) : (
            <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight truncate">
              Base L2 Settlement
            </span>
          )}
        </div>
      )}
    </div>
  );
}
