'use client';

import { ExternalLink, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// SSR-safe dynamic import — zero LCP impact
const AlienBotCanvas = dynamic(
  () => import('./3d/AlienBotCanvas').then((mod) => mod.AlienBotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    ),
  },
);

const TELEGRAM_BOT_URL = 'https://telegram.me/APay_Protocol_Bot';

export function AlienBotFlyer() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Deferred mount via requestIdleCallback — keeps initial LCP 100% clean
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(checkDark());

    const themeObserver = new MutationObserver(() => setIsDark(checkDark()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const startMount = () => setIsMounted(true);
    if ('requestIdleCallback' in window) {
      const handle = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(startMount, { timeout: 1500 });
      return () => {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
          handle,
        );
        themeObserver.disconnect();
      };
    }
    const t = setTimeout(startMount, 800);
    return () => {
      clearTimeout(t);
      themeObserver.disconnect();
    };
  }, []);

  if (!isMounted || pathname === '/tma') return null;
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
    return null;
  }

  const handleOpenTelegram = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Universal mobile link: direct navigation to t.me launches native Telegram app on iOS/Android without triggering browser popup blockers
        window.location.href = 'https://t.me/APay_Protocol_Bot';
        e.preventDefault();
      }
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none flex flex-col items-end"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Alien Mascot Interactive Button — Direct Telegram Landing (Zero Popup) */}
      <a
        href={TELEGRAM_BOT_URL}
        onClick={handleOpenTelegram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Launch official A-Pay Protocol Assistant on Telegram (@APay_Protocol_Bot)"
        className="group relative flex flex-col items-end cursor-pointer focus:outline-none active:scale-95 transition-transform duration-150"
      >
        {/* Sleek Floating Hover Speech Teaser */}
        <div
          className={`mb-1.5 px-3 py-1 rounded-full border backdrop-blur-xl shadow-lg text-[10px] sm:text-[11px] font-sans font-semibold flex items-center gap-1.5 transition-all duration-300 pointer-events-none ${
            isDark
              ? 'bg-slate-950/95 border-blue-500/40 text-sky-300 shadow-blue-950/70'
              : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
          } ${isHovered ? 'scale-105 opacity-100' : 'opacity-90'}`}
        >
          <Sparkles className="w-3 h-3 text-[#229ED9] animate-pulse shrink-0" />
          <span>Chat on Telegram</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 text-[#229ED9] shrink-0" />
        </div>

        {/* 3D Model Viewport Container */}
        <div className="relative w-[130px] h-[142px] sm:w-[150px] sm:h-[164px] flex items-center justify-center">
          {/* Dynamic Online Notification Dot */}
          <span className="absolute top-1 right-2 z-10 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#229ED9] text-[8px] font-bold text-white items-center justify-center shadow-lg shadow-sky-500/50">
              1
            </span>
          </span>

          {/* Dynamic Ambient Radial Glow */}
          <div
            className={`absolute inset-0 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              isDark ? 'bg-blue-500/30 opacity-95' : 'bg-blue-500/25 opacity-90'
            } ${isHovered ? 'scale-125 opacity-100' : ''}`}
          />

          {/* Procedural 3D Alien Canvas */}
          <AlienBotCanvas isHovered={isHovered} isDark={isDark} />

          {/* High-Contrast Brand Label Badge */}
          <div
            className={`absolute -bottom-1.5 px-3.5 py-1 rounded-full border backdrop-blur-xl shadow-lg flex items-center gap-1.5 pointer-events-none text-[10px] font-mono font-bold transition-all ${
              isDark
                ? 'bg-slate-950/95 border-blue-500/50 text-sky-300 shadow-blue-950/60'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
            } ${isHovered ? 'border-sky-400 ring-2 ring-sky-500/20' : ''}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#229ED9] font-sans font-bold">@APay_Protocol_Bot</span>
            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5 text-[#229ED9]" />
          </div>
        </div>
      </a>
    </div>
  );
}
