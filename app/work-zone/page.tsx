"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CheckCircle, AlertCircle, Save, Trash2 } from "lucide-react";
import { medicApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";

const DEFAULT_RADIUS = 5;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10;
const RADIUS_STEP = 0.5;
const TASHKENT = { lat: 41.2995, lng: 69.2401 };

export default function WorkZonePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [gpsCenter, setGpsCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [medicPhoto, setMedicPhoto] = useState<string | null>(null);
  const [medicName, setMedicName] = useState<string>("");
  const [hasZone, setHasZone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [mapReadyTick, setMapReadyTick] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }

    // Request GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGpsCenter(TASHKENT),
        { timeout: 8000 }
      );
    } else {
      setGpsCenter(TASHKENT);
    }

    medicApi.auth.me()
      .then((medic) => {
        setMedicPhoto(medic.profilePhotoUrl ?? medic.facePhotoUrl ?? null);
        setMedicName(medic.name ?? "");
        if (
          medic.workZoneLat != null &&
          medic.workZoneLng != null &&
          medic.workZoneRadius != null
        ) {
          setLat(String(medic.workZoneLat));
          setLng(String(medic.workZoneLng));
          setRadius(medic.workZoneRadius);
          setHasZone(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Leaflet CSS
  useEffect(() => {
    const id = "leaflet-css";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Init map — only map + tiles, marker/circle created by update effects
  useEffect(() => {
    if (loading) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    let mounted = true;
    import("leaflet").then((L) => {
      if (!mounted || !mapContainerRef.current || mapInstanceRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const savedLat = parseFloat(lat);
      const savedLng = parseFloat(lng);
      const initLat = !isNaN(savedLat) ? savedLat : (gpsCenter?.lat ?? TASHKENT.lat);
      const initLng = !isNaN(savedLng) ? savedLng : (gpsCenter?.lng ?? TASHKENT.lng);
      const map = L.map(mapContainerRef.current!, { center: [initLat, initLng], zoom: 13 });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap © CARTO",
      }).addTo(map);
      map.on("click", (e: any) => {
        setLat(String(e.latlng.lat.toFixed(6)));
        setLng(String(e.latlng.lng.toFixed(6)));
      });
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      // Signal that map is ready — triggers marker/circle effects with current state
      setMapReadyTick((t) => t + 1);
    });
    return () => {
      mounted = false;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markerRef.current = null;
      circleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gpsCenter]);

  // Update marker position + circle radius — runs on map ready AND on lat/lng/radius change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const center = mapInstanceRef.current.getCenter();
    const useLat = isNaN(latNum) ? center.lat : latNum;
    const useLng = isNaN(lngNum) ? center.lng : lngNum;
    import("leaflet").then((L) => {
      if (!mapInstanceRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([useLat, useLng]);
      } else {
        markerRef.current = L.marker([useLat, useLng]).addTo(mapInstanceRef.current);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([useLat, useLng]);
        circleRef.current.setRadius(radius * 1000);
      } else {
        circleRef.current = L.circle([useLat, useLng], { radius: radius * 1000, color: "#0d9488", fillOpacity: 0.15, weight: 2 }).addTo(mapInstanceRef.current);
      }
    });
  // mapReadyTick гарантирует что эффект запустится с актуальным radius после инициализации карты
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radius, mapReadyTick]);

  // Update marker icon when medicPhoto / medicName changes (also fires after map ready)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (!markerRef.current) return;
      const inner = medicPhoto
        ? `<img src="${medicPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
        : medicName
          ? `<span style="font-size:16px;font-weight:700;color:#0d9488;">${medicName.charAt(0).toUpperCase()}</span>`
          : `<span style="font-size:18px;">👤</span>`;
      const icon = L.divIcon({
        html: `<div style="width:40px;height:40px;background:#fff;border:3px solid #0d9488;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(13,148,136,0.4);overflow:hidden;">${inner}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: "",
      });
      markerRef.current.setIcon(icon);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicPhoto, medicName, mapReadyTick]);

  async function handleSave() {
    setError("");
    setSuccess("");
    // Use map center (= GPS or saved) if user hasn't clicked on map yet
    let latNum = parseFloat(lat);
    let lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        latNum = center.lat;
        lngNum = center.lng;
      } else if (gpsCenter) {
        latNum = gpsCenter.lat;
        lngNum = gpsCenter.lng;
      }
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError(t("workZone.errorCoords"));
      return;
    }
    setSaving(true);
    try {
      await medicApi.workZone.set(latNum, lngNum, radius);
      setHasZone(true);
      setSuccess(t("workZone.saved"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setError("");
    setSuccess("");
    setClearing(true);
    try {
      await medicApi.workZone.clear();
      setHasZone(false);
      setLat("");
      setLng("");
      setRadius(DEFAULT_RADIUS);
      setSuccess(t("workZone.cleared"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Настройки</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{t("workZone.title")}</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Установите зону работы — вы будете получать только заказы внутри неё</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }} className="workzone-grid">
        {/* Map */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: 420 }} />
          <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={14} color="#0d9488" />
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {lat ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}` : t("workZone.tapToSetCenter") || "Нажмите на карту чтобы установить центр"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Zone status */}
          <div style={{ background: hasZone ? "#f0fdf4" : "#f8fafc", border: `1px solid ${hasZone ? "#86efac" : "#e2e8f0"}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasZone ? "#22c55e" : "#94a3b8", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: hasZone ? "#16a34a" : "#64748b", fontWeight: 600 }}>
              {hasZone ? t("workZone.zoneActive") : (t("workZone.noZone") || "Зона не установлена")}
            </span>
          </div>

          {/* Radius */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t("workZone.radius") || "Радиус"}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#0d9488" }}>
                {radius % 1 === 0 ? radius : radius.toFixed(1)} {t("workZone.km")}
              </span>
            </div>
            <input type="range" min={MIN_RADIUS} max={MAX_RADIUS} step={RADIUS_STEP} value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#0d9488", cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{MIN_RADIUS} км</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{MAX_RADIUS} км</span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px" }}>
              <AlertCircle size={14} color="#dc2626" />
              <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px" }}>
              <CheckCircle size={14} color="#16a34a" />
              <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{success}</span>
            </div>
          )}

          {/* Save button */}
          <button onClick={handleSave} disabled={saving || clearing} style={{
            width: "100%", background: "linear-gradient(135deg, #0d9488, #0f766e)",
            color: "#fff", border: "none", borderRadius: 12, padding: "13px",
            fontSize: 14, fontWeight: 700, cursor: saving || clearing ? "not-allowed" : "pointer",
            opacity: saving || clearing ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {saving ? (
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
            ) : <Save size={15} />}
            {saving ? t("workZone.saving") : t("workZone.saveZone")}
          </button>

          {hasZone && (
            <button onClick={handleClear} disabled={saving || clearing} style={{
              width: "100%", background: "transparent", color: "#ef4444",
              border: "1.5px solid #fca5a5", borderRadius: 12, padding: "12px",
              fontSize: 14, fontWeight: 600, cursor: saving || clearing ? "not-allowed" : "pointer",
              opacity: saving || clearing ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {clearing ? (
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fca5a5", borderTopColor: "#ef4444", animation: "spin 0.8s linear infinite" }} />
              ) : <Trash2 size={14} />}
              {clearing ? t("workZone.clearing") : t("workZone.clearZone")}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .workzone-grid { grid-template-columns: 1fr 320px; }
        @media(max-width:900px){ .workzone-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </DashboardLayout>
  );
}
