"use client";

import { useEffect, useCallback, useRef } from "react";
import { getTelegramWebApp, isInTelegram, TelegramWebApp } from "@/lib/telegram";

// ─── Основной хук ───────────────────────────────────────

export function useTelegram() {
  const twa = typeof window !== "undefined" ? getTelegramWebApp() : null;
  const inTelegram = isInTelegram();

  return { twa, inTelegram };
}

// ─── Хук инициализации (используется в layout) ─────────

export function useTelegramInit() {
  useEffect(() => {
    const twa = getTelegramWebApp();
    if (!twa) return;
    twa.ready();
    twa.expand();
  }, []);
}

// ─── Хук BackButton ─────────────────────────────────────

export function useTelegramBackButton(onBack: (() => void) | null) {
  const cbRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const twa = getTelegramWebApp();
    if (!twa || !isInTelegram()) return;

    // Убираем старый колбэк
    if (cbRef.current) {
      twa.BackButton.offClick(cbRef.current);
    }

    if (onBack) {
      cbRef.current = onBack;
      twa.BackButton.show();
      twa.BackButton.onClick(onBack);
    } else {
      cbRef.current = null;
      twa.BackButton.hide();
    }

    return () => {
      if (cbRef.current) {
        twa.BackButton.offClick(cbRef.current);
        twa.BackButton.hide();
      }
    };
  }, [onBack]);
}

// ─── Хук MainButton ─────────────────────────────────────

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  color?: string;
}

export function useTelegramMainButton(options: MainButtonOptions | null) {
  const cbRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const twa = getTelegramWebApp();
    if (!twa || !isInTelegram()) return;

    if (cbRef.current) {
      twa.MainButton.offClick(cbRef.current);
    }

    if (!options) {
      twa.MainButton.hide();
      cbRef.current = null;
      return;
    }

    const { text, onClick, loading = false, disabled = false, color = "#0d9488" } = options;

    cbRef.current = onClick;
    twa.MainButton.setParams({
      text,
      color,
      text_color: "#ffffff",
      is_active: !disabled && !loading,
      is_visible: true,
    });
    twa.MainButton.onClick(onClick);

    if (loading) {
      twa.MainButton.showProgress(false);
    } else {
      twa.MainButton.hideProgress();
    }

    return () => {
      if (cbRef.current) {
        twa.MainButton.offClick(cbRef.current);
      }
      twa.MainButton.hide();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.text, options?.loading, options?.disabled]);
}

// ─── Хук Haptic Feedback ────────────────────────────────

export function useHaptic() {
  const impact = useCallback((style: "light" | "medium" | "heavy" = "light") => {
    getTelegramWebApp()?.HapticFeedback.impactOccurred(style);
  }, []);

  const notify = useCallback((type: "success" | "error" | "warning") => {
    getTelegramWebApp()?.HapticFeedback.notificationOccurred(type);
  }, []);

  const selection = useCallback(() => {
    getTelegramWebApp()?.HapticFeedback.selectionChanged();
  }, []);

  return { impact, notify, selection };
}

// ─── Хук темы Telegram ──────────────────────────────────

export function useTelegramTheme() {
  const twa = getTelegramWebApp() as TelegramWebApp | null;
  const isDark = twa?.colorScheme === "dark";

  return {
    isDark,
    bgColor: twa?.themeParams?.bg_color ?? (isDark ? "#1a1a1a" : "#f8fafc"),
    textColor: twa?.themeParams?.text_color ?? (isDark ? "#ffffff" : "#0f172a"),
  };
}
