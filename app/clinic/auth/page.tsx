"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Lock, Eye, EyeOff, AlertCircle, Building2 } from "lucide-react";
import { clinicApi, getClinicRole } from "@/lib/clinicApi";

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Handle duplicate country code (e.g. paste into prefilled +998 field)
  if (digits.startsWith("998998")) digits = digits.slice(3);
  digits = digits.slice(0, 12);
  if (!digits) return "";
  const d = digits.startsWith("998") ? digits.slice(3) : digits;
  let result = "+998";
  if (d.length > 0) result += " " + d.slice(0, 2);
  if (d.length > 2) result += " " + d.slice(2, 5);
  if (d.length > 5) result += " " + d.slice(5, 7);
  if (d.length > 7) result += " " + d.slice(7, 9);
  return result;
}

export default function ClinicAuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const phoneDigits = phone.replace(/\D/g, "");
  const canSubmit = phoneDigits.length >= 11 && password.length >= 6;

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%", height: 48, borderRadius: 10,
    border: `1.5px solid ${focused === name ? "#0d9488" : "#e2e8f0"}`,
    padding: "0 14px 0 44px", fontSize: 14, color: "#0f172a", outline: "none",
    background: focused === name ? "#fff" : "#f8fafc", boxSizing: "border-box",
    boxShadow: focused === name ? "0 0 0 3px rgba(13,148,136,0.12)" : "none",
    transition: "all 0.15s",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const rawPhone = "+" + phoneDigits;
      const res = await clinicApi.auth.login(rawPhone, password);
      localStorage.setItem("clinic_token", res.token ?? res.access_token ?? "");
      localStorage.setItem("clinic_user", JSON.stringify(res.user));
      const jwtRole = getClinicRole();
      if (jwtRole === "DOCTOR") {
        router.replace("/doctor/consultations");
      } else if (jwtRole === "RECEPTION") {
        router.replace("/clinic/reception");
      } else {
        router.replace("/clinic/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Неверный телефон или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex" }}>
      {/* Left panel */}
      <div className="clinic-auth-left" style={{
        width: 420,
        background: "linear-gradient(145deg, #0d9488 0%, #0f766e 60%, #065f46 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 48, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Building2 size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 10 }}>HamshiraGo</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, maxWidth: 280 }}>
            Портал управления клиникой
          </p>
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Управление расписанием и кабинетами",
              "Запись пациентов в один клик",
              "Аналитика и статистика клиники",
            ].map((text) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#fff", fontSize: 11 }}>✓</span>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="clinic-mobile-logo" style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #0d9488, #0f766e)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>HamshiraGo Clinic</span>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Добро пожаловать</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>Войдите в портал клиники</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Номер телефона
              </label>
              <div style={{ position: "relative" }}>
                <Phone size={16} color={focused === "phone" ? "#0d9488" : "#94a3b8"}
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, "")))}
                  onFocus={() => { setFocused("phone"); if (!phone) setPhone("+998 "); }}
                  onBlur={() => { setFocused(null); if (phone === "+998 ") setPhone(""); }}
                  placeholder="+998 90 123 45 67"
                  required
                  style={inputStyle("phone")}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color={focused === "pass" ? "#0d9488" : "#94a3b8"}
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ ...inputStyle("pass"), paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: "#fef2f2", borderRadius: 10, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: 13,
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              style={{
                background: "linear-gradient(135deg, #0d9488, #0f766e)",
                color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 10,
                padding: "13px 24px", border: "none",
                cursor: (loading || !canSubmit) ? "not-allowed" : "pointer",
                opacity: (loading || !canSubmit) ? 0.7 : 1,
                marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {loading ? "Вход..." : "Войти в портал"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .clinic-auth-left { display: flex; }
        .clinic-mobile-logo { display: none !important; }
        @media (max-width: 768px) {
          .clinic-auth-left { display: none !important; }
          .clinic-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
