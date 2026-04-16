"use client";

import { useEffect, useState } from "react";
import { subscribeWebPushDoctor } from "@/lib/webPush";

const DISMISS_KEY = "doctor-push-prompt-dismissed-at";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 3000;

export default function DoctorPushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;

    // Только для врачей
    if (localStorage.getItem("user_role") !== "doctor") return;
    if (!localStorage.getItem("medic_token")) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const diff = Date.now() - Number(dismissedAt);
      if (diff < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function allow() {
    setLoading(true);
    try {
      await subscribeWebPushDoctor();
    } finally {
      setLoading(false);
      setVisible(false);
    }
  }

  return (
    <>
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: "rgba(0,0,0,0.35)",
          animation: "fadeIn 200ms ease",
        }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 32px",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        animation: "slideUp 250ms cubic-bezier(0.32,0.72,0,1)",
        maxWidth: 480, margin: "0 auto",
      }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e2e8f0", margin: "0 auto 20px" }} />

        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg,#0d9488,#0f766e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Уведомления о консультациях
        </p>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.55, marginBottom: 24 }}>
          Получайте мгновенные уведомления о новых консультациях от пациентов — даже когда вкладка закрыта.
        </p>

        <button
          onClick={allow}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg,#0d9488,#0f766e)",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.75 : 1, marginBottom: 10,
            transition: "opacity 150ms",
          }}
        >
          {loading ? "Подождите..." : "Включить уведомления"}
        </button>

        <button
          onClick={dismiss}
          style={{
            width: "100%", padding: "14px", borderRadius: 14,
            border: "1.5px solid #e2e8f0", background: "transparent",
            color: "#64748b", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Позже
        </button>
      </div>
    </>
  );
}
