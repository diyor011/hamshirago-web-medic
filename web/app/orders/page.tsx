"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  FaSignOutAlt,
  FaMedkit,
  FaMapMarker,
  FaListAlt,
  FaRedo,
} from "react-icons/fa";
import { unsubscribeWebPush } from "@/lib/webPush";
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
      padding: "4px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: text, background: bg,
      whiteSpace: "nowrap",
    }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", background: "#fff",
        border: "1px solid #e2e8f0", borderRadius: 16,
        padding: 16, marginBottom: 12,
        cursor: "pointer", textAlign: "left",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 150ms ease",
      }}
    >
      {/* Верхняя строка */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {order.serviceTitle}
        </span>
        <StatusBadge status={order.status} />
      </div>

      {/* Адрес */}
      {order.location && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <FaMapMarker size={12} color="#94a3b8" />
          <span style={{ fontSize: 13, color: "#64748b" }}>
            {order.location.house}
            {order.location.floor ? `, эт. ${order.location.floor}` : ""}
          </span>
        </div>
      )}

      {/* Разделитель */}
      <div style={{ height: 1, background: "#f1f5f9", marginBottom: 10 }} />

      {/* Нижняя строка */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#0d9488" }}>
          {formatPrice(order.priceAmount - order.discountAmount)} UZS
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {dateStr}, {timeStr}
        </span>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [socketOk, setSocketOk]   = useState(true);
  const socketRef = useRef<Socket | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const data = await api.orders.list();
      setOrders(data.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  // WebSocket — real-time обновление статусов
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    loadOrders();

    // Подключаем Socket.io (как и требует бекенд)
    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketOk(true));
    socket.on("disconnect", () => setSocketOk(false));
    socket.on("connect_error", () => setSocketOk(false));

    socket.on("order_status", ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      // Отписываемся от завершённых заказов
      if (status === "DONE" || status === "CANCELED") {
        socket.emit("unsubscribe_order", orderId);
      }
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Подписываемся на каждый активный заказ
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    orders
      .filter((o) => !["DONE", "CANCELED"].includes(o.status))
      .forEach((o) => {
        socket.emit("subscribe_order", o.id);
      });
  }, [orders]);

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("token");
    router.push("/auth");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        .orders-header-inner, .orders-body { max-width: 1100px; margin: 0 auto; width: 100%; }
        .orders-header-inner { padding: 20px 24px 24px; display: flex; align-items: center; justify-content: space-between; }
        .orders-body { padding: 20px 24px 80px; }
        .orders-grid { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .orders-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }
        @media (min-width: 1000px) { .orders-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div className="orders-header-inner">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <FaMedkit size={18} color="#fff" />
              <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.2px" }}>HamshiraGo</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Мои заказы</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              Статус обновляется в реальном времени
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => router.push("/")}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Услуги
            </button>
            <button onClick={loadOrders} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <FaRedo size={14} />
            </button>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <FaSignOutAlt size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="orders-body">
        {/* Баннер обрыва соединения */}
        {!socketOk && (
          <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            Соединение потеряно — статусы не обновляются. Проверьте интернет.
          </div>
        )}
        {/* Загрузка */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "3px solid #e2e8f0", borderTopColor: "#0d9488",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }} />
            <p style={{ fontSize: 14, color: "#64748b" }}>Загружаем заказы...</p>
          </div>
        )}

        {/* Ошибка */}
        {!loading && error && (
          <div style={{
            background: "#ef444412", borderRadius: 12,
            padding: 16, textAlign: "center",
          }}>
            <p style={{ fontSize: 14, color: "#ef4444", marginBottom: 12 }}>{error}</p>
            <button onClick={loadOrders} style={{
              background: "#ef4444", color: "#fff",
              border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}>
              Повторить
            </button>
          </div>
        )}

        {/* Пустой список */}
        {!loading && !error && orders.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 24px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <FaListAlt size={28} color="#94a3b8" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              Заказов пока нет
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              Вызовите медсестру на дом прямо сейчас
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "#0d9488", color: "#fff",
                border: "none", borderRadius: 12,
                padding: "13px 28px", fontSize: 15, fontWeight: 700,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              <FaMedkit size={15} />
              Заказать услугу
            </button>
          </div>
        )}

        {/* Список заказов */}
        {!loading && !error && orders.length > 0 && (
          <>
            {/* Активные */}
            {orders.filter((o) => !["DONE", "CANCELED"].includes(o.status)).length > 0 && (
              <>
                <p style={groupLabel}>Активные</p>
                <div className="orders-grid">
                  {orders
                    .filter((o) => !["DONE", "CANCELED"].includes(o.status))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((o) => (
                      <OrderCard key={o.id} order={o} onClick={() => router.push(`/orders/${o.id}`)} />
                    ))}
                </div>
              </>
            )}

            {/* Завершённые */}
            {orders.filter((o) => ["DONE", "CANCELED"].includes(o.status)).length > 0 && (
              <>
                <p style={{ ...groupLabel, marginTop: 16 }}>История</p>
                <div className="orders-grid">
                  {orders
                    .filter((o) => ["DONE", "CANCELED"].includes(o.status))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((o) => (
                      <OrderCard key={o.id} order={o} onClick={() => router.push(`/orders/${o.id}`)} />
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const groupLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 10,
};
