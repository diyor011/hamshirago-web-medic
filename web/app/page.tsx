"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaMedkit, FaTint, FaHeartbeat, FaUser, FaChevronRight, FaSignOutAlt, FaListAlt } from "react-icons/fa";
import { unsubscribeWebPush } from "@/lib/webPush";
import { api, Service, formatPrice } from "@/lib/api";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Уколы":      FaMedkit,
  "Капельницы": FaTint,
  "Измерения":  FaHeartbeat,
  "Анализы":    FaTint,
  "Перевязки":  FaMedkit,
  "Уход":       FaUser,
};

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
        .hero-inner, .main-content {
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }
        .hero-inner { padding: 0 24px; }
        .main-content { padding: 0 24px; }
        .services-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media (min-width: 640px) {
          .services-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
        }
        @media (min-width: 900px) {
          .services-grid { grid-template-columns: repeat(3, 1fr); }
          .bottom-row { grid-template-columns: 1fr auto; align-items: center; }
        }
      `}</style>

      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", padding: "0 0 32px" }}>
        <div className="hero-inner" style={{ paddingTop: 20, paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FaMedkit size={28} color="#fff" />
              <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>HamshiraGo</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => router.push("/orders")}
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Мои заказы
              </button>
              <button
                onClick={handleLogout}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.85)" }}
              >
                <FaSignOutAlt size={16} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 24, marginBottom: 4 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
              Медсестра на дом
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)" }}>
              Профессиональная помощь — за 15–30 минут
            </p>
          </div>
        </div>
      </div>

      <div className="main-content" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Скидка 10% на первый заказ */}
        <div style={{ background: "#eab30820", border: "1px solid #eab30840", borderRadius: 12, padding: 14, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#854d0e", marginBottom: 24 }}>
          🎁 Скидка 10% на первый заказ
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 15 }}>
            Загружаем услуги...
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b, "ru"))
            .map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category] ?? FaMedkit;
              return (
                <div key={category} style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.3px" }}>
                    {category}
                  </h2>
                  <div className="services-grid">
                    {items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((service) => (
                        <button
                          key={service.id}
                          onClick={() => router.push(`/service/${service.id}`)}
                          style={{
                            background: "#fff", borderRadius: 16,
                            padding: "18px 16px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                            border: "1px solid #f1f5f9",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 14,
                            textAlign: "left",
                            transition: "box-shadow 150ms ease, transform 150ms ease",
                            width: "100%",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,148,136,0.12)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}
                        >
                          <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: "#0d948812",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Icon size={24} color="#0d9488" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{service.title}</p>
                            <p style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{service.description}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#0d9488", marginTop: 4 }}>{formatPrice(service.price)} UZS</p>
                          </div>
                          <FaChevronRight size={13} color="#cbd5e1" style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
        )}

        {!loading && (
          <div className="bottom-row">
            <p style={{ fontSize: 13, color: "#94a3b8" }}>
              Все медсёстры проверены и сертифицированы
            </p>
            <button
              onClick={() => router.push("/orders")}
              style={{
                background: "#fff", color: "#0d9488",
                border: "1.5px solid #0d9488",
                borderRadius: 12, padding: "12px 24px",
                fontSize: 14, fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              <FaListAlt size={14} />
              Мои заказы
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
