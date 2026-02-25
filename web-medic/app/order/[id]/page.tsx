"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FaChevronLeft, FaMapMarker, FaPhone, FaUser,
  FaYandex, FaLocationArrow, FaCheckCircle,
} from "react-icons/fa";
import { medicApi, Order, OrderStatus, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, NEXT_STATUS, formatPrice } from "@/lib/api";
import { io, Socket } from "socket.io-client";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showNavChoice, setShowNavChoice] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadOrder();
    const token = localStorage.getItem("medic_token");
    if (token) {
      const socket = io("https://hamshirago-production.up.railway.app", {
        auth: { token }, transports: ["websocket"],
      });
      socketRef.current = socket;
      socket.emit("subscribe_order", id);
      socket.on("order_status", ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
        if (orderId === id) setOrder(prev => prev ? { ...prev, status } : prev);
      });
    }
    return () => { socketRef.current?.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    try {
      // Берём из списка своих заказов
      const orders = await medicApi.orders.my();
      const found = orders.find(o => o.id === id);
      if (found) setOrder(found);
    } finally {
      setLoading(false);
    }
  }

  async function handleNextStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    setError("");
    try {
      const updated = await medicApi.orders.updateStatus(id, next.status);
      setOrder(updated);
      // Если завершён — возвращаемся на главную через 2 сек
      if (next.status === "DONE") {
        setTimeout(() => router.push("/"), 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка обновления");
    } finally {
      setUpdating(false);
    }
  }

  // Открыть навигатор
  function openNavigation(app: "yandex" | "google" | "2gis") {
    if (!order?.location) return;
    const { latitude: lat, longitude: lng } = order.location;
    const urls = {
      yandex: `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "2gis": `https://2gis.uz/routeSearch/rsType/car/to/${lng},${lat}`,
    };
    window.open(urls[app], "_blank");
    setShowNavChoice(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!order) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Заказ не найден</p>
        <button onClick={() => router.push("/")} style={primaryBtn}>На главную</button>
      </div>
    </div>
  );

  const { text: statusText, bg: statusBg } = ORDER_STATUS_COLOR[order.status];
  const nextAction = NEXT_STATUS[order.status];
  const isDone = order.status === "DONE" || order.status === "CANCELED";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/")}
          style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}>
          <FaChevronLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{order.serviceTitle}</h1>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: statusText, background: "rgba(255,255,255,0.9)", display: "inline-block", marginTop: 4 }}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{formatPrice(order.priceAmount - order.discountAmount)}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>UZS</p>
        </div>
      </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 24px 100px" }}>

        {/* Карта с локацией клиента */}
        {order.location && (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", height: 220 }}>
            <Map lat={order.location.latitude} lng={order.location.longitude} />
          </div>
        )}

        {/* Кнопка навигации */}
        {order.location && !isDone && (
          <div style={{ marginBottom: 12, position: "relative" }}>
            <button onClick={() => setShowNavChoice(v => !v)}
              style={{ width: "100%", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "14px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <FaLocationArrow size={14} />
              Открыть навигацию
            </button>

            {showNavChoice && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 10 }}>
                {[
                  { key: "yandex", label: "Яндекс Карты", color: "#fc3f1d", icon: <FaYandex size={18} /> },
                  { key: "google", label: "Google Maps",  color: "#4285f4", icon: <FaMapMarker size={16} /> },
                  { key: "2gis",   label: "2ГИС",         color: "#1db248", icon: <FaMapMarker size={16} /> },
                ].map(({ key, label, color, icon }) => (
                  <button key={key} onClick={() => openNavigation(key as "yandex" | "google" | "2gis")}
                    style={{ width: "100%", background: "#fff", border: "none", borderBottom: "1px solid #f1f5f9", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{label}</span>
                  </button>
                ))}
                <button onClick={() => setShowNavChoice(false)}
                  style={{ width: "100%", background: "#f8fafc", border: "none", padding: "12px", cursor: "pointer", fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}

        {/* Адрес клиента */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Адрес клиента</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <FaMapMarker size={14} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 15, color: "#0f172a", fontWeight: 500 }}>
                {order.location?.house}
                {order.location?.floor ? `, этаж ${order.location.floor}` : ""}
                {order.location?.apartment ? `, кв. ${order.location.apartment}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FaPhone size={13} color="#0d9488" />
              <a href={`tel:${order.location?.phone}`}
                style={{ fontSize: 15, color: "#0d9488", fontWeight: 600, textDecoration: "none" }}>
                {order.location?.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Информация об услуге */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Детали заказа</h2>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>Услуга</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{order.serviceTitle}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>Стоимость</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{formatPrice(order.priceAmount)} UZS</span>
          </div>
          {order.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#22c55e" }}>Скидка</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>−{formatPrice(order.discountAmount)} UZS</span>
            </div>
          )}
          <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Итого</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0d9488" }}>{formatPrice(order.priceAmount - order.discountAmount)} UZS</span>
          </div>
        </div>

        {/* Статус флоу */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Статус заказа</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["ASSIGNED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "DONE"] as OrderStatus[]).map((s, i) => {
              const statuses: OrderStatus[] = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "DONE"];
              const currentIdx = statuses.indexOf(order.status);
              const stepIdx = i;
              const done = stepIdx < currentIdx || order.status === "DONE";
              const active = stepIdx === currentIdx;
              const { text, bg } = ORDER_STATUS_COLOR[s];
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done || active ? bg : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? <FaCheckCircle size={14} color={text} /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? text : "#94a3b8" }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? text : done ? "#64748b" : "#94a3b8" }}>
                    {ORDER_STATUS_LABEL[s]}
                  </span>
                  {active && <span style={{ marginLeft: "auto", fontSize: 11, background: bg, color: text, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Текущий</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{ background: "#ef444412", borderRadius: 10, padding: "12px 14px", marginBottom: 12, color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Кнопка следующего статуса */}
        {nextAction && !isDone && (
          <button onClick={handleNextStatus} disabled={updating}
            style={{ width: "100%", background: nextAction.color, color: "#fff", fontSize: 17, fontWeight: 700, borderRadius: 12, padding: "16px 24px", border: "none", cursor: updating ? "not-allowed" : "pointer", opacity: updating ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "opacity 150ms ease" }}>
            {updating && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
            {updating ? "Обновляем..." : nextAction.label}
          </button>
        )}

        {order.status === "DONE" && (
          <div style={{ background: "#22c55e20", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <FaCheckCircle size={36} color="#22c55e" style={{ margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Заказ выполнен!</p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Спасибо за работу</p>
            <button onClick={() => router.push("/")} style={primaryBtn}>На главную</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 };
const primaryBtn: React.CSSProperties = { background: "#0d9488", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "13px 28px", border: "none", cursor: "pointer" };
