"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaClipboardList } from "react-icons/fa";
import { medicApi, Order, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, OrderStatus, formatPrice } from "@/lib/api";
import { useTranslation } from "react-i18next";

const ACTIVE_STATUSES: OrderStatus[] = ["CREATED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED"];
const DONE_STATUSES: OrderStatus[] = ["DONE", "CANCELED"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type TabType = "active" | "done";

export default function OrdersHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabType>("active");

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
  }, [router]);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const data = await medicApi.my();
      setOrders(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) =>
    tab === "active"
      ? ACTIVE_STATUSES.includes(o.status)
      : DONE_STATUSES.includes(o.status)
  );

  // KPIs
  const doneOrders = orders.filter((o) => o.status === "DONE");
  const totalEarned = doneOrders.reduce((s, o) => s + (o.priceAmount - o.discountAmount), 0);
  const canceledCount = orders.filter((o) => o.status === "CANCELED").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => router.push("/")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <FaArrowLeft size={15} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Мои заказы</p>
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 16 }}
            >
              {refreshing ? "…" : "↻"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "-20px auto 0", padding: "0 16px 80px" }}>

        {/* KPI strip */}
        {!loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Выполнено", value: doneOrders.length, color: "#16a34a" },
              { label: "Заработано", value: `${formatPrice(totalEarned)} сум`, color: "#0d9488" },
              { label: "Отменено", value: canceledCount, color: "#dc2626" },
            ].map((c) => (
              <div
                key={c.label}
                style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "12px 10px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}
              >
                <p style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{c.value}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {(["active", "done"] as TabType[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                flex: 1, border: "none", borderRadius: 10, padding: "10px",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                background: tab === tabKey ? "#fff" : "transparent",
                color: tab === tabKey ? "#0d9488" : "#64748b",
                boxShadow: tab === tabKey ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tabKey === "active" ? `Активные (${orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length})` : `История (${orders.filter(o => DONE_STATUSES.includes(o.status)).length})`}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, color: "#dc2626" }}>{error}</p>
            <button onClick={() => fetchOrders()} style={{ fontSize: 12, color: "#0d9488", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Повторить</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <FaClipboardList size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, color: "#94a3b8" }}>
              {tab === "active" ? "Нет активных заказов" : "История пуста"}
            </p>
          </div>
        )}

        {/* Orders list */}
        {!loading && filtered.map((order) => {
          const { text, bg } = ORDER_STATUS_COLOR[order.status];
          const net = order.priceAmount - order.discountAmount;
          return (
            <div
              key={order.id}
              onClick={() => router.push(`/order/${order.id}`)}
              style={{
                background: "#fff", borderRadius: 14, padding: "16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
                marginBottom: 10, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{order.serviceTitle}</p>
                  {order.location && (
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {order.location.house}{order.location.floor ? `, эт. ${order.location.floor}` : ""}
                      {order.location.apartment ? `, кв. ${order.location.apartment}` : ""}
                    </p>
                  )}
                </div>
                <span style={{ background: bg, color: text, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 12, color: "#94a3b8" }}>{formatDate(order.created_at)}</p>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0d9488" }}>{formatPrice(net)} сум</p>
                  {order.discountAmount > 0 && (
                    <p style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>{formatPrice(order.priceAmount)} сум</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
