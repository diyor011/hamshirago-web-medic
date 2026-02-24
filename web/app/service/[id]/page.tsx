"use client";

import { useRouter, useParams } from "next/navigation";
import { FaMedkit, FaTint, FaHeartbeat, FaUser, FaChevronLeft, FaClock } from "react-icons/fa";
import { useTelegramBackButton, useHaptic } from "@/hooks/useTelegram";

const SERVICES = {
  injection: {
    id: "injection",
    nameRu: "Укол",
    priceMin: 80000,
    priceMax: 120000,
    Icon: FaMedkit,
    description:
      "Профессиональное введение инъекций на дому. Медсестра использует стерильные одноразовые иглы и соблюдает все санитарные нормы. Подходит для внутримышечных и подкожных инъекций.",
    eta: "15–25 мин",
    includes: ["Стерильные расходники", "Медицинские перчатки", "Консультация"],
  },
  iv_drip: {
    id: "iv_drip",
    nameRu: "Капельница",
    priceMin: 150000,
    priceMax: 250000,
    Icon: FaTint,
    description:
      "Внутривенное капельное введение препаратов на дому. Медсестра устанавливает катетер, следит за процессом и снимает систему после завершения. Длительность 30–90 минут.",
    eta: "20–35 мин",
    includes: ["Система для капельницы", "Катетер", "Стерильные расходники", "Мониторинг"],
  },
  blood_pressure: {
    id: "blood_pressure",
    nameRu: "Измерение давления",
    priceMin: 50000,
    priceMax: 80000,
    Icon: FaHeartbeat,
    description:
      "Измерение артериального давления и пульса профессиональным тонометром. Медсестра расскажет показатели и при необходимости даст рекомендации.",
    eta: "10–20 мин",
    includes: ["Профессиональный тонометр", "Консультация по показателям"],
  },
  long_term_care: {
    id: "long_term_care",
    nameRu: "Долговременный уход",
    priceMin: 200000,
    priceMax: 400000,
    Icon: FaUser,
    description:
      "Комплексный уход за лежачими или малоподвижными пациентами. Медсестра помогает с гигиеническими процедурами, сменой перевязок, приёмом лекарств и контролем состояния.",
    eta: "25–40 мин",
    includes: ["Гигиенические процедуры", "Перевязка", "Приём лекарств", "Контроль состояния"],
  },
};

function formatPrice(n: number) {
  return n.toLocaleString("ru-RU");
}

export default function ServicePage() {
  const router = useRouter();
  const { impact } = useHaptic();
  useTelegramBackButton(() => router.back());
  const { id } = useParams<{ id: string }>();
  const service = SERVICES[id as keyof typeof SERVICES];

  if (!service) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Услуга не найдена</p>
          <button onClick={() => router.push("/")} style={backBtnStyle}>На главную</button>
        </div>
      </div>
    );
  }

  const { nameRu, priceMin, priceMax, Icon, description, eta, includes } = service;
  const discountPrice = Math.round(priceMin * 0.9);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
          padding: "16px 16px 48px",
          position: "relative",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <FaChevronLeft size={16} />
        </button>
      </div>

      {/* Карточка контента */}
      <div style={{ padding: "0 16px", marginTop: -32 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* Иконка по центру */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#0d948818",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={36} color="#0d9488" />
            </div>
          </div>

          {/* Название */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {nameRu}
          </h1>

          {/* Блок цены */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>Стоимость</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                {formatPrice(priceMin)} – {formatPrice(priceMax)} UZS
              </span>
            </div>
            <div
              style={{
                height: 1,
                background: "#e2e8f0",
                margin: "8px 0",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>
                Со скидкой 10% <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>для новых</span>
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0d9488" }}>
                от {formatPrice(discountPrice)} UZS
              </span>
            </div>
          </div>

          {/* ETA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              background: "#0d948814",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <FaClock size={14} color="#0d9488" />
            <span style={{ fontSize: 14, color: "#0d9488", fontWeight: 600 }}>
              Медсестра приедет через {eta}
            </span>
          </div>

          {/* Описание */}
          <p style={{ fontSize: 15, color: "#0f172a", lineHeight: 1.6, marginBottom: 16 }}>
            {description}
          </p>

          {/* Разделитель */}
          <div style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }} />

          {/* Что входит */}
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 10 }}>
            Что входит в услугу
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {includes.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#0d948818",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 10, color: "#0d9488", fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: "#0f172a" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Кнопка заказать */}
          <button
            onClick={() => { impact("medium"); router.push(`/order/location?service=${id}`); }}
            style={{
              width: "100%",
              background: "#0d9488",
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 12,
              padding: "16px 24px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Заказать
          </button>
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: "#0d9488",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 12,
  padding: "12px 24px",
  border: "none",
  cursor: "pointer",
};
