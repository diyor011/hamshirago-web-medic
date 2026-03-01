"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#f0fdfa",
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "32px 24px",
        maxWidth: "360px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
          Что-то пошло не так
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>
          Произошла ошибка. Попробуйте ещё раз.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#0d9488",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              background: "#f1f5f9",
              color: "#0f172a",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}
