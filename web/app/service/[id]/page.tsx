"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FaMedkit, FaTint, FaHeartbeat, FaUser, FaChevronLeft, FaClock } from "react-icons/fa";
import { useTelegramBackButton, useHaptic } from "@/hooks/useTelegram";
import { api, Service, formatPrice } from "@/lib/api";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Уколы":      FaMedkit,
  "Капельницы": FaTint,
  "Измерения":  FaHeartbeat,
  "Анализы":    FaTint,
  "Перевязки":  FaMedkit,
  "Уход":       FaUser,
};

export default function ServicePage() {
  const router = useRouter();
  const { impact } = useHaptic();
  useTelegramBackButton(() => router.back());
  const { id } = useParams<{ id: string }>();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.services.get(id)
      .then(setService)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#94a3b8", fontSize: 15 }}>Загружаем...</p>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Услуга не найдена</p>
          <button onClick={() => router.push("/")} style={backBtnStyle}>На главную</button>
        </div>
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[service.category] ?? FaMedkit;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", padding: "16px 24px 56px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          >
            <FaChevronLeft size={16} />
          </button>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              border: "3px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <Icon size={34} color="#fff" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.3px" }}>
              {service.title}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
              {formatPrice(service.price)} UZS
            </p>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ maxWidth: 720, margin: "-28px auto 0", padding: "0 24px 32px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>

          {/* Цена */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>Стоимость</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#0d9488" }}>
                {formatPrice(service.price)} UZS
              </span>
            </div>
          </div>

          {/* Длительность */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 16,
            background: "#0d948814", borderRadius: 10, padding: "10px 14px",
          }}>
            <FaClock size={14} color="#0d9488" />
            <span style={{ fontSize: 14, color: "#0d9488", fontWeight: 600 }}>
              Время процедуры: ~{service.durationMinutes} мин
            </span>
          </div>

          {/* Описание */}
          <p style={{ fontSize: 15, color: "#0f172a", lineHeight: 1.6, marginBottom: 24 }}>
            {service.description}
          </p>

          {/* Кнопка заказать */}
          <button
            onClick={() => {
              impact("medium");
              router.push(
                `/order/location?service=${service.id}&title=${encodeURIComponent(service.title)}&price=${service.price}`
              );
            }}
            style={{
              width: "100%",
              background: "#0d9488", color: "#fff",
              fontSize: 17, fontWeight: 700,
              borderRadius: 12, padding: "16px 24px",
              border: "none", cursor: "pointer",
            }}
          >
            Заказать
          </button>
        </div>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: "#0d9488", color: "#fff",
  fontSize: 16, fontWeight: 600,
  borderRadius: 12, padding: "12px 24px",
  border: "none", cursor: "pointer",
};
