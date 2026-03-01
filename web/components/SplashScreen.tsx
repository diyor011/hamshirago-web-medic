"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600);
    const t2 = setTimeout(() => setHidden(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes splash-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .splash-logo {
          animation: splash-pulse 1.4s ease-in-out infinite;
        }
        .splash-text {
          animation: splash-fadein 0.6s ease 0.3s both;
        }
        .splash-sub {
          animation: splash-fadein 0.6s ease 0.5s both;
        }
        .splash-dots span {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
          margin: 0 3px;
          animation: splash-pulse 1.2s ease-in-out infinite;
        }
        .splash-dots span:nth-child(2) { animation-delay: 0.2s; }
        .splash-dots span:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(145deg, #0d9488 0%, #0f766e 60%, #065f46 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 0,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "all",
      }}>
        {/* Иконка */}
        <div className="splash-logo" style={{
          width: 80, height: 80, borderRadius: 22,
          background: "rgba(255,255,255,0.18)",
          border: "2px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          backdropFilter: "blur(8px)",
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="20" rx="2" fill="white" />
            <rect x="2" y="9" width="20" height="6" rx="2" fill="white" />
          </svg>
        </div>

        {/* Название */}
        <p className="splash-text" style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.5px", marginBottom: 8,
        }}>
          HamshiraGo
        </p>

        {/* Подзаголовок */}
        <p className="splash-sub" style={{
          fontSize: 15, color: "rgba(255,255,255,0.75)",
          fontWeight: 500, marginBottom: 36,
        }}>
          Медсестра на дом
        </p>

        {/* Точки загрузки */}
        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </>
  );
}
