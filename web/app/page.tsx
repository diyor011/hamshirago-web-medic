"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaMedkit, FaTint, FaHeartbeat, FaUser, FaChevronRight, FaSignOutAlt, FaListAlt } from "react-icons/fa";

const SERVICES = [
  { id: "injection",      nameRu: "Укол",               desc: "Внутримышечные и подкожные инъекции", price: "80 000 – 120 000",  Icon: FaMedkit  },
  { id: "iv_drip",        nameRu: "Капельница",         desc: "Внутривенное введение препаратов",    price: "150 000 – 250 000", Icon: FaTint    },
  { id: "blood_pressure", nameRu: "Давление",           desc: "Измерение АД и пульса тонометром",    price: "50 000 – 80 000",   Icon: FaHeartbeat },
  { id: "long_term_care", nameRu: "Долговременный уход", desc: "Уход за лежачими пациентами",        price: "200 000 – 400 000", Icon: FaUser    },
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/auth");
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/auth");
  }

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
          .services-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
        }
        @media (min-width: 900px) {
          .services-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .bottom-row {
            grid-template-columns: 1fr auto;
            align-items: center;
          }
        }
      `}</style>

      {/* Шапка */}
      <div style={{
        background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        padding: "0 0 32px",
      }}>
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

        {/* Скидка */}
        <div style={{
          background: "linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)",
          border: "1px solid #fde68a",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>🎁</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#92400e" }}>Скидка 10% на первый заказ</p>
            <p style={{ fontSize: 13, color: "#b45309", marginTop: 2 }}>Применяется автоматически при оформлении</p>
          </div>
        </div>

        {/* Услуги */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 16, letterSpacing: "-0.3px" }}>
          Услуги
        </h2>

        <div className="services-grid">
          {SERVICES.map(({ id, nameRu, desc, price, Icon }) => (
            <button
              key={id}
              onClick={() => router.push(`/service/${id}`)}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "18px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: "1px solid #f1f5f9",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                transition: "box-shadow 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(13,148,136,0.12)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
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
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{nameRu}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{desc}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0d9488", marginTop: 4 }}>{price} UZS</p>
              </div>
              <FaChevronRight size={13} color="#cbd5e1" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Нижняя строка */}
        <div className="bottom-row">
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            Все медсёстры проверены и сертифицированы
          </p>
          <button
            onClick={() => router.push("/orders")}
            style={{
              background: "#fff",
              color: "#0d9488",
              border: "1.5px solid #0d9488",
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <FaListAlt size={14} />
            Мои заказы
          </button>
        </div>
      </div>
    </div>
  );
}
