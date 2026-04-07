"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, MapPin, Wallet, ArrowRight, X } from "lucide-react";

const SLIDES = [
  {
    Icon: Stethoscope,
    color: "#0d9488",
    title: "Работайте онлайн",
    desc: "Принимайте заказы через браузер или телефон — без лишних приложений",
  },
  {
    Icon: MapPin,
    color: "#0284c7",
    title: "Зона работы",
    desc: "Настройте радиус и получайте только те заказы, которые рядом с вами",
  },
  {
    Icon: Wallet,
    color: "#d97706",
    title: "Прозрачный заработок",
    desc: "Видите каждую оплату, комиссию платформы и баланс в реальном времени",
  },
];

export default function OnboardingMedicPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  function finish() {
    localStorage.setItem("medic_onboarding_completed", "true");
    router.push("/auth");
  }

  function next() {
    if (current < SLIDES.length - 1) setCurrent((c) => c + 1);
    else finish();
  }

  const slide = SLIDES[current];
  const Icon = slide.Icon;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 20px 0" }}>
        <button
          onClick={finish}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#94a3b8", fontSize: 14, cursor: "pointer", padding: "6px 12px", borderRadius: 20 }}
        >
          <X size={12} />
          Пропустить
        </button>
      </div>

      {/* Slide */}
      <div
        key={current}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "0 32px", textAlign: "center",
          animation: "fadeSlide 0.35s ease",
        }}
      >
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: `${slide.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
          <Icon size={48} color={slide.color} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>{slide.title}</h1>
        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, maxWidth: 320 }}>{slide.desc}</p>
      </div>

      {/* Bottom */}
      <div style={{ padding: "0 24px 48px" }}>
        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                height: 8, borderRadius: 4,
                width: i === current ? 24 : 8,
                background: i === current ? "#0d9488" : "#e2e8f0",
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          style={{
            width: "100%", background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            color: "#fff", border: "none", borderRadius: 16, padding: "16px",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {current < SLIDES.length - 1 ? "Далее" : "Начать"}
          <ArrowRight size={14} />
        </button>
      </div>

      <style>{`@keyframes fadeSlide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}
