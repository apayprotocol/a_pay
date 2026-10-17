'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppState {
  isAvailable: boolean;
  user: TelegramUser | null;
  initData: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  haptic: {
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
}

export function useTelegramWebApp(): TelegramWebAppState {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [themeParams, setThemeParams] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      setIsAvailable(true);
      try {
        tg.ready?.();
        tg.expand?.();
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#07080b');
        }
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor('#07080b');
        }
      } catch (err) {
        console.warn('[TMA] Error during WebApp initialization:', err);
      }

      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
      if (tg.initData) {
        setInitData(tg.initData);
      }
      if (tg.colorScheme) {
        setColorScheme(tg.colorScheme);
      }
      if (tg.themeParams) {
        setThemeParams(tg.themeParams);
      }
    }
  }, []);

  const ready = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).Telegram?.WebApp?.ready?.();
    }
  }, []);

  const expand = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).Telegram?.WebApp?.expand?.();
    }
  }, []);

  const close = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).Telegram?.WebApp?.close?.();
    }
  }, []);

  const impact = useCallback(
    (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      if (typeof window !== 'undefined') {
        (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
      }
    },
    [],
  );

  const notification = useCallback((type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined') {
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);
    }
  }, []);

  const selection = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    }
  }, []);

  const openTelegramLink = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  }, []);

  const openLink = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openLink) {
        tg.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  }, []);

  return {
    isAvailable,
    user,
    initData,
    colorScheme,
    themeParams,
    ready,
    expand,
    close,
    haptic: {
      impact,
      notification,
      selection,
    },
    openTelegramLink,
    openLink,
  };
}
