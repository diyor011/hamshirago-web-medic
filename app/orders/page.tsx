"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, RefreshCw, ChevronRight, MapPin, Clock } from "lucide-react";
import { medicApi, Order, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, OrderStatus, formatPrice } from "@/lib/api";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";

const ACTIVE_STATUSES: OrderStatus[] = ["CREATED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED"];
const DONE_STATUSES: OrderStatus[] = ["DONE", "CANCELED"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type TabType = "active" | "done";

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

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
      const data = await medicApi.orders.my();
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
    tab === "active" ? ACTIVE_STATUSES.includes(o.status) : DONE_STATUSES.includes(o.status)
  );

  const doneOrders = orders.filter((o) => o.status === "DONE");
  const totalEarned = doneOrders.reduce((s, o) => s + (o.priceAmount - o.discountAmount), 0);
  const canceledCount = orders.filter((o) => o.status === "CANCELED").length;
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Заказы</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Мои заказы</h1>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 500 }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
          Обновить
        </button>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Активных", value: activeCount, color: "#0d9488", bg: "#f0fdfa" },
            { label: "Выполнено", value: doneOrders.length, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Отменено", value: canceledCount, color: "#dc2626", bg: "#fef2f2" },
          ].map((c) => (
            <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</p>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "#f1f5f9", borderRadius: 12, padding: 4, display: "flex", marginBottom: 20, width: "fit-content" }}>
        {(["active", "done"] as TabType[]).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)} style={{
            padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
            background: tab === tabKey ? "#fff" : "transparent",
            color: tab === tabKey ? "#0d9488" : "#64748b",
            boxShadow: tab === tabKey ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>
            {tabKey === "active"
              ? `Активные (${orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length})`
              : `История (${orders.filter(o => DONE_STATUSES.includes(o.status)).length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? <Spinner /> : error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, color: "#dc2626" }}>{error}</p>
          <button onClick={() => fetchOrders()} style={{ fontSize: 13, color: "#0d9488", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Повторить</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <ClipboardList size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, color: "#94a3b8" }}>
            {tab === "active" ? "Нет активных заказов" : "История пуста"}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {filtered.map((order, idx) => {
            const { text, bg } = ORDER_STATUS_COLOR[order.status];
            const net = order.priceAmount - order.discountAmount;
            return (
              <div
                key={order.id}
                onClick={() => router.push(`/order/${order.id}`)}
                style={{
                  padding: "16px 20px", cursor: "pointer",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ClipboardList size={18} color="#0d9488" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.serviceTitle}
                    </p>
                    <span style={{ background: bg, color: text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {order.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                        <MapPin size={11} />
                        {order.location.house}{order.location.floor ? `, эт. ${order.location.floor}` : ""}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                      <Clock size={11} />
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0d9488" }}>{formatPrice(net)} сум</p>
                  {order.discountAmount > 0 && (
                    <p style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>{formatPrice(order.priceAmount)} сум</p>
                  )}
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </DashboardLayout>
  );
}
