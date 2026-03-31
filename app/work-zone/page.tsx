"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import { medicApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

const DEFAULT_RADIUS = 5;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 50;
const RADIUS_STEP = 0.5;

export default function WorkZonePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [hasZone, setHasZone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }

    medicApi.auth.me()
      .then((medic) => {
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

  async function handleSave() {
    setError("");
    setSuccess("");
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError(t("workZone.errorCoords"));
      return;
    }
    if (latNum < -90 || latNum > 90) {
      setError(t("workZone.errorLatRange"));
      return;
    }
    if (lngNum < -180 || lngNum > 180) {
      setError(t("workZone.errorLngRange"));
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#64748b" }}>{t("common.loading")}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <button
              onClick={() => router.push("/profile")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <FaArrowLeft size={15} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{t("workZone.title")}</p>
            <div style={{ width: 36 }} />
          </div>

          {/* Zone status badge */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: hasZone ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.15)",
              borderRadius: 20, padding: "6px 16px",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasZone ? "#22c55e" : "rgba(255,255,255,0.5)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {hasZone ? t("workZone.zoneActive") : t("workZone.noZone")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "-20px auto 0", padding: "0 24px 80px" }}>
        {/* Info card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <FaMapMarkerAlt size={16} color="#0d9488" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{t("workZone.infoTitle")}</p>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{t("workZone.infoDesc")}</p>
            </div>
          </div>
        </div>

        {/* Coordinates card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>{t("workZone.centerCoords")}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                {t("workZone.latitude")}
              </label>
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder={t("workZone.latPlaceholder")}
                step="any"
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1.5px solid #e2e8f0", borderRadius: 10,
                  fontSize: 15, color: "#0f172a", background: "#f8fafc",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0d9488"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                {t("workZone.longitude")}
              </label>
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder={t("workZone.lngPlaceholder")}
                step="any"
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1.5px solid #e2e8f0", borderRadius: 10,
                  fontSize: 15, color: "#0f172a", background: "#f8fafc",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0d9488"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
              />
            </div>
          </div>
        </div>

        {/* Radius card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>{t("workZone.radiusSection")}</p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {t("workZone.radius")}
            </span>
            <span style={{
              fontSize: 18, fontWeight: 800, color: "#0d9488",
              background: "#f0fdf9", borderRadius: 8, padding: "4px 12px",
            }}>
              {radius % 1 === 0 ? radius : radius.toFixed(1)} {t("workZone.km")}
            </span>
          </div>

          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={RADIUS_STEP}
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#0d9488", cursor: "pointer", height: 6 }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{MIN_RADIUS} {t("workZone.km")}</span>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{MAX_RADIUS} {t("workZone.km")}</span>
          </div>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{success}</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || clearing}
          style={{
            width: "100%", background: saving || clearing ? "#94a3b8" : "#0d9488",
            color: "#fff", border: "none", borderRadius: 14,
            padding: "16px", fontSize: 16, fontWeight: 700,
            cursor: saving || clearing ? "not-allowed" : "pointer",
            marginBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}
        >
          {saving ? (
            <>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
              {t("workZone.saving")}
            </>
          ) : t("workZone.saveZone")}
        </button>

        {/* Clear button — only if zone exists */}
        {hasZone && (
          <button
            onClick={handleClear}
            disabled={saving || clearing}
            style={{
              width: "100%", background: "transparent",
              color: "#64748b", border: "1.5px solid #e2e8f0",
              borderRadius: 14, padding: "14px",
              fontSize: 15, fontWeight: 700,
              cursor: saving || clearing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: saving || clearing ? 0.6 : 1,
            }}
          >
            {clearing ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #cbd5e1", borderTopColor: "#64748b", animation: "spin 0.8s linear infinite" }} />
                {t("workZone.clearing")}
              </>
            ) : t("workZone.clearZone")}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 14,
};
