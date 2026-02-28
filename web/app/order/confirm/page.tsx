"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegram, useTelegramBackButton, useTelegramMainButton, useHaptic } from "@/hooks/useTelegram";
import {
  FaChevronLeft,
  FaMapMarker,
  FaPhone,
  FaMedkit,
  FaExclamationCircle,
} from "react-icons/fa";
import { api, formatPrice } from "@/lib/api";

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();

  const serviceId    = params.get("service")      ?? "";
  const serviceTitle = params.get("title")        ?? "Услуга";
  const price        = parseInt(params.get("price") || "0", 10);
  const address      = params.get("address")      ?? "";
  const floor        = params.get("floor")        ?? "";
  const apartment    = params.get("apartment")    ?? "";
  const phone        = params.get("phone")        ?? "";
  const lat          = parseFloat(params.get("lat") || "41.2995");
  const lng          = parseFloat(params.get("lng") || "69.2401");
  const nurseName    = params.get("nurseName")    ?? "";
  const nurseRating  = params.get("nurseRating")  ?? "";
  const nurseDistance = params.get("nurseDistance") ?? "";

  const [discount, setDiscount] = useState(0);
  const [checkingDiscount, setCheckingDiscount] = useState(true);
  const total = price - discount;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Проверяем первый ли это заказ — если да, даём скидку 10%
  useEffect(() => {
    api.orders.list()
      .then((orders) => {
        const arr = Array.isArray(orders) ? orders
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : Array.isArray((orders as any)?.data) ? (orders as any).data
          : [];
        if (arr.length === 0) {
          setDiscount(Math.round(price * 0.1));
        }
      })
      .catch(() => {})
      .finally(() => setCheckingDiscount(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { inTelegram } = useTelegram();
  const { notify } = useHaptic();

  // Telegram BackButton — назад
  useTelegramBackButton(() => router.back());

  // Telegram MainButton — подтвердить заказ
  useTelegramMainButton({
    text: loading ? "Создаём заказ..." : "Подтвердить заказ",
    onClick: handleConfirm,
    loading,
    color: "#0d9488",
  });

  async function handleConfirm() {
    setError("");
    setLoading(true);
    const body = {
      serviceId,
      serviceTitle,
      priceAmount:    price,
      discountAmount: discount,
      location: {
        latitude:  lat,
        longitude: lng,
        house:     address,
        floor:     floor || undefined,
        apartment: apartment || undefined,
        phone,
      },
    };
    console.log("[confirm] sending order body:", JSON.stringify(body));
    try {
      const order = await api.orders.create(body);
      notify("success");
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      notify("error");
      setError(err instanceof Error ? err.message : "Ошибка создания заказа");
      setLoading(false);
    }
  }

  // ─── Экран подтверждения ───
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{
        maxWidth: 720, margin: "0 auto",
        padding: "16px 24px 24px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: "50%", width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff", flexShrink: 0,
          }}
        >
          <FaChevronLeft size={16} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
          Подтверждение заказа
        </h1>
      </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px 100px" }}>

        {/* ─── Услуга ─── */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Услуга</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#0d948818",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <FaMedkit size={24} color="#0d9488" />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                {serviceTitle}
              </p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                Стоимость: {formatPrice(price)} UZS
              </p>
            </div>
          </div>
        </div>

        {/* ─── Медсестра (если выбрана) ─── */}
        {nurseName && (
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Медсестра</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "#0d948818",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 24,
              }}>
                👩‍⚕️
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{nurseName}</p>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  {nurseRating && (
                    <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                      ⭐ {parseFloat(nurseRating).toFixed(1)}
                    </span>
                  )}
                  {nurseDistance && (
                    <span style={{ fontSize: 13, color: "#64748b" }}>
                      📍 {parseFloat(nurseDistance).toFixed(1)} км
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Адрес ─── */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Адрес</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={infoRow}>
              <FaMapMarker size={14} color="#0d9488" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={infoText}>{address}</span>
            </div>
            {(floor || apartment) && (
              <div style={infoRow}>
                <span style={{ width: 14, flexShrink: 0 }} />
                <span style={{ ...infoText, color: "#64748b" }}>
                  {floor ? `Этаж ${floor}` : ""}
                  {floor && apartment ? ", " : ""}
                  {apartment ? `Кв. ${apartment}` : ""}
                </span>
              </div>
            )}
            <div style={infoRow}>
              <FaPhone size={13} color="#0d9488" style={{ flexShrink: 0 }} />
              <span style={infoText}>{phone}</span>
            </div>
          </div>
        </div>

        {/* ─── Стоимость ─── */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Стоимость</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>Стоимость услуги</span>
              <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>
                {formatPrice(price)} UZS
              </span>
            </div>

            {checkingDiscount && (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Проверяем скидку...</div>
            )}

            {!checkingDiscount && discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
                  🎁 Скидка 10% (первый заказ)
                </span>
                <span style={{ fontSize: 14, color: "#22c55e", fontWeight: 700 }}>
                  −{formatPrice(discount)} UZS
                </span>
              </div>
            )}

            <div style={{ height: 1, background: "#e2e8f0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Итого</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#0d9488" }}>
                {formatPrice(total)} UZS
              </span>
            </div>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
            background: "#ef444412", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 10,
            color: "#ef4444", fontSize: 13, fontWeight: 500,
          }}>
            <FaExclamationCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Нативные кнопки — только вне Telegram */}
        {!inTelegram && (
          <>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                width: "100%", background: "#0d9488", color: "#fff",
                fontSize: 17, fontWeight: 700, borderRadius: 12,
                padding: "16px 24px", border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
                marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "opacity 150ms ease",
              }}
            >
              {loading && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {loading ? "Создаём заказ..." : "Подтвердить заказ"}
            </button>
            <button
              onClick={() => router.back()}
              disabled={loading}
              style={{
                width: "100%", background: "#fff", color: "#0f172a",
                fontSize: 16, fontWeight: 600, borderRadius: 12,
                padding: "15px 24px", border: "1px solid #e2e8f0",
                cursor: "pointer",
              }}
            >
              Отмена
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc" }} />}>
      <ConfirmForm />
    </Suspense>
  );
}

// ─── Styles ───
const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 16,
  padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  marginBottom: 12,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 12,
};
const infoRow: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 10,
};
const infoText: React.CSSProperties = {
  fontSize: 15, color: "#0f172a", fontWeight: 500, lineHeight: 1.4,
};
