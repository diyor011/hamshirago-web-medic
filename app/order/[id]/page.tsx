"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ChevronLeft, MapPin, Phone,
  Navigation, CheckCircle, Activity,
  MessageCircle, Send, X,
} from "lucide-react";
import { medicApi, WS_URL, Order, OrderStatus, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, NEXT_STATUS, formatPrice, MedicalCard, Review, ChatMessage } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showNavChoice, setShowNavChoice] = useState(false);
  const [socketOk, setSocketOk] = useState(true);
  const [medicLoc, setMedicLoc] = useState<{ lat: number; lng: number; heading?: number | null } | null>(null);
  const [selfName, setSelfName] = useState("");
  const [selfPhoto, setSelfPhoto] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [eta, setEta] = useState<{ minutes: number; distanceKm: number } | null>(null);
  const [medicalCard, setMedicalCard] = useState<MedicalCard | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const lastRouteFetchRef = useRef(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [settingFinalPrice, setSettingFinalPrice] = useState(false);
  const [finalPriceError, setFinalPriceError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myMedicId = useRef<string>("");

  const lastLocationSentRef = useRef(0);

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem("medic") ?? "null");
      if (m?.name) setSelfName(m.name);
      if (m?.profilePhotoUrl) setSelfPhoto(m.profilePhotoUrl);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    function update() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMedicLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading });
          // Send location to backend every 10 sec so client tracking map updates
          const now = Date.now();
          if (now - lastLocationSentRef.current >= 10_000) {
            lastLocationSentRef.current = now;
            medicApi.location.update(true, pos.coords.latitude, pos.coords.longitude).catch(() => {});
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      );
    }
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!medicLoc || !order?.location) return;
    const now = Date.now();
    if (now - lastRouteFetchRef.current < 5_000) return;
    lastRouteFetchRef.current = now;
    try {
      const { lat: toLat, lng: toLng } = { lat: Number(order.location.latitude), lng: Number(order.location.longitude) };
      const osrmBase = (process.env.NEXT_PUBLIC_OSRM_URL ?? 'https://router.project-osrm.org/route/v1/driving').replace(/\/$/, '');
      const heading = medicLoc.heading;
      const bearingsParam = heading != null && !isNaN(heading)
        ? `&bearings=${Math.round(heading)},45;`
        : "";
      const url = `${osrmBase}/${medicLoc.lng},${medicLoc.lat};${toLng},${toLat}?overview=full&geometries=geojson&radiuses=25;${bearingsParam}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { routes?: Array<{ geometry?: { coordinates?: [number, number][] }; duration?: number; distance?: number }> };
      const route = data?.routes?.[0];
      const coords = route?.geometry?.coordinates ?? [];
      if (coords.length) setRouteCoords(coords.map(([lng, lat]) => ({ lat, lng })));
      if (route?.duration != null && route?.distance != null) {
        setEta({
          minutes: Math.ceil(route.duration / 60),
          distanceKm: Math.round(route.distance / 100) / 10,
        });
      }
    } catch { /* fallback */ }
  }, [medicLoc, order?.location]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  useEffect(() => {
    loadOrder();
    const token = localStorage.getItem("medic_token");
    if (token) {
      const socket = io(WS_URL, {
        auth: { token }, transports: ["websocket"], reconnection: true, reconnectionAttempts: 5,
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
          loadOrder();
        }
      });
      socket.on("order_message", (payload: { orderId: string; message: ChatMessage }) => {
        if (payload.orderId !== id) return;
        setMessages((prev) => prev.find((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]);
      });
      try {
        const m = JSON.parse(localStorage.getItem("medic") ?? "{}");
        if (m?.id) myMedicId.current = m.id;
      } catch {}
    }
    return () => { socketRef.current?.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!chatOpen) return;
    medicApi.chat.getMessages(id).then(setMessages).catch(() => {});
  }, [chatOpen, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMsg = useCallback(async () => {
    if (!chatInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await medicApi.chat.sendMessage(id, chatInput.trim());
      setChatInput("");
    } catch {}
    finally { setSendingMsg(false); }
  }, [chatInput, id, sendingMsg]);

  async function loadOrder() {
    setLoading(true);
    try {
      const found = await medicApi.orders.get(id);
      setOrder(found);
    } catch {
      // order not found or no access
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!order?.clientId) return;
    medicApi.medicalCard.getByClient(order.clientId)
      .then(card => setMedicalCard(card))
      .catch(() => setMedicalCard(null));
  }, [order?.clientId]);

  useEffect(() => {
    if (order?.status !== "DONE") return;
    medicApi.reviews.getByOrder(order.id)
      .then((reviews: Review[]) => {
        const alreadyReviewed = reviews.some(r => r.authorRole === "medic");
        if (alreadyReviewed) {
          setShowRating(false);
          setRatingDone(true);
        } else {
          setShowRating(true);
        }
      })
      .catch(() => {
        setShowRating(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.id]);

  async function handleNextStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    setError("");
    try {
      const updated = await medicApi.orders.updateStatus(id, next.status);
      setOrder(updated);
      if (next.status === "DONE") {
        setTimeout(() => router.push("/"), 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setUpdating(false);
    }
  }

  async function handleRatingSubmit() {
    if (ratingStars === 0) return;
    setRatingSubmitting(true);
    try {
      await medicApi.reviews.create(id, ratingStars, ratingComment.trim() || undefined, "client");
    } catch { /* ignore */ }
    setShowRating(false);
    setRatingDone(true);
    setRatingSubmitting(false);
  }

  function handleRatingSkip() {
    setShowRating(false);
    setRatingDone(true);
  }

  async function handleSetFinalPrice() {
    const val = parseInt(finalPriceInput.replace(/\D/g, ""), 10);
    if (!val || val <= 0) { setFinalPriceError("Введите корректную сумму"); return; }
    if (order?.priceMin && val < order.priceMin) { setFinalPriceError(`Минимум ${formatPrice(order.priceMin)} UZS`); return; }
    if (order?.priceMax && val > order.priceMax) { setFinalPriceError(`Максимум ${formatPrice(order.priceMax)} UZS`); return; }
    setSettingFinalPrice(true);
    setFinalPriceError("");
    try {
      const updated = await medicApi.orders.setFinalPrice(id, val);
      setOrder(updated);
    } catch (err: unknown) {
      setFinalPriceError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSettingFinalPrice(false);
    }
  }

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
        <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{t("order.notFound")}</p>
        <button onClick={() => router.push("/")} style={primaryBtn}>{t("order.home")}</button>
      </div>
    </div>
  );

  const { text: statusText } = ORDER_STATUS_COLOR[order.status];
  const nextAction = NEXT_STATUS[order.status];
  const isDone = order.status === "DONE" || order.status === "CANCELED";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/")}
          style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}>
          <ChevronLeft size={16} />
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

        {/* Connection lost banner */}
        {!socketOk && (
          <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            {t("order.connectionLost")}
          </div>
        )}

        {/* ETA */}
        {eta && !isDone && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#0d9488", lineHeight: 1 }}>{eta.minutes} мин</p>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>ВРЕМЯ В ПУТИ</p>
            </div>
            <div style={{ width: 1, height: 36, background: "#f1f5f9" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{eta.distanceKm} км</p>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>РАССТОЯНИЕ</p>
            </div>
          </div>
        )}

        {/* Map */}
        {order.location && (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", height: 280 }}>
            <Map
              lat={order.location.latitude}
              lng={order.location.longitude}
              medicLat={medicLoc?.lat}
              medicLng={medicLoc?.lng}
              routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
              medicName={selfName || undefined}
              medicPhotoUrl={selfPhoto}
            />
          </div>
        )}

        {/* Navigation button */}
        {order.location && !isDone && (
          <div style={{ marginBottom: 12, position: "relative" }}>
            <button onClick={() => setShowNavChoice(v => !v)}
              style={{ width: "100%", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "14px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Navigation size={14} />
              {t("order.openNavigation")}
            </button>

            {showNavChoice && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 10 }}>
                {[
                  { key: "yandex", label: t("order.openYandex"), color: "#fc3f1d", icon: <Navigation size={18} /> },
                  { key: "google", label: t("order.openGoogle"), color: "#4285f4", icon: <MapPin size={16} /> },
                  { key: "2gis",   label: t("order.open2GIS"),   color: "#1db248", icon: <MapPin size={16} /> },
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
                  {t("order.cancelNav")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Client address */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>{t("order.clientAddress")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <MapPin size={14} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 15, color: "#0f172a", fontWeight: 500 }}>
                {order.location?.house}
                {order.location?.floor ? `, ${t("order.floor")} ${order.location.floor}` : ""}
                {order.location?.apartment ? `, ${t("order.apt")} ${order.location.apartment}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Phone size={13} color="#0d9488" />
              <a href={`tel:${order.location?.phone}`}
                style={{ fontSize: 15, color: "#0d9488", fontWeight: 600, textDecoration: "none" }}>
                {order.location?.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>{t("order.details")}</h2>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>{t("order.service")}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{order.serviceTitle}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>{t("order.price")}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{formatPrice(order.priceAmount)} UZS</span>
          </div>
          {order.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#22c55e" }}>{t("order.discount")}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>−{formatPrice(order.discountAmount)} UZS</span>
            </div>
          )}
          <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t("order.total")}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0d9488" }}>{formatPrice(order.priceAmount - order.discountAmount)} UZS</span>
          </div>
        </div>

        {/* Medical card */}
        {medicalCard && (medicalCard.bloodType || medicalCard.allergies || medicalCard.chronicDiseases || medicalCard.notes) && (
          <div style={{ ...cardStyle, borderLeft: "3px solid #0d9488" }}>
            <h2 style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={12} color="#0d9488" />
              {t("order.medicalCard.title")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {medicalCard.bloodType && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0, marginRight: 12 }}>{t("order.medicalCard.bloodType")}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{medicalCard.bloodType}</span>
                </div>
              )}
              {medicalCard.allergies && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0, marginRight: 12 }}>{t("order.medicalCard.allergies")}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#ef4444", textAlign: "right", maxWidth: "60%" }}>{medicalCard.allergies}</span>
                </div>
              )}
              {medicalCard.chronicDiseases && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0, marginRight: 12 }}>{t("order.medicalCard.chronicDiseases")}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", textAlign: "right", maxWidth: "60%" }}>{medicalCard.chronicDiseases}</span>
                </div>
              )}
              {medicalCard.notes && (
                <div>
                  <span style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 4 }}>{t("order.medicalCard.notes")}</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: "#334155", lineHeight: 1.5 }}>{medicalCard.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status flow */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>{t("order.navigate")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "DONE"] as OrderStatus[]).map((s, i) => {
              const statuses: OrderStatus[] = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "DONE"];
              const currentIdx = statuses.indexOf(order.status);
              const stepIdx = i;
              const done = stepIdx < currentIdx || order.status === "DONE";
              const active = stepIdx === currentIdx;
              const { text, bg } = ORDER_STATUS_COLOR[s];
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done || active ? bg : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? <CheckCircle size={14} color={text} /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? text : "#94a3b8" }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? text : done ? "#64748b" : "#94a3b8" }}>
                    {ORDER_STATUS_LABEL[s]}
                  </span>
                  {active && <span style={{ marginLeft: "auto", fontSize: 11, background: bg, color: text, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{t("order.currentStatus")}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#ef444412", borderRadius: 10, padding: "12px 14px", marginBottom: 12, color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Final price block — shown when range service and status is SERVICE_STARTED */}
        {order.status === "SERVICE_STARTED" && order.priceMin != null && order.priceMax != null && (
          <div style={{ ...cardStyle, borderLeft: "3px solid #0d9488" }}>
            <h2 style={sectionTitle}>Итоговая цена</h2>
            {order.finalPrice ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#64748b" }}>Установлена</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#0d9488" }}>{formatPrice(order.finalPrice)} UZS</span>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                  Диапазон: {formatPrice(order.priceMin)} — {formatPrice(order.priceMax)} UZS
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    value={finalPriceInput}
                    onChange={(e) => { setFinalPriceInput(e.target.value); setFinalPriceError(""); }}
                    placeholder={`${order.priceMin} – ${order.priceMax}`}
                    min={order.priceMin}
                    max={order.priceMax}
                    style={{ flex: 1, height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0", padding: "0 12px", fontSize: 14, outline: "none" }}
                  />
                  <button
                    onClick={handleSetFinalPrice}
                    disabled={settingFinalPrice || !finalPriceInput}
                    style={{ height: 44, padding: "0 16px", borderRadius: 10, border: "none", background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 700, cursor: settingFinalPrice || !finalPriceInput ? "not-allowed" : "pointer", opacity: settingFinalPrice || !finalPriceInput ? 0.6 : 1 }}
                  >
                    {settingFinalPrice ? "..." : "Сохранить"}
                  </button>
                </div>
                {finalPriceError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{finalPriceError}</p>}
              </>
            )}
          </div>
        )}

        {/* Next status button */}
        {nextAction && !isDone && (
          <button onClick={handleNextStatus} disabled={updating}
            style={{ width: "100%", background: nextAction.color, color: "#fff", fontSize: 17, fontWeight: 700, borderRadius: 12, padding: "16px 24px", border: "none", cursor: updating ? "not-allowed" : "pointer", opacity: updating ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "opacity 150ms ease" }}>
            {updating && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
            {updating ? t("order.updating") : nextAction.label}
          </button>
        )}

        {/* Client rating block */}
        {order.status === "DONE" && showRating && !ratingDone && (
          <div style={cardStyle}>
            <h2 style={sectionTitle}>{t("order.rateClient")}</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>{t("order.rateClientHint")}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  disabled={ratingSubmitting}
                  style={{ background: "none", border: "none", cursor: ratingSubmitting ? "not-allowed" : "pointer", padding: "4px", fontSize: 36, lineHeight: 1, color: star <= (ratingHover || ratingStars) ? "#f59e0b" : "#d1d5db", transition: "color 150ms ease" }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder={t("order.rateClientCommentPlaceholder")}
              disabled={ratingSubmitting}
              maxLength={1000}
              rows={3}
              style={{ width: "100%", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 12px", fontSize: 14, color: "#0f172a", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                onClick={handleRatingSubmit}
                disabled={ratingSubmitting || ratingStars === 0}
                style={{ width: "100%", background: ratingStars === 0 ? "#d1d5db" : "#0d9488", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "13px", border: "none", cursor: ratingSubmitting || ratingStars === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {ratingSubmitting && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
                {ratingStars === 0 ? t("order.rateClientSelectFirst") : t("order.rateClientSubmit")}
              </button>
              <button
                onClick={handleRatingSkip}
                disabled={ratingSubmitting}
                style={{ width: "100%", background: "none", color: "#64748b", fontSize: 14, fontWeight: 600, borderRadius: 12, padding: "10px", border: "none", cursor: ratingSubmitting ? "not-allowed" : "pointer" }}
              >
                {t("order.rateClientSkip")}
              </button>
            </div>
          </div>
        )}

        {/* Thanks message after rating */}
        {order.status === "DONE" && ratingDone && (
          <div style={{ background: "#0d948812", borderRadius: 12, padding: "12px 16px", marginBottom: 12, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#0d9488" }}>
            {t("order.rateClientThanks")}
          </div>
        )}

        {/* Chat button */}
        {order.status !== "CANCELED" && order.clientId && (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              width: "100%", background: "#f0fdf9", color: "#0d9488",
              border: "1.5px solid #99f6e4", borderRadius: 14, padding: "14px 16px",
              fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <MessageCircle size={15} />
            Чат с клиентом
          </button>
        )}

        {order.status === "DONE" && (
          <div style={{ background: "#22c55e20", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <CheckCircle size={36} color="#22c55e" style={{ margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{t("order.orderDone")}</p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>{t("order.orderDoneText")}</p>
            <button onClick={() => router.push("/")} style={primaryBtn}>{t("order.home")}</button>
          </div>
        )}

        {order.status === "CANCELED" && (
          <div style={{ background: "#ef444412", borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", marginBottom: order.cancelReason ? 8 : 16 }}>
              {ORDER_STATUS_LABEL["CANCELED"]}
            </p>
            {order.cancelReason && (
              <p style={{ fontSize: 14, color: "#ef4444", opacity: 0.8, marginBottom: 16 }}>{order.cancelReason}</p>
            )}
            <button onClick={() => router.push("/")} style={primaryBtn}>{t("order.home")}</button>
          </div>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} onClick={() => setChatOpen(false)} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", height: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageCircle size={16} color="#0d9488" />
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Чат с клиентом</span>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginTop: 40 }}>Сообщений пока нет</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.userId === myMedicId.current || msg.role === "doctor";
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMe ? "#0d9488" : "#f1f5f9",
                      color: isMe ? "#fff" : "#0f172a",
                    }}>
                      <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                      <p style={{ fontSize: 10, opacity: 0.7, margin: "4px 0 0", textAlign: isMe ? "right" : "left" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
                placeholder={order?.status === "DONE" || order?.status === "CANCELED" ? "Заказ завершён" : "Написать сообщение..."}
                disabled={order?.status === "DONE" || order?.status === "CANCELED"}
                rows={1} maxLength={2000}
                style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={handleSendMsg}
                disabled={sendingMsg || !chatInput.trim() || order?.status === "DONE" || order?.status === "CANCELED"}
                style={{
                  width: 44, height: 44, borderRadius: "50%", background: "#0d9488", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: sendingMsg || !chatInput.trim() ? 0.5 : 1, flexShrink: 0,
                }}
              >
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 };
const primaryBtn: React.CSSProperties = { background: "#0d9488", color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: "13px 28px", border: "none", cursor: "pointer" };
