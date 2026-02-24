"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaMedkit, FaTint, FaHeartbeat, FaUser, FaChevronRight, FaSignOutAlt } from "react-icons/fa";

const SERVICES = [
  { id: "injection",      nameRu: "Укол",               price: "80 000 – 120 000 UZS", Icon: FaMedkit },
  { id: "iv_drip",        nameRu: "Капельница",         price: "150 000 – 250 000 UZS", Icon: FaTint },
  { id: "blood_pressure", nameRu: "Давление",           price: "50 000 – 80 000 UZS",  Icon: FaHeartbeat },
  { id: "long_term_care", nameRu: "Долговременный уход", price: "200 000 – 400 000 UZS", Icon: FaUser },
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
      {/* Баннер-градиент */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
          borderRadius: "0 0 16px 16px",
          padding: "24px 16px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FaMedkit size={28} color="#fff" />
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>HamshiraGo</span>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)" }}
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>
          Медсестра на дом — быстро и надёжно
        </p>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Бейдж скидки */}
        <div
          style={{
            background: "#eab30820",
            border: "1px solid #eab30840",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            color: "#854d0e",
            marginBottom: 24,
          }}
        >
          Скидка 10% на первый заказ
        </div>

        {/* Секция услуг */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
          Услуги
        </h2>

        {SERVICES.map(({ id, nameRu, price, Icon }) => (
          <button
            key={id}
            onClick={() => router.push(`/service/${id}`)}
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#0d948818",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                flexShrink: 0,
              }}
            >
              <Icon size={24} color="#0d9488" />
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{nameRu}</p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{price}</p>
            </div>

            <FaChevronRight size={14} color="#64748b" />
          </button>
        ))}

        {/* Мои заказы */}
        <button
          onClick={() => router.push("/orders")}
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 12,
            padding: "16px",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            color: "#0f172a",
            marginTop: 8,
          }}
        >
          Мои заказы
        </button>
      </div>
    </div>
  );
}
