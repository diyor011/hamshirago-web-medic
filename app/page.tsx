"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaMedkit, FaSignOutAlt, FaMapMarker, FaClock, FaRedo, FaToggleOn, FaToggleOff, FaUserCircle } from "react-icons/fa";
import { medicApi, WS_URL, Order, Medic, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, OrderStatus, formatPrice } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { unsubscribeWebPush } from "@/lib/webPush";

function playOrderAlert() {
  try {
    const ctx = new AudioContext();
    const beeps = [0, 0.35, 0.7];
    beeps.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.28);
    });
  } catch { /* ignore */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, bg } = ORDER_STATUS_COLOR[status];
  return (
    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: text, background: bg, whiteSpace: "nowrap" }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [available, setAvailable] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [tab, setTab] = useState<"available" | "my">("available");
  const [socketOk, setSocketOk] = useState(true);
  const [acceptError, setAcceptError] = useState("");
  const [inactiveWarning, setInactiveWarning] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isOnlineRef = useRef(false);
  const availableIdsRef = useRef<Set<string>>(new Set());
  const titleBlinkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const notifyNewOrder = useCallback((order?: Order) => {
    playOrderAlert();
    // Мигание заголовка вкладки
    if (titleBlinkRef.current) clearInterval(titleBlinkRef.current);
    let on = true;
    titleBlinkRef.current = setInterval(() => {
      document.title = on ? "🔔 НОВЫЙ ЗАКАЗ!" : "HamshiraGo Медик";
      on = !on;
    }, 700);
    setTimeout(() => {
      if (titleBlinkRef.current) { clearInterval(titleBlinkRef.current); titleBlinkRef.current = null; }
      document.title = "HamshiraGo Медик";
    }, 30000);
    // Telegram уведомление
    const chatId = localStorage.getItem("tg_chat_id");
    if (chatId) {
      const text = order
        ? `🔔 <b>Новый заказ!</b>\n\n📋 ${order.serviceTitle}\n💰 ${order.priceAmount.toLocaleString()} UZS\n📍 ${order.location?.house || ""}\n\nОткройте приложение чтобы принять заказ.`
        : "🔔 <b>Новый заказ!</b>\n\nОткройте приложение чтобы принять заказ.";
      fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, text }),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }

    const saved = localStorage.getItem("medic");
    if (saved) {
      try {
        const m = JSON.parse(saved) as Medic;
        setMedic(m);
        setIsOnline(m.isOnline);
        isOnlineRef.current = m.isOnline;
      } catch {
        localStorage.removeItem("medic");
      }
    }

    // Получаем свежий профиль — проверяем авто-отключение из-за бездействия
    medicApi.auth.me().then((profile) => {
      setMedic(profile);
      localStorage.setItem("medic", JSON.stringify(profile));
      if (profile.onlineDisabledReason === 'INACTIVE_5H') {
        setInactiveWarning(true);
        setIsOnline(false);
        isOnlineRef.current = false;
      } else {
        setIsOnline(profile.isOnline);
        isOnlineRef.current = profile.isOnline;
      }
    }).catch((err: unknown) => console.error("profile refresh failed", err));

    loadData();
    connectSocket(token);

    // Обновляем координаты каждые 30 секунд если онлайн
    const locationInterval = setInterval(() => {
      if (isOnlineRef.current && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          medicApi.location.update(true, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        }, () => {}, { enableHighAccuracy: false, timeout: 5000 });
      }
    }, 30000);

    // Поллинг доступных заказов каждые 15 секунд (fallback если WebSocket пропустил)
    const pollInterval = setInterval(() => {
      if (isOnlineRef.current) {
        medicApi.orders.available().then((avail) => {
          // Проверяем появились ли новые заказы
          const hasNew = avail.some((o) => !availableIdsRef.current.has(o.id));
          if (hasNew) notifyNewOrder();
          availableIdsRef.current = new Set(avail.map((o) => o.id));
          setAvailable(avail);
        }).catch(() => {});
      }
    }, 15000);

    return () => {
      clearInterval(locationInterval);
      clearInterval(pollInterval);
      if (titleBlinkRef.current) clearInterval(titleBlinkRef.current);
      socketRef.current?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyNewOrder]);

  function connectSocket(token: string) {
    const socket = io(WS_URL, {
      auth: { token }, transports: ["websocket"], reconnection: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setSocketOk(true));
    socket.on("disconnect", () => setSocketOk(false));
    socket.on("connect_error", () => setSocketOk(false));
    socket.on("order_status", ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setAvailable(prev => prev.filter(o => o.id !== orderId));
    });
    socket.on("new_order", (order: Order) => {
      setAvailable(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        notifyNewOrder(order);
        availableIdsRef.current.add(order.id);
        return [order, ...prev];
      });
      setTab("available");
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      const [avail, my] = await Promise.all([
        medicApi.orders.available().catch(() => [] as Order[]),
        medicApi.orders.my().catch(() => [] as Order[]),
      ]);
      const availArr = Array.isArray(avail) ? avail : [];
      const myArr = Array.isArray(my) ? my : [];
      availableIdsRef.current = new Set(availArr.map((o) => o.id));
      setAvailable(availArr);
      setMyOrders(myArr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } finally {
      setLoading(false);
    }
  }

  async function toggleOnline() {
    setTogglingOnline(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (!isOnline && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        });
      }
      await medicApi.location.update(!isOnline, lat, lng);
      setIsOnline(v => {
        const next = !v;
        isOnlineRef.current = next;
        try {
          const saved = JSON.parse(localStorage.getItem("medic") || "{}");
          localStorage.setItem("medic", JSON.stringify({ ...saved, isOnline: next }));
        } catch { /* ignore */ }
        return next;
      });
      if (!isOnline) loadData();
    } finally {
      setTogglingOnline(false);
    }
  }

  async function acceptOrder(orderId: string) {
    try {
      const order = await medicApi.orders.accept(orderId);
      setAvailable(prev => prev.filter(o => o.id !== orderId));
      setMyOrders(prev => [order, ...prev]);
      socketRef.current?.emit("subscribe_order", orderId);
      router.push(`/order/${orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      setAcceptError(msg);
      setTimeout(() => setAcceptError(""), 5000);
    }
  }

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("medic_token");
    localStorage.removeItem("medic");
    router.push("/auth");
  }

  const activeOrders = myOrders.filter(o => !["DONE", "CANCELED"].includes(o.status));
  const historyOrders = myOrders.filter(o => ["DONE", "CANCELED"].includes(o.status));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        .dash-header-inner { max-width: 1100px; margin: 0 auto; padding: 20px 24px 20px; }
        .dash-body { max-width: 1100px; margin: 0 auto; padding: 20px 24px 80px; }
        .dash-columns { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .orders-grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 860px) {
          .dash-columns { grid-template-columns: 320px 1fr; }
          .orders-grid-2 { grid-template-columns: 1fr 1fr; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div className="dash-header-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaMedkit size={20} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Медик</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{medic?.name ?? "..."}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={loadData} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <FaRedo size={14} />
              </button>
              <button onClick={() => router.push("/profile")} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <FaUserCircle size={18} />
              </button>
              <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <FaSignOutAlt size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-body">
        {/* Баннер обрыва соединения */}
        {!socketOk && (
          <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            Соединение потеряно — новые заказы могут не поступать. Проверьте интернет.
          </div>
        )}
        {/* Баннер авто-отключения из-за бездействия */}
        {inactiveWarning && (
          <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
              ℹ️ Вы были переведены в оффлайн из-за 5 часов бездействия. Нажмите &quot;Вы оффлайн&quot; чтобы начать работу.
            </span>
            <button onClick={() => setInactiveWarning(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}
        {/* Баннер верификации */}
        {medic && medic.verificationStatus !== "APPROVED" && (
          <div style={{ background: medic.verificationStatus === "REJECTED" ? "#fef2f2" : "#fef3c7", border: `1px solid ${medic.verificationStatus === "REJECTED" ? "#fca5a5" : "#fbbf24"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: medic.verificationStatus === "REJECTED" ? "#dc2626" : "#92400e" }}>
              {medic.verificationStatus === "REJECTED"
                ? "❌ Верификация отклонена — загрузите документы заново"
                : "⏳ Аккаунт ожидает верификации — вы не можете принимать заказы"}
            </span>
            <button onClick={() => router.push("/profile")} style={{ background: medic.verificationStatus === "REJECTED" ? "#dc2626" : "#92400e", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              Профиль
            </button>
          </div>
        )}
        <div className="dash-columns">

          {/* ─── Левая колонка (статус + инфо) ─── */}
          <div>
            {/* Online toggle */}
            <button onClick={toggleOnline} disabled={togglingOnline}
              style={{
                width: "100%", borderRadius: 16, padding: "16px",
                cursor: togglingOnline ? "not-allowed" : "pointer",
                background: isOnline ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: isOnline ? "0 4px 16px rgba(34,197,94,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
                transition: "all 250ms ease",
                border: isOnline ? "none" : "1px solid #e2e8f0",
              } as React.CSSProperties}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: isOnline ? "#fff" : "#0f172a" }}>
                  {isOnline ? "Вы онлайн" : "Вы оффлайн"}
                </p>
                <p style={{ fontSize: 13, color: isOnline ? "rgba(255,255,255,0.85)" : "#94a3b8", marginTop: 3 }}>
                  {isOnline ? "Вам поступают заказы" : "Нажмите чтобы начать работу"}
                </p>
              </div>
              {isOnline
                ? <FaToggleOn size={40} color="rgba(255,255,255,0.9)" />
                : <FaToggleOff size={40} color="#cbd5e1" />}
            </button>

            {/* Статистика */}
            {medic && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {medic.rating !== null ? Number(medic.rating).toFixed(1) : "—"}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Рейтинг</p>
                </div>
                <div style={{ textAlign: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0d9488" }}>{formatPrice(medic.balance)}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Баланс UZS</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{medic.experienceYears}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Лет опыта</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Правая колонка (заказы) ─── */}
          <div>
            {/* Табы */}
            <div style={{ background: "#f1f5f9", borderRadius: 12, padding: 4, display: "flex", marginBottom: 16 }}>
              {([["available", "Доступные"], ["my", "Мои заказы"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 700, transition: "all 150ms ease",
                    background: tab === key ? "#fff" : "transparent",
                    color: tab === key ? "#0d9488" : "#94a3b8",
                    boxShadow: tab === key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  }}>
                  {label}
                  {key === "available" && available.length > 0 && (
                    <span style={{ marginLeft: 6, background: "#0d9488", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{available.length}</span>
                  )}
                  {key === "my" && activeOrders.length > 0 && (
                    <span style={{ marginLeft: 6, background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{activeOrders.length}</span>
                  )}
                </button>
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: "#64748b" }}>Загружаем данные...</p>
              </div>
            )}

            {/* Доступные заказы */}
            {!loading && tab === "available" && (
              <>
                {!isOnline ? (
                  <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <FaToggleOff size={48} color="#e2e8f0" style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Вы оффлайн</p>
                    <p style={{ fontSize: 14, color: "#64748b" }}>Включите онлайн чтобы получать заказы</p>
                  </div>
                ) : available.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <FaClock size={40} color="#e2e8f0" style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Новых заказов нет</p>
                    <p style={{ fontSize: 14, color: "#64748b" }}>Ожидайте — заказы появятся здесь</p>
                  </div>
                ) : (
                  <>
                    {acceptError && (
                      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 12, color: "#dc2626", fontSize: 14, fontWeight: 600 }}>
                        {(acceptError.includes("not yet verified") || acceptError.includes("не верифицирован")) ? (
                          <div>
                            <p style={{ marginBottom: 8 }}>Аккаунт не верифицирован. Загрузите документы в профиле.</p>
                            <button
                              onClick={() => router.push("/profile")}
                              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                            >
                              Перейти в профиль
                            </button>
                          </div>
                        ) : acceptError}
                      </div>
                    )}
                  <div className="orders-grid-2">
                    {available.map(order => (
                      <div key={order.id} style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{order.serviceTitle}</p>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#0d9488", whiteSpace: "nowrap", marginLeft: 8 }}>{formatPrice(order.priceAmount - order.discountAmount)} UZS</span>
                        </div>
                        {order.location && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 14 }}>
                            <FaMapMarker size={13} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "#64748b" }}>
                              {order.location.house}
                              {order.location.floor ? `, эт. ${order.location.floor}` : ""}
                              {order.location.apartment ? `, кв. ${order.location.apartment}` : ""}
                            </span>
                          </div>
                        )}
                        <button onClick={() => acceptOrder(order.id)}
                          style={{ width: "100%", background: "#0d9488", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "13px", border: "none", cursor: "pointer" }}>
                          Принять заказ
                        </button>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </>
            )}

            {/* Мои заказы */}
            {!loading && tab === "my" && (
              <>
                {activeOrders.length > 0 && (
                  <>
                    <p style={groupLabel}>Активные</p>
                    <div className="orders-grid-2">
                      {activeOrders.map(order => (
                        <button key={order.id} onClick={() => router.push(`/order/${order.id}`)}
                          style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{order.serviceTitle}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          {order.location && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <FaMapMarker size={12} color="#94a3b8" />
                              <span style={{ fontSize: 13, color: "#64748b" }}>{order.location.house}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {historyOrders.length > 0 && (
                  <>
                    <p style={{ ...groupLabel, marginTop: 16 }}>История</p>
                    <div className="orders-grid-2">
                      {historyOrders.slice(0, 20).map(order => (
                        <div key={order.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, opacity: 0.85 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{order.serviceTitle}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#0d9488", marginTop: 6 }}>
                            {formatPrice(order.priceAmount - order.discountAmount)} UZS
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {myOrders.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Заказов пока нет</p>
                    <p style={{ fontSize: 14, color: "#64748b" }}>Перейдите во вкладку &quot;Доступные&quot;</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const groupLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 };
