"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaWallet, FaChartLine, FaCheckCircle } from "react-icons/fa";
import { medicApi, Medic, Order, formatPrice, ORDER_STATUS_LABELS } from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function calcEarnings(order: Order): number {
  const price = order.priceAmount ?? 0;
  const urgentFee = order.urgentFee ?? 0;
  const discount = order.discountAmount ?? 0;
  const platformFee = order.platformFee ?? 0;
  const net = price + urgentFee - discount;
  return Math.max(0, net - platformFee);
}

export default function WalletPage() {
  const router = useRouter();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [doneOrders, setDoneOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
    try {
      const [me, orders] = await Promise.all([
        medicApi.auth.me(),
        medicApi.orders.my(),
      ]);
      setMedic(me);
      setDoneOrders(orders.filter((o) => o.status === "DONE").sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {}
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalEarnings = doneOrders.reduce((sum, o) => sum + calcEarnings(o), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => router.push("/profile")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <FaArrowLeft size={15} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Кошелёк</p>
            <div style={{ width: 36 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "-20px auto 0", padding: "0 16px 80px" }}>

        {/* Balance + Earnings cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", borderRadius: 16, padding: "18px 16px", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, opacity: 0.85 }}>
              <FaWallet size={14} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Баланс</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
              {formatPrice(Number(medic?.balance ?? 0))}
            </p>
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>сум</p>
          </div>

          <div style={{ background: "linear-gradient(135deg, #059669, #047857)", borderRadius: 16, padding: "18px 16px", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, opacity: 0.85 }}>
              <FaChartLine size={14} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Заработано</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
              {formatPrice(Number(medic?.earnings ?? totalEarnings))}
            </p>
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>сум всего</p>
          </div>
        </div>

        {/* Transaction history */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, paddingLeft: 4 }}>
          История выплат
        </p>

        {doneOrders.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <FaCheckCircle size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Выполненных заказов пока нет</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {doneOrders.map((order) => {
            const earned = calcEarnings(order);
            const price = order.priceAmount ?? 0;
            const urgentFee = order.urgentFee ?? 0;
            const discount = order.discountAmount ?? 0;
            const platformFee = order.platformFee ?? 0;

            return (
              <div key={order.id} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                      {(order as any).service?.title ?? "Услуга"}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{formatDate(order.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>
                    +{formatPrice(earned)} сум
                  </span>
                </div>

                {/* Breakdown */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Стоимость услуги</span>
                    <span style={{ fontSize: 12, color: "#334155" }}>{formatPrice(price)} сум</span>
                  </div>
                  {urgentFee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Срочный выезд</span>
                      <span style={{ fontSize: 12, color: "#334155" }}>+{formatPrice(urgentFee)} сум</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Скидка клиента</span>
                      <span style={{ fontSize: 12, color: "#ef4444" }}>−{formatPrice(discount)} сум</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Комиссия платформы (10%)</span>
                    <span style={{ fontSize: 12, color: "#ef4444" }}>−{formatPrice(platformFee)} сум</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
