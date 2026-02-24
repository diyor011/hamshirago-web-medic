"use client";

import { useEffect } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const twa = getTelegramWebApp();
    if (!twa) return;
    // Сигнализируем что приложение загрузилось
    twa.ready();
    // Разворачиваем на весь экран
    twa.expand();
  }, []);

  return <>{children}</>;
}
