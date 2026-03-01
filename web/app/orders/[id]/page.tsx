"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), { ssr: false });
import {
  FaArrowLeft,
  FaMapMarker,
  FaMedkit,
  FaUserNurse,
  FaStar,
  FaPhone,
  FaBriefcaseMedical,
  FaTimes,
} from "react-icons/fa";
import {
  api,
  WS_URL,
  Order,
  OrderStatus,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  formatPrice,
} from "@/lib/api";

function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, bg } = ORDER_STATUS_COLOR[status];
  return (
    <span style={{
      padding: "5px 12px", borderRadius: 20,
      fontSize: 13, fontWeight: 700,
      color: text, background: bg,
      whiteSpace: "nowrap",
    }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_FLOW: OrderStatus[] = [
  "CREATED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "DONE",
];

function StatusStepper({ current }: { current: OrderStatus }) {
  if (current === "CANCELED") {
    return (
      <div style={{ background: "#ef444412", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>Заказ отменён</p>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(current);

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {STATUS_FLOW.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: done || active ? "#0d9488" : "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
                color: done || active ? "#fff" : "#94a3b8",
                border: active ? "2.5px solid #0f766e" : "none",
                boxSizing: "border-box",
                flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: active ? "#0d9488" : done ? "#0d9488" : "#94a3b8",
                marginTop: 4, textAlign: "center", width: 44,
                lineHeight: 1.2,
              }}>
                {ORDER_STATUS_LABEL[s]}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginTop: 12,
                background: done ? "#0d9488" : "#e2e8f0",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [rating, setRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [socketOk, setSocketOk] = useState(true);
  const [medicLocation, setMedicLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    loadOrder();

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketOk(true);
      socket.emit("subscribe_order", id);
    });
    socket.on("disconnect", () => setSocketOk(false));
    socket.on("connect_error", () => setSocketOk(false));

    socket.on("order_status", ({ orderId }: { orderId: string; status: OrderStatus }) => {
      if (orderId === id) {
        api.orders.get(id).then(setOrder).catch(() => {});
      }
    });

    socket.on("medic_location", (payload: { orderId: string; latitude: number; longitude: number; updatedAt: string }) => {
      if (payload.orderId !== id) return;
      setMedicLocation({ lat: payload.latitude, lng: payload.longitude, updatedAt: payload.updatedAt });
    });

    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      const data = await api.orders.get(id);
      setOrder(data);
      if (data.medic?.latitude != null && data.medic?.longitude != null) {
        setMedicLocation((prev) => prev ?? {
          lat: Number(data.medic!.latitude),
          lng: Number(data.medic!.longitude),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDone() {
    if (!confirm("Подтвердить, что услуга выполнена?")) return;
    setConfirming(true);
    try {
      const updated = await api.orders.updateStatus(id, "DONE");
      setOrder(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Ошибка при подтверждении");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Вы уверены, что хотите отменить заказ?")) return;
    setCanceling(true);
    try {
      await api.orders.cancel(id);
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Ошибка при отмене");
      setCanceling(false);
    }
  }

  async function handleRate(stars: number) {
    setRatingLoading(true);
    try {
      const updated = await api.orders.rate(id, stars);
      setOrder(updated);
      setRating(stars);
      setRatingDone(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Ошибка при оценке");
    } finally {
      setRatingLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#64748b" }}>Загружаем заказ...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <p style={{ fontSize: 15, color: "#ef4444", marginBottom: 16 }}>{error || "Заказ не найден"}</p>
        <button onClick={() => router.push("/orders")} style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          К списку заказов
        </button>
      </div>
    );
  }

  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const finalPrice = order.priceAmount - order.discountAmount;
  const canCancel = order.status === "CREATED" || order.status === "ASSIGNED";
  const canConfirmDone = order.status === "SERVICE_STARTED";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px 28px" }}>
        {/* Логотип */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <FaMedkit size={20} color="#fff" />
          <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>HamshiraGo</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/orders")}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}
          >
            <FaArrowLeft size={15} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {order.serviceTitle}
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {dateStr}, {timeStr}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px 80px" }}>

        {/* Баннер обрыва соединения */}
        {!socketOk && (
          <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            Соединение потеряно — статус может не обновляться.
          </div>
        )}

        {/* Прогресс */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Статус заказа</p>
          <StatusStepper current={order.status} />
        </div>

        {/* Медик */}
        {order.medic ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={sectionLabel}>Медсестра</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #0d9488, #0f766e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FaUserNurse size={24} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{order.medic.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                  {order.medic.rating !== null && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}>
                      <FaStar size={11} color="#eab308" />
                      {Number(order.medic.rating).toFixed(1)}
                      <span style={{ color: "#94a3b8" }}>({order.medic.reviewCount})</span>
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}>
                    <FaBriefcaseMedical size={11} color="#94a3b8" />
                    {order.medic.experienceYears} лет
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : order.status === "CREATED" ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <FaUserNurse size={24} color="#94a3b8" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Ищем медсестру...</p>
            <p style={{ fontSize: 13, color: "#64748b" }}>Обычно это занимает 2–5 минут</p>
          </div>
        ) : null}

        {/* Карта медика */}
        {medicLocation &&
          order.location?.latitude != null &&
          order.location?.longitude != null &&
          ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED"].includes(order.status) && (
          <div style={{ background: "#fff", borderRadius: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={sectionLabel}>Медик на карте</p>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                обновлено {new Date(medicLocation.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <div style={{ height: 240 }}>
              <TrackingMap
                clientLat={order.location.latitude}
                clientLng={order.location.longitude}
                medicLat={medicLocation.lat}
                medicLng={medicLocation.lng}
                medicName={order.medic?.name ?? "Медик"}
              />
            </div>
          </div>
        )}

        {/* Адрес */}
        {order.location && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={sectionLabel}>Адрес</p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <FaMapMarker size={16} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{order.location.house}</p>
                {(order.location.floor || order.location.apartment) && (
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                    {order.location.floor ? `Этаж ${order.location.floor}` : ""}
                    {order.location.floor && order.location.apartment ? ", " : ""}
                    {order.location.apartment ? `Кв. ${order.location.apartment}` : ""}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <FaPhone size={11} color="#94a3b8" />
                  <span style={{ fontSize: 13, color: "#64748b" }}>{order.location.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Стоимость */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Стоимость</p>
          {order.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#94a3b8" }}>Скидка</span>
              <span style={{ fontSize: 14, color: "#22c55e", fontWeight: 600 }}>−{formatPrice(order.discountAmount)} UZS</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Итого</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#0d9488" }}>{formatPrice(finalPrice)} UZS</span>
          </div>
        </div>

        {/* Подтверждение завершения — клиент подтверждает что услуга выполнена */}
        {canConfirmDone && (
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            border: "1.5px solid #0d948840",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              Услуга оказывается
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Если медик завершил работу — подтвердите выполнение услуги
            </p>
            <button
              onClick={handleConfirmDone}
              disabled={confirming}
              style={{
                width: "100%",
                background: confirming ? "#94a3b8" : "#0d9488",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "13px 16px",
                fontSize: 15,
                fontWeight: 700,
                cursor: confirming ? "not-allowed" : "pointer",
              }}
            >
              {confirming ? "Подтверждаем..." : "Подтвердить завершение"}
            </button>
          </div>
        )}

        {/* Рейтинг — показываем только для завершённых заказов с медиком */}
        {order.status === "DONE" && order.medic && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", textAlign: "center" }}>
            {order.clientRating !== null || ratingDone ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Ваша оценка</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ fontSize: 28, color: s <= (order.clientRating ?? rating) ? "#eab308" : "#e2e8f0" }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>Спасибо за оценку!</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Оцените медсестру</p>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{order.medic.name}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      disabled={ratingLoading}
                      onClick={() => handleRate(s)}
                      onMouseEnter={() => setHoverStar(s)}
                      onMouseLeave={() => setHoverStar(0)}
                      style={{
                        background: "none", border: "none", cursor: ratingLoading ? "not-allowed" : "pointer",
                        fontSize: 36, lineHeight: 1, padding: "0 2px",
                        color: s <= (hoverStar || rating) ? "#eab308" : "#e2e8f0",
                        transition: "color 100ms ease",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {ratingLoading && <p style={{ fontSize: 13, color: "#64748b" }}>Сохраняем...</p>}
              </>
            )}
          </div>
        )}

        {/* Кнопка отмены */}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={canceling}
            style={{
              width: "100%", background: "transparent",
              color: "#ef4444", border: "1.5px solid #ef4444",
              borderRadius: 14, padding: "14px 16px",
              fontSize: 15, fontWeight: 700,
              cursor: canceling ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: canceling ? 0.6 : 1,
            }}
          >
            <FaTimes size={14} />
            {canceling ? "Отменяем..." : "Отменить заказ"}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 12,
};
