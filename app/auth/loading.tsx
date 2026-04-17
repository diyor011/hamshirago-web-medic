"use client";

export default function AuthLoading() {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
    }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid #e2e8f0",
          borderTop: "4px solid #0d9488",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
        Загрузка авторизации...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
