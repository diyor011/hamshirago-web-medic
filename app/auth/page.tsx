"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, Lock, User, Eye, EyeOff, AlertCircle, Stethoscope, Star } from "lucide-react";
import { medicApi, doctorApi } from "@/lib/api";
import { clinicApi, getClinicRole } from "@/lib/clinicApi";
import { subscribeWebPush } from "@/lib/webPush";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

type Mode = "login" | "register";
type Role = "medic" | "doctor" | "clinic";

function formatPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  // Handle duplicate country code (e.g. paste into prefilled +998 field)
  if (digits.startsWith("998998")) digits = digits.slice(3);
  digits = digits.slice(0, 12);
  if (!digits) return "";
  const d = digits.startsWith("998") ? digits.slice(3) : digits;
  let result = "+998";
  if (d.length > 0) result += " " + d.slice(0, 2);   // XX (operator)
  if (d.length > 2) result += " " + d.slice(2, 5);    // XXX
  if (d.length > 5) result += " " + d.slice(5, 7);    // XX
  if (d.length > 7) result += " " + d.slice(7, 9);    // XX
  return result;
}

export default function AuthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [role, setRole] = useState<Role>("medic");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [experience, setExperience] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    // Check if already logged in — redirect to correct dashboard based on role
    const token = localStorage.getItem("medic_token");
    if (token) {
      const savedRole = localStorage.getItem("user_role");
      if (savedRole === "doctor") router.replace("/doctor/consultations");
      else if (savedRole === "clinic") router.replace("/clinic/dashboard");
      else router.replace("/");
      return;
    }
    // Mark onboarding as completed since user reached auth page directly
    localStorage.setItem("medic_onboarding_completed", "true");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const rawPhone = "+" + phone.replace(/\D/g, "");
    try {
      if (role === "clinic") {
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
      } else if (role === "doctor") {
        const res = mode === "login"
          ? await doctorApi.auth.login(rawPhone, password)
          : await doctorApi.auth.register({ name, phone: rawPhone, password, specialization: specialization || undefined, experienceYears: Number(experience) || 0 });
        localStorage.setItem("medic_token", res.access_token);
        localStorage.setItem("doctor", JSON.stringify(res.doctor));
        localStorage.setItem("user_role", "doctor");
        router.push("/doctor/consultations");
      } else {
        const res = mode === "login"
          ? await medicApi.auth.login(rawPhone, password)
          : await medicApi.auth.register({ name, phone: rawPhone, password, experienceYears: Number(experience) || 0 });
        localStorage.setItem("medic_token", res.access_token);
        localStorage.setItem("medic", JSON.stringify(res.medic));
        localStorage.setItem("user_role", "medic");
        subscribeWebPush();
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg === "TOO_MANY_REQUESTS" ? t("auth.tooManyAttempts") : msg || t("auth.errorGeneral"));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%", height: 48, borderRadius: 10, border: `1.5px solid ${focused === name ? "#0d9488" : "#e2e8f0"}`,
    padding: "0 14px 0 44px", fontSize: 14, color: "#0f172a", outline: "none",
    background: focused === name ? "#fff" : "#f8fafc", boxSizing: "border-box",
    boxShadow: focused === name ? "0 0 0 3px rgba(13,148,136,0.12)" : "none",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex" }}>
      {/* Left panel — desktop only */}
      <div className="auth-left" style={{
        width: 420, background: "linear-gradient(145deg, #0d9488 0%, #0f766e 60%, #065f46 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: 48, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <img src="/logo.png" alt="HamshiraGo" style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 10 }}>HamshiraGo</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, maxWidth: 280 }}>
            Платформа для профессиональных медицинских специалистов
          </p>
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
            {["Принимайте заказы в вашем районе", "Удобное расписание работы", "Быстрые выплаты"].map((text) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 11 }}>✓</span>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Language + logo mobile */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div className="mobile-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/logo.png" alt="HamshiraGo" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>HamshiraGo</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["ru", "uz"] as const).map((lang) => (
                <button key={lang} onClick={() => setLanguage(lang)} style={{
                  padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${language === lang ? "#0d9488" : "#e2e8f0"}`,
                  background: language === lang ? "#f0fdfa" : "transparent",
                  color: language === lang ? "#0d9488" : "#94a3b8",
                }}>
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Role toggle */}
          <div style={{ background: "#f1f5f9", borderRadius: 10, padding: 4, display: "flex", marginBottom: 20 }}>
            {([
              { key: "medic", label: "👩‍⚕️ Медик" },
              { key: "doctor", label: "🩺 Врач" },
              { key: "clinic", label: "🏥 Клиника" },
            ] as { key: Role; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => { setRole(key); setMode("login"); setError(""); }} style={{
                flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                background: role === key ? "#fff" : "transparent",
                color: role === key ? "#0d9488" : "#94a3b8",
                boxShadow: role === key ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              }}>
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
            {mode === "login" ? "Добро пожаловать" : "Регистрация"}
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            {role === "clinic"
              ? "Войдите в аккаунт CEO клиники"
              : mode === "login"
                ? role === "doctor" ? "Войдите в аккаунт врача" : "Войдите в свой аккаунт медика"
                : role === "doctor" ? "Создайте аккаунт врача" : "Создайте аккаунт для работы"}
          </p>

          {/* Mode toggle — скрыть для клиники (нет регистрации) */}
          {role !== "clinic" && (
            <div style={{ background: "#f1f5f9", borderRadius: 10, padding: 4, display: "flex", marginBottom: 24 }}>
              {(["login", "register"] as Mode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                  flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#0d9488" : "#94a3b8",
                  boxShadow: mode === m ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
                }}>
                  {m === "login" ? t("auth.login") : t("auth.register")}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && role !== "clinic" && (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t("auth.name")}</label>
                  <div style={{ position: "relative" }}>
                    <User size={16} color={focused === "name" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                      placeholder={t("auth.namePlaceholder")} required style={inputStyle("name")} />
                  </div>
                </div>
                {role === "doctor" && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Специализация</label>
                    <div style={{ position: "relative" }}>
                      <Stethoscope size={16} color={focused === "spec" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                      <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                        onFocus={() => setFocused("spec")} onBlur={() => setFocused(null)}
                        placeholder="Терапевт, педиатр..." style={inputStyle("spec")} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t("auth.experienceLabel")}</label>
                  <div style={{ position: "relative" }}>
                    <Star size={16} color={focused === "exp" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="number" min="0" max="50" value={experience} onChange={(e) => setExperience(e.target.value)}
                      onFocus={() => setFocused("exp")} onBlur={() => setFocused(null)}
                      placeholder="0" style={inputStyle("exp")} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t("auth.phone")}</label>
              <div style={{ position: "relative" }}>
                <Phone size={16} color={focused === "phone" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input type="tel" value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, "")))}
                  onFocus={() => { setFocused("phone"); if (!phone) setPhone("+998 "); }}
                  onBlur={() => { setFocused(null); if (phone === "+998 ") setPhone(""); }}
                  placeholder={t("auth.phonePlaceholder")} required style={inputStyle("phone")} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t("auth.password")}</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color={focused === "pass" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                  placeholder="••••••••" required minLength={6}
                  style={{ ...inputStyle("pass"), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex",
                }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: 13 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
              fontSize: 15, fontWeight: 700, borderRadius: 10, padding: "13px 24px",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1, marginTop: 4,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {loading ? t("auth.wait") : mode === "login" ? t("auth.login") : t("auth.register")}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-left { display: flex; }
        .mobile-logo { display: none; }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
