'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';

// SSR-safe dynamic import — zero LCP impact
const AlienBotCanvas = dynamic(
  () => import('./3d/AlienBotCanvas').then((mod) => mod.AlienBotCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
      </div>
    ),
  },
);

const BOT_USERNAME = 'APay_Protocol_Bot';
const TELEGRAM_APP_URL = `tg://resolve?domain=${BOT_USERNAME}`;
const TELEGRAM_WEB_URL = `https://t.me/${BOT_USERNAME}`;

export function AlienBotFlyer() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect dark mode
    const checkDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(checkDark());

    const themeObserver = new MutationObserver(() => setIsDark(checkDark()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Device detection: Mobile (iOS, Android) vs Desktop
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.maxTouchPoints > 2 && /Macintosh/i.test(ua))
      );
    };
    setIsMobile(checkMobile());

    const startMount = () => setIsMounted(true);
    if ('requestIdleCallback' in window) {
      const handle = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(startMount, { timeout: 1200 });
      return () => {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
          handle,
        );
        themeObserver.disconnect();
      };
    }
    const t = setTimeout(startMount, 600);
    return () => {
      clearTimeout(t);
      themeObserver.disconnect();
    };
  }, []);

  if (!isMounted || pathname === '/tma') return null;
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
    return null;
  }

  // ── Device-Adaptive Dual Mode Telegram Launch ──────────────────────────────
  // Mobile: Invokes tg:// native scheme directly (no blank tab spawned, no reload error)
  // Desktop: Standard target="_blank" to https://t.me/APay_Protocol_Bot
  const handleOpenTelegram = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      // Prevent browser from opening a new tab or reloading current page into error
      e.preventDefault();

      const startTime = Date.now();
      // Launch native Telegram app immediately
      window.location.href = TELEGRAM_APP_URL;

      // Graceful fallback to web link only if Telegram app is not installed after 1200ms
      setTimeout(() => {
        if (!document.hidden && Date.now() - startTime < 2500) {
          window.location.href = TELEGRAM_WEB_URL;
        }
      }, 1200);
    }
  };

  return (
    <div
      className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 select-none flex flex-col items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={isMobile ? TELEGRAM_APP_URL : TELEGRAM_WEB_URL}
        target={isMobile ? undefined : '_blank'}
        rel="noopener noreferrer"
        onClick={handleOpenTelegram}
        title="Launch A-Pay AI Assistant on Telegram (@APay_Protocol_Bot)"
        aria-label="Launch official A-Pay Protocol Assistant on Telegram (@APay_Protocol_Bot)"
        className="group relative flex items-center justify-center cursor-pointer focus:outline-none active:scale-95 transition-transform duration-200"
      >
        {/* Sleek Cyber Orb Housing — Matched size with QR Scanner (w-14 h-14 / w-16 h-16) */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
          {/* Outer Rotating Conic-Gradient Ring */}
          <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-500 animate-[spin_10s_linear_infinite] shadow-[0_0_20px_rgba(34,158,217,0.5)]" />

          {/* Ambient Radial Glow */}
          <div
            className={`absolute inset-0 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
              isHovered ? 'bg-sky-500/60 scale-125' : 'bg-blue-500/30 scale-100'
            }`}
          />

          {/* Inner Cyber Face Orb Viewport (Zero clipping, compact circular cyber face) */}
          <div className="relative w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] rounded-full bg-slate-950/90 border border-sky-400/60 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Procedural 3D Alien Face Canvas (Only the Face & Expressive HUD Eyes) */}
            <AlienBotCanvas isHovered={isHovered} isDark={isDark} />
          </div>

          {/* Sleek Corner Badge: Official Telegram Icon (Instant Brand Recognition, Zero Text Clutter) */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 pointer-events-none">
            <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-[#229ED9] text-white items-center justify-center border-2 border-white dark:border-slate-950 shadow-md">
              <svg
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current ml-[0.5px]"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.945z" />
              </svg>
            </span>
          </span>
        </div>
      </a>
    </div>
  );
}
