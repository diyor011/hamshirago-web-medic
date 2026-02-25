"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegramBackButton } from "@/hooks/useTelegram";
import { getTelegramWebApp, isInTelegram } from "@/lib/telegram";
import dynamic from "next/dynamic";
import {
  FaChevronLeft,
  FaMapMarker,
  FaExclamationTriangle,
  FaCrosshairs,
  FaStar,
  FaUser,
  FaExclamationCircle,
} from "react-icons/fa";
import { api, Medic } from "@/lib/api";

// Карта грузится только на клиенте
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const SERVICES: Record<string, string> = {
  injection: "Укол",
  iv_drip: "Капельница",
  blood_pressure: "Давление",
  long_term_care: "Долговременный уход",
};

// Reverse geocoding через OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    const { road, house_number, suburb, city } = data.address ?? {};
    const parts = [road, house_number, suburb, city].filter(Boolean);
    return parts.slice(0, 3).join(", ");
  } catch {
    return "";
  }
}

function LocationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service") ?? "";
  useTelegramBackButton(() => router.back());

  const [address, setAddress] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Default coords (Tashkent) — map shows immediately, GPS updates async
  const [lat, setLat] = useState<number>(41.2995);
  const [lng, setLng] = useState<number>(69.2401);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const resolvedRef = useRef(false);

  const [medics, setMedics] = useState<Medic[]>([]);
  const [selectedMedicId, setSelectedMedicId] = useState<string | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [medicsLoading, setMedicsLoading] = useState(false);

  const [error, setError] = useState("");

  const applyCoords = useCallback(async (latitude: number, longitude: number, accuracy?: number) => {
    resolvedRef.current = true;
    setLat(latitude);
    setLng(longitude);
    if (accuracy !== undefined) setGpsAccuracy(Math.round(accuracy));
    setGpsLoading(false);
    const detected = await reverseGeocode(latitude, longitude);
    if (detected) setAddress(detected);
  }, []);

  const getLocation = useCallback(() => {
    resolvedRef.current = false;
    setGpsLoading(true);
    setError("");

    // Hard timeout — если за 10 сек ничего не пришло, используем Ташкент
    const hardTimeout = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setGpsLoading(false);
        setError("Не удалось определить геолокацию. Уточните адрес или подвиньте маркер.");
      }
    }, 10000);

    // 1. Пробуем Telegram LocationManager (нативный TMA API)
    const twa = getTelegramWebApp();
    if (isInTelegram() && twa?.LocationManager) {
      twa.LocationManager.init(() => {
        if (!twa.LocationManager.isLocationAvailable) {
          tryBrowserGeolocation(hardTimeout);
          return;
        }
        twa.LocationManager.getLocation((loc) => {
          clearTimeout(hardTimeout);
          if (loc) {
            applyCoords(loc.latitude, loc.longitude);
          } else {
            tryBrowserGeolocation();
          }
        });
      });
      return;
    }

    // 2. Обычный браузерный геолокация
    tryBrowserGeolocation(hardTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCoords]);

  const tryBrowserGeolocation = useCallback((outerTimeout?: ReturnType<typeof setTimeout>) => {
    if (!navigator.geolocation) {
      if (outerTimeout) clearTimeout(outerTimeout);
      setError("Геолокация не поддерживается. Введите адрес вручную.");
      resolvedRef.current = true;
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (outerTimeout) clearTimeout(outerTimeout);
        applyCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      () => {
        if (outerTimeout) clearTimeout(outerTimeout);
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          setError("Не удалось определить геолокацию. Введите адрес или подвиньте маркер.");
          setGpsLoading(false);
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, [applyCoords]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Когда пользователь двигает маркер — обновляем адрес
  async function handleMapMove(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    const detected = await reverseGeocode(newLat, newLng);
    if (detected) setAddress(detected);
  }

  // Грузим медсестёр при появлении координат
  useEffect(() => {
    if (lat === null || lng === null) return;
    setMedicsLoading(true);
    api.medics
      .nearby(lat, lng)
      .then(setMedics)
      .catch(() => setMedics([]))
      .finally(() => setMedicsLoading(false));
  }, [lat, lng]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) { setError("Введите адрес"); return; }
    if (!phone.trim())   { setError("Введите номер телефона"); return; }

    const params = new URLSearchParams({
      service: serviceId,
      address,
      floor,
      apartment,
      phone,
      lat: String(lat ?? 41.2995),
      lng: String(lng ?? 69.2401),
      ...(selectedMedicId && !autoAssign ? { medicId: selectedMedicId } : {}),
    });
    router.push(`/order/confirm?${params.toString()}`);
  }

  function fieldStyle(name: string): React.CSSProperties {
    const focused = focusedField === name;
    return {
      background: focused ? "#fff" : "#f8fafc",
      border: `1.5px solid ${focused ? "#0d9488" : "#e2e8f0"}`,
      borderRadius: 12,
      padding: "13px 14px",
      fontSize: 15,
      color: "#0f172a",
      width: "100%",
      outline: "none",
      transition: "all 150ms ease",
      boxShadow: focused ? "0 0 0 3px #0d948820" : "none",
    };
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{
        maxWidth: 860, margin: "0 auto",
        padding: "16px 24px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none", borderRadius: "50%",
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff", flexShrink: 0,
          }}
        >
          <FaChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Адрес вызова</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
            {SERVICES[serviceId] ?? "Услуга"}
          </p>
        </div>
      </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 24px 100px" }}>

        {/* GPS статус */}
        {gpsLoading && (
          <div style={{ ...bannerStyle, background: "#0d948814", color: "#0d9488" }}>
            <FaCrosshairs size={14} />
            Определяем местоположение...
          </div>
        )}
        {!gpsLoading && gpsAccuracy !== null && gpsAccuracy > 25 && (
          <div style={{ ...bannerStyle, background: "#ef444412", color: "#ef4444" }}>
            <FaExclamationTriangle size={14} />
            Слабый GPS (±{gpsAccuracy} м) — уточните адрес или подвиньте маркер
          </div>
        )}
        {!gpsLoading && gpsAccuracy !== null && gpsAccuracy <= 25 && (
          <div style={{ ...bannerStyle, background: "#22c55e20", color: "#16a34a" }}>
            <FaCrosshairs size={14} />
            Местоположение определено (±{gpsAccuracy} м)
          </div>
        )}

        {/* ─── Карта ─── */}
        <div style={{
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          height: 240,
          position: "relative",
          background: "#e2e8f0",
        }}>
            <Map lat={lat} lng={lng} onMove={handleMapMove} />
        </div>

        <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 16, marginTop: -8 }}>
          Нажмите на карту или перетащите маркер чтобы уточнить место
        </p>

        <form onSubmit={handleSubmit}>
          {/* ─── Адрес ─── */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Адрес</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Улица, дом *</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => setFocusedField("address")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Определяется автоматически..."
                  required
                  style={fieldStyle("address")}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Этаж</label>
                  <input
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    onFocus={() => setFocusedField("floor")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="3"
                    style={fieldStyle("floor")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Квартира</label>
                  <input
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    onFocus={() => setFocusedField("apartment")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="12"
                    style={fieldStyle("apartment")}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Телефон *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+998 90 123 45 67"
                  required
                  style={fieldStyle("phone")}
                />
              </div>
            </div>
          </div>

          {/* ─── Выбор медсестры ─── */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Медсестра</h2>

            <div style={{ background: "#f1f5f9", borderRadius: 10, padding: 4, display: "flex", marginBottom: 14 }}>
              {[true, false].map((isAuto) => (
                <button
                  key={String(isAuto)}
                  type="button"
                  onClick={() => setAutoAssign(isAuto)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8,
                    border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600,
                    transition: "all 150ms ease",
                    background: autoAssign === isAuto ? "#fff" : "transparent",
                    color: autoAssign === isAuto ? "#0d9488" : "#94a3b8",
                    boxShadow: autoAssign === isAuto ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {isAuto ? "Автоназначение" : "Выбрать вручную"}
                </button>
              ))}
            </div>

            {!autoAssign && (
              <>
                {medicsLoading && (
                  <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", padding: "12px 0" }}>
                    Ищем ближайших медсестёр...
                  </p>
                )}
                {!medicsLoading && medics.length === 0 && (
                  <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", padding: "12px 0" }}>
                    Нет доступных медсестёр поблизости
                  </p>
                )}
                {medics.map((medic) => (
                  <button
                    key={medic.id}
                    type="button"
                    onClick={() => setSelectedMedicId(medic.id)}
                    style={{
                      width: "100%",
                      background: selectedMedicId === medic.id ? "#0d948814" : "#f8fafc",
                      border: `1.5px solid ${selectedMedicId === medic.id ? "#0d9488" : "transparent"}`,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      gap: 12, textAlign: "left", transition: "all 150ms ease",
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "#0d948818",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <FaUser size={20} color="#0d9488" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{medic.name}</p>
                      <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                          <FaStar size={11} color="#eab308" /> {medic.rating != null ? medic.rating.toFixed(1) : "—"}
                        </span>
                        <span style={{ fontSize: 13, color: "#64748b" }}>Опыт {medic.experienceYears} лет</span>
                        <span style={{ fontSize: 13, color: "#64748b" }}>
                          {(medic.distanceKm ?? 0) < 1
                            ? `${Math.round((medic.distanceKm ?? 0) * 1000)} м`
                            : `${(medic.distanceKm ?? 0).toFixed(1)} км`}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div style={{
              background: "#ef444412", borderRadius: 10,
              padding: "12px 14px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 10,
              color: "#ef4444", fontSize: 13, fontWeight: 500,
            }}>
              <FaExclamationCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button type="submit" style={{
            width: "100%",
            background: "#0d9488", color: "#fff",
            fontSize: 17, fontWeight: 700,
            borderRadius: 12, padding: "16px 24px",
            border: "none", cursor: "pointer",
          }}>
            Подтвердить адрес
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc" }} />}>
      <LocationForm />
    </Suspense>
  );
}

// ─── Styles ───
const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#475569",
  marginBottom: 6, display: "block",
};

const bannerStyle: React.CSSProperties = {
  borderRadius: 10, padding: "10px 14px",
  display: "flex", alignItems: "center", gap: 8,
  fontSize: 13, fontWeight: 600, marginBottom: 12,
};
