"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { TELEGRAM_SUPPORT } from "@/lib/telegram-config";
import dynamic from "next/dynamic";

const InviteMap = dynamic(() => import("@/components/Map"), { ssr: false });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SERVICE_TITLE_UZ: Record<string, string> = {
  "Внутримышечный укол": "Mushak ichiga ukol",
  "Внутривенный укол": "Vena ichiga ukol",
  "Капельница (1 флакон)": "Tomchilatgich (1 shisha)",
  "Капельница (2 флакона)": "Tomchilatgich (2 shisha)",
  "Забор крови из вены": "Venadan qon olish",
  "Забор крови из пальца": "Barmoqdan qon olish",
  "Перевязка": "Bog'lam almashtirish",
  "Измерение давления и пульса": "Bosim va puls o'lchash",
  "ЭКГ на дому": "Uyda EKG",
  "Уход за лежачим пациентом (1 час)": "Yotgan bemor parvarishi (1 soat)",
};

interface DispatchInvitePayload {
  orderId: string;
  order: {
    serviceTitle: string;
    priceAmount: number;
    discountAmount: number;
    location: {
      house: string;
      floor: string | null;
      apartment: string | null;
      phone: string;
      latitude: number;
      longitude: number;
    } | null;
  };
  expiresAt: string;
}
import { useRouter } from "next/navigation";
import { MapPin, Clock, RefreshCw, ChevronRight, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { medicApi, WS_URL, Order, Medic, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, OrderStatus, formatPrice } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { io, Socket } from "socket.io-client";
import { unsubscribeWebPush } from "@/lib/webPush";
import DashboardLayout from "@/components/DashboardLayout";

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
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, bg } = ORDER_STATUS_COLOR[status];
  const { t } = useTranslation();
  return (
    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: text, background: bg, whiteSpace: "nowrap" }}>
      {t(`order.status.${status}`)}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [socketOk, setSocketOk] = useState(true);
  const [walletModal, setWalletModal] = useState<{ required: number; current: number } | null>(null);
  const [inactiveWarning, setInactiveWarning] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isOnlineRef = useRef(false);
  const titleBlinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [invite, setInvite] = useState<DispatchInvitePayload | null>(null);
  const [inviteSecondsLeft, setInviteSecondsLeft] = useState(60);
  const inviteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [inviteLoading, setInviteLoading] = useState<"accept" | "decline" | null>(null);
  const [expiredToast, setExpiredToast] = useState(false);
  const [medicPos, setMedicPos] = useState<{ lat: number; lng: number } | null>(null);

  const notifyNewOrder = useCallback((order?: Order) => {
    playOrderAlert();
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
    // Redirect doctors away from the medic dashboard
    if (localStorage.getItem("user_role") === "doctor") { router.replace("/doctor/consultations"); return; }

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

    const locationInterval = setInterval(() => {
      if (isOnlineRef.current && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          medicApi.location.update(true, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        }, () => {}, { enableHighAccuracy: false, timeout: 5000 });
      }
    }, 30000);

    return () => {
      clearInterval(locationInterval);
      if (titleBlinkRef.current) clearInterval(titleBlinkRef.current);
      if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
      socketRef.current?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyNewOrder]);

  function connectSocket(token: string) {
    const socket = io(WS_URL, {
      auth: { token }, transports: ["websocket"], reconnection: true, reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setSocketOk(true);
      // If invite was active before disconnect — clear it if already expired.
      // Backend marks it TIMEOUT on restart, so accepting would fail with
      // "No active dispatch invite". Let the new invite arrive via dispatch_invite event.
      setInvite((prev) => {
        if (prev && new Date(prev.expiresAt) <= new Date()) {
          if (inviteTimerRef.current) { clearInterval(inviteTimerRef.current); inviteTimerRef.current = null; }
          return null;
        }
        return prev;
      });
    });
    socket.on("disconnect", () => setSocketOk(false));
    socket.on("connect_error", () => setSocketOk(false));
    socket.on("order_status", ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      // If order was cancelled while invite popup was open — close it
      if (status === "CANCELED") {
        setInvite((prev) => {
          if (prev?.orderId === orderId) {
            if (inviteTimerRef.current) { clearInterval(inviteTimerRef.current); inviteTimerRef.current = null; }
            return null;
          }
          return prev;
        });
      }
    });

    socket.on("dispatch_invite", (payload: DispatchInvitePayload) => {
      if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
      const updateCountdown = () => {
        const ms = new Date(payload.expiresAt).getTime() - Date.now();
        setInviteSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
      };
      updateCountdown();
      inviteTimerRef.current = setInterval(updateCountdown, 500);
      setInvite(payload);
      playOrderAlert();
      // Get medic's location for map + distance
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setMedicPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    });

    socket.on("dispatch_invite_expired", ({ orderId }: { orderId: string }) => {
      setInvite((prev) => {
        if (prev?.orderId === orderId) {
          if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
          return null;
        }
        return prev;
      });
      setExpiredToast(true);
      setTimeout(() => setExpiredToast(false), 3000);
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      const my = await medicApi.orders.my().catch(() => [] as Order[]);
      const myArr = Array.isArray(my) ? my : [];
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

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("medic_token");
    localStorage.removeItem("medic");
    router.push("/auth");
  }

  async function acceptInvite() {
    if (!invite) return;
    setInviteLoading("accept");
    try {
      await medicApi.orders.accept(invite.orderId);
      if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
      setInvite(null);
      setMedicPos(null);
      router.push(`/order/${invite.orderId}`);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "INSUFFICIENT_WALLET") {
        setInvite(null);
        setWalletModal({ required: (err as any).required, current: (err as any).current });
        setInviteLoading(null);
        return;
      }
      // Invite expired on backend (clock skew or backend restart) — close gracefully
      if (err instanceof Error && (
        err.message.includes("No active dispatch invite") ||
        err.message.includes("Dispatch invite has expired") ||
        err.message.includes("no longer available")
      )) {
        if (inviteTimerRef.current) { clearInterval(inviteTimerRef.current); inviteTimerRef.current = null; }
        setInvite(null);
        setExpiredToast(true);
        setTimeout(() => setExpiredToast(false), 3000);
        setInviteLoading(null);
        return;
      }
      alert(err instanceof Error ? err.message : t("common.error"));
      setInviteLoading(null);
    }
  }

  async function declineInvite() {
    if (!invite) return;
    setInviteLoading("decline");
    try {
      await medicApi.orders.decline(invite.orderId);
      if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
      setInvite(null);
      setMedicPos(null);
    } catch (err: unknown) {
      // Already expired or consumed — close gracefully
      if (err instanceof Error && (
        err.message.includes("No active dispatch invite") ||
        err.message.includes("Dispatch invite has expired")
      )) {
        if (inviteTimerRef.current) { clearInterval(inviteTimerRef.current); inviteTimerRef.current = null; }
        setInvite(null);
        setInviteLoading(null);
        return;
      }
      alert(err instanceof Error ? err.message : t("common.error"));
      setInviteLoading(null);
    }
  }

  const activeOrders = myOrders.filter(o => !["DONE", "CANCELED"].includes(o.status));
  const historyOrders = myOrders.filter(o => ["DONE", "CANCELED"].includes(o.status));

  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер");
  }, []);

  return (
    <DashboardLayout>
      <style>{`
        .dash-columns { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .orders-grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 860px) {
          .dash-columns { grid-template-columns: 300px 1fr; }
          .orders-grid-2 { grid-template-columns: 1fr 1fr; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Welcome card */}
      <div style={{
        background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        borderRadius: 20, padding: "28px 32px", marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "relative" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
            {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            {greeting}, {medic?.name?.split(" ")[0] ?? "..."}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
            {isOnline
              ? `Активных заказов: ${activeOrders.length}`
              : "Вы офлайн — включите режим онлайн чтобы получать заказы"}
          </p>
        </div>
        {/* Connection indicator */}
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 10px" }}>
            {socketOk
              ? <Wifi size={12} color="#fff" />
              : <WifiOff size={12} color="#fbbf24" />}
            <span style={{ fontSize: 11, color: socketOk ? "rgba(255,255,255,0.9)" : "#fbbf24", fontWeight: 600 }}>
              {socketOk ? "Онлайн" : "Нет связи"}
            </span>
          </div>
        </div>
      </div>

      <div>
        {/* Connection lost banner */}
        {!socketOk && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            <WifiOff size={14} />
            {t("home.connectionLost")}
          </div>
        )}
        {/* Inactive warning banner */}
        {inactiveWarning && (
          <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
              ℹ️ {t("home.inactiveWarning")}
            </span>
            <button onClick={() => setInactiveWarning(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}
        {/* Verification banner */}
        {medic && medic.verificationStatus !== "APPROVED" && (
          <div style={{ background: medic.verificationStatus === "REJECTED" ? "#fef2f2" : "#fef3c7", border: `1px solid ${medic.verificationStatus === "REJECTED" ? "#fca5a5" : "#fbbf24"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: medic.verificationStatus === "REJECTED" ? "#dc2626" : "#92400e" }}>
              {medic.verificationStatus === "REJECTED"
                ? `❌ ${t("home.verificationRejected")}`
                : `⏳ ${t("home.verificationPending")}`}
            </span>
            <button onClick={() => router.push("/profile")} style={{ background: medic.verificationStatus === "REJECTED" ? "#dc2626" : "#92400e", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t("home.profileBtn")}
            </button>
          </div>
        )}
        <div className="dash-columns">

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
                  {isOnline ? t("home.isOnline") : t("home.isOffline")}
                </p>
                <p style={{ fontSize: 13, color: isOnline ? "rgba(255,255,255,0.85)" : "#94a3b8", marginTop: 3 }}>
                  {isOnline ? t("home.ordersReceiving") : t("home.tapToStart")}
                </p>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: isOnline ? "rgba(255,255,255,0.3)" : "#e2e8f0", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: isOnline ? 23 : 3 }} />
              </div>
            </button>

            {/* Stats */}
            {medic && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {medic.rating !== null ? Number(medic.rating).toFixed(1) : "—"}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{t("home.statsRating")}</p>
                </div>
                <div style={{ textAlign: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0d9488" }}>{formatPrice(medic.balance)}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{t("home.statsBalance")}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{medic.experienceYears}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{t("home.statsExp")}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("home.myOrders")}</p>
              <button onClick={() => router.push("/orders")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#0d9488", fontWeight: 600 }}>
                Вся история <ChevronRight size={12} />
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: "#64748b" }}>{t("home.loadingData")}</p>
              </div>
            )}

            {!loading && (
              <>
                {activeOrders.length === 0 && historyOrders.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
                    {t("home.noMyOrders")}
                  </div>
                )}

                {activeOrders.length > 0 && (
                  <>
                    <p style={groupLabel}>{t("home.active")}</p>
                    <div className="orders-grid-2">
                      {activeOrders.map(order => (
                        <button key={order.id} onClick={() => router.push(`/order/${order.id}`)}
                          style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{language === "uz" ? (SERVICE_TITLE_UZ[order.serviceTitle] ?? order.serviceTitle) : order.serviceTitle}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          {order.location && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <MapPin size={12} color="#94a3b8" />
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
                    <p style={{ ...groupLabel, marginTop: 16 }}>{t("home.history")}</p>
                    <div className="orders-grid-2">
                      {historyOrders.slice(0, 20).map(order => (
                        <div key={order.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, opacity: 0.85 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{language === "uz" ? (SERVICE_TITLE_UZ[order.serviceTitle] ?? order.serviceTitle) : order.serviceTitle}</span>
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
                    <Clock size={40} color="#e2e8f0" style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{t("home.noOrdersYet")}</p>
                    <p style={{ fontSize: 14, color: "#64748b" }}>{isOnline ? t("home.waitOrders") : t("home.enableOnline")}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch invite modal */}
      {invite && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, maxWidth: 480, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}>
            {/* Timer header */}
            <div style={{
              background: inviteSecondsLeft === 0 ? "#64748b" : inviteSecondsLeft <= 15 ? "#d97706" : "#0d9488",
              padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 16,
              transition: "background 0.5s ease",
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {inviteSecondsLeft}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{t("home.inviteSec")}</span>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {inviteSecondsLeft === 0 ? t("home.inviteExpired") : `🚨 ${t("home.inviteNewOrder")}`}
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
                  {inviteSecondsLeft === 0
                    ? t("home.inviteExpiredDesc")
                    : t("home.inviteRespondSec", { sec: inviteSecondsLeft })}
                </p>
              </div>
            </div>

            {/* Order details */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                {language === "uz" ? (SERVICE_TITLE_UZ[invite.order.serviceTitle] ?? invite.order.serviceTitle) : invite.order.serviceTitle}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>{t("home.invitePrice")}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0d9488" }}>
                    {((invite.order.priceAmount ?? 0) - (invite.order.discountAmount ?? 0)).toLocaleString("ru-RU")} UZS
                  </span>
                </div>
                {invite.order.location && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 14, color: "#64748b", flexShrink: 0 }}>{t("home.inviteAddress")}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
                        {[
                          invite.order.location.house,
                          invite.order.location.floor ? `${t("home.floor")} ${invite.order.location.floor}` : null,
                          invite.order.location.apartment ? `${t("home.apt")} ${invite.order.location.apartment}` : null,
                        ].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: "#64748b" }}>{t("home.invitePhone")}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {invite.order.location.phone}
                      </span>
                    </div>
                    {medicPos && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 14, color: "#64748b" }}>{t("home.inviteDistance") || "Расстояние"}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0d9488" }}>
                          {(() => {
                            const km = haversineKm(medicPos.lat, medicPos.lng, invite.order.location!.latitude, invite.order.location!.longitude);
                            return km < 1 ? `~${Math.round(km * 1000)} м` : `~${km.toFixed(1)} км`;
                          })()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mini map: client + medic positions */}
              {invite.order.location && (
                <div style={{ height: 200, borderRadius: 12, overflow: "hidden", marginBottom: 16, border: "1px solid #e2e8f0" }}>
                  <InviteMap
                    lat={invite.order.location.latitude}
                    lng={invite.order.location.longitude}
                    medicLat={medicPos?.lat ?? null}
                    medicLng={medicPos?.lng ?? null}
                  />
                </div>
              )}

              <button
                onClick={acceptInvite}
                disabled={inviteLoading !== null || inviteSecondsLeft === 0}
                style={{
                  width: "100%", background: "#0d9488", color: "#fff",
                  fontSize: 17, fontWeight: 700, border: "none",
                  borderRadius: 14, padding: "16px",
                  cursor: (inviteLoading !== null || inviteSecondsLeft === 0) ? "not-allowed" : "pointer",
                  opacity: (inviteLoading !== null || inviteSecondsLeft === 0) ? 0.5 : 1,
                  marginBottom: 10,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "opacity 150ms ease",
                }}
              >
                {inviteLoading === "accept" ? t("home.inviteAccepting") : `✓ ${t("home.inviteAccept")}`}
              </button>
              <button
                onClick={declineInvite}
                disabled={inviteLoading !== null || inviteSecondsLeft === 0}
                style={{
                  width: "100%", background: "#fff", color: "#ef4444",
                  fontSize: 15, fontWeight: 600,
                  border: "1.5px solid #ef4444", borderRadius: 14, padding: "14px",
                  cursor: (inviteLoading !== null || inviteSecondsLeft === 0) ? "not-allowed" : "pointer",
                  opacity: (inviteLoading !== null || inviteSecondsLeft === 0) ? 0.4 : 1,
                  transition: "opacity 150ms ease",
                }}
              >
                {inviteLoading === "decline" ? t("home.inviteDeclining") : `✕ ${t("home.inviteDecline")}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch invite expired toast */}
      {expiredToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 10000, background: "#d97706", color: "#fff",
          borderRadius: 12, padding: "12px 22px",
          fontSize: 14, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(217,119,6,0.45)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          Предложение заказа истекло
        </div>
      )}

      {/* Wallet insufficient funds modal */}
      {walletModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>💸</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", textAlign: "center" }}>{t("wallet.insufficientTitle")}</h3>
            <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 1.6 }}>{t("wallet.insufficientDesc")}</p>
            <div style={{ width: "100%", background: "#f8fafc", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "#64748b" }}>{t("wallet.current")}</span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>{walletModal.current.toLocaleString("ru-RU")} {t("common.sum")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "#64748b" }}>{t("wallet.required")}</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{walletModal.required.toLocaleString("ru-RU")} {t("common.sum")}</span>
              </div>
            </div>
            <a href={TELEGRAM_SUPPORT} target="_blank" rel="noreferrer"
              style={{ width: "100%", background: "#0088cc", color: "#fff", borderRadius: 12, padding: "13px", textAlign: "center", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              ✈️ {t("wallet.contactAdmin")}
            </a>
            <button onClick={() => setWalletModal(null)}
              style={{ width: "100%", background: "#f1f5f9", color: "#64748b", borderRadius: 12, padding: "13px", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              {t("wallet.close")}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const groupLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 };
