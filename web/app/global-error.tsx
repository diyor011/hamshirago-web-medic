"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f0fdfa",
        margin: 0,
        fontFamily: "sans-serif",
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
            Приложение не отвечает
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>
            Произошла критическая ошибка. Пожалуйста, обновите страницу.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "#0d9488",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
