"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wallet, TrendingUp, ArrowDownLeft, Minus } from "lucide-react";
import { medicApi, Medic, Order, formatPrice } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";

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

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
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
      const [me, orders] = await Promise.all([medicApi.auth.me(), medicApi.orders.my()]);
      setMedic(me);
      setDoneOrders(orders.filter((o) => o.status === "DONE").sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch {}
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const totalEarnings = doneOrders.reduce((sum, o) => sum + calcEarnings(o), 0);
  const balance = Number(medic?.balance ?? 0);
  const lifetimeEarnings = Number(medic?.earnings ?? totalEarnings);

  return (
    <DashboardLayout>
      {loading ? <Spinner /> : (
        <div>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Финансы</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Кошелёк</h1>
          </div>

          {/* Balance cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            {/* Balance */}
            <div style={{
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              borderRadius: 16, padding: "24px", color: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, opacity: 0.85 }}>
                <Wallet size={16} />
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Баланс</span>
              </div>
              <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{formatPrice(balance)}</p>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>сум · доступно</p>
            </div>

            {/* Lifetime earnings */}
            <div style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              borderRadius: 16, padding: "24px", color: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, opacity: 0.85 }}>
                <TrendingUp size={16} />
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Заработано</span>
              </div>
              <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{formatPrice(lifetimeEarnings)}</p>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>сум · всего за всё время</p>
            </div>

            {/* Completed orders */}
            <div style={{
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "#64748b" }}>
                <ArrowDownLeft size={16} />
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Выполнено заказов</span>
              </div>
              <p style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{doneOrders.length}</p>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>заказов завершено</p>
            </div>
          </div>

          {/* Transaction history */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>История транзакций</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Заработок по выполненным заказам</p>
            </div>

            {doneOrders.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <Wallet size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Выполненных заказов пока нет</p>
              </div>
            ) : (
              <div>
                {doneOrders.map((order, idx) => {
                  const earned = calcEarnings(order);
                  const price = order.priceAmount ?? 0;
                  const urgentFee = order.urgentFee ?? 0;
                  const discount = order.discountAmount ?? 0;
                  const platformFee = order.platformFee ?? 0;

                  return (
                    <div key={order.id} style={{
                      padding: "16px 24px",
                      borderBottom: idx < doneOrders.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ArrowDownLeft size={16} color="#0d9488" />
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                              {(order as any).service?.title ?? order.serviceTitle ?? "Услуга"}
                            </p>
                            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>
                          +{formatPrice(earned)} сум
                        </span>
                      </div>

                      {/* Breakdown */}
                      <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Стоимость услуги</span>
                          <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>{formatPrice(price)} сум</span>
                        </div>
                        {urgentFee > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>Срочный выезд</span>
                            <span style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>+{formatPrice(urgentFee)} сум</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>Скидка клиента</span>
                            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>−{formatPrice(discount)} сум</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Комиссия платформы</span>
                          <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>−{formatPrice(platformFee)} сум</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
