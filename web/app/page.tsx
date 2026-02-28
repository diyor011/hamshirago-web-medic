"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaMedkit, FaTint, FaHeartbeat, FaChevronRight,
  FaSignOutAlt, FaListAlt, FaSyringe, FaThermometerHalf,
  FaFlask, FaBandAid,
} from "react-icons/fa";
import { unsubscribeWebPush } from "@/lib/webPush";
import { api, Service, formatPrice } from "@/lib/api";

const CATEGORY_META: Record<string, { icon: React.ElementType }> = {
  "Уколы":      { icon: FaSyringe        },
  "Капельницы": { icon: FaTint           },
  "Измерения":  { icon: FaThermometerHalf},
  "Анализы":    { icon: FaFlask          },
  "Перевязки":  { icon: FaBandAid        },
  "Уход":       { icon: FaHeartbeat      },
};

const TEAL = { color: "#0d9488", bg: "#f0fdfa" };
const DEFAULT_META = { icon: FaMedkit };

export default function HomePage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }
    api.services.list()
      .then((data) => setServices(data.filter((s) => s.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("token");
    router.push("/auth");
  }

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        .page-wrap { max-width: 680px; margin: 0 auto; width: 100%; }
        .hero-wrap { max-width: 680px; margin: 0 auto; padding: 20px 20px 0; }
        .services-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 540px) { .services-grid { grid-template-columns: 1fr 1fr; } }
        .svc-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.09) !important; transform: translateY(-1px); }
        .svc-card { transition: box-shadow 150ms ease, transform 150ms ease; }
      `}</style>

      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", paddingBottom: 28, position: "relative" }}>
        <div className="hero-wrap">
          {/* Топ-бар */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FaMedkit size={22} color="#fff" />
              <span style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>HamshiraGo</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => router.push("/orders")}
                style={{
                  background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 10, padding: "7px 14px",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <FaListAlt size={12} /> Мои заказы
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none",
                  borderRadius: 10, width: 36, height: 36,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "rgba(255,255,255,0.85)",
                }}
              >
                <FaSignOutAlt size={15} />
              </button>
            </div>
          </div>

          {/* Заголовок */}
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
            Медсестра на дом
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)" }}>
            Профессиональная помощь — за 15–30 минут
          </p>
        </div>

        {/* Волна */}
        <svg viewBox="0 0 1440 36" xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", position: "absolute", bottom: -1, left: 0, width: "100%" }}
          preserveAspectRatio="none">
          <path d="M0,36 C360,0 1080,0 1440,36 L1440,36 L0,36 Z" fill="#f8fafc" />
        </svg>
      </div>

      {/* Контент */}
      <div className="page-wrap" style={{ padding: "20px 20px 60px" }}>

        {/* Баннер скидки */}
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fef9ec)",
          border: "1px solid #fde68a",
          borderRadius: 14, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 1 }}>Скидка 10% на первый заказ</p>
            <p style={{ fontSize: 12, color: "#b45309" }}>Применяется автоматически при оформлении</p>
          </div>
        </div>

        {/* Услуги */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "3px solid #e2e8f0", borderTopColor: "#0d9488",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Загружаем услуги...</p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b, "ru"))
            .map(([category, items]) => {
              const Icon = (CATEGORY_META[category] ?? DEFAULT_META).icon;
              return (
                <div key={category} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: TEAL.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={14} color={TEAL.color} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.2px" }}>
                      {category}
                    </h2>
                  </div>

                  <div className="services-grid">
                    {items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((service) => (
                        <button
                          key={service.id}
                          className="svc-card"
                          onClick={() => router.push(`/service/${service.id}`)}
                          style={{
                            background: "#fff", borderRadius: 14,
                            padding: "14px 14px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                            border: "1px solid #f1f5f9",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 12,
                            textAlign: "left", width: "100%",
                          }}
                        >
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: TEAL.bg, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon size={20} color={TEAL.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                              {service.title}
                            </p>
                            <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {service.description}
                            </p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL.color }}>
                              {formatPrice(service.price)} UZS
                            </p>
                          </div>
                          <FaChevronRight size={11} color="#cbd5e1" style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
