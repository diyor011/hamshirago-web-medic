"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: "#0f172a",
        color: "#f8fafc",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Установить HamshiraGo</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Добавьте на главный экран для быстрого доступа</div>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#64748b",
          fontSize: 20,
          cursor: "pointer",
          padding: "4px 8px",
          lineHeight: 1,
        }}
        aria-label="Закрыть"
      >
        ×
      </button>
      <button
        onClick={install}
        style={{
          background: "#0d9488",
          border: "none",
          color: "#fff",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Установить
      </button>
    </div>
  );
}
