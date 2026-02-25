"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaMedkit, FaPhone, FaLock, FaUser, FaEye, FaEyeSlash, FaExclamationCircle } from "react-icons/fa";
import { medicApi } from "@/lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [experience, setExperience] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const rawPhone = phone.replace(/\D/g, "");
    try {
      const res = mode === "login"
        ? await medicApi.auth.login(rawPhone, password)
        : await medicApi.auth.register({ name, phone: rawPhone, password, experienceYears: Number(experience) || 0 });
      localStorage.setItem("medic_token", res.access_token);
      localStorage.setItem("medic", JSON.stringify(res.medic));
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  function fieldStyle(name: string): React.CSSProperties {
    const f = focused === name;
    return {
      background: f ? "#fff" : "#f8fafc",
      border: `1.5px solid ${f ? "#0d9488" : "#e2e8f0"}`,
      borderRadius: 12, padding: "0 14px 0 46px",
      fontSize: 15, color: "#0f172a", width: "100%", height: 52,
      outline: "none", transition: "all 150ms ease",
      boxShadow: f ? "0 0 0 3px #0d948820" : "none",
    };
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Шапка */}
      <div style={{
        background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        padding: "52px 24px 72px", textAlign: "center",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <FaMedkit size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>HamshiraGo</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Панель медика</p>
      </div>

      <div style={{ padding: "0 16px 32px", marginTop: -28, flex: 1 }}>
        <div style={{
          background: "#fff", borderRadius: 24, padding: "24px 20px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          {/* Toggle */}
          <div style={{ background: "#f1f5f9", borderRadius: 12, padding: 4, display: "flex", marginBottom: 28 }}>
            {(["login", "register"] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "11px", borderRadius: 9, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, transition: "all 200ms ease",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#0d9488" : "#94a3b8",
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <>
                <div>
                  <label style={labelStyle}>Имя</label>
                  <div style={{ position: "relative" }}>
                    <FaUser size={15} color={focused === "name" ? "#0d9488" : "#94a3b8"}
                      style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                      placeholder="Ваше имя" required style={fieldStyle("name")} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Опыт работы (лет)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: focused === "exp" ? "#0d9488" : "#94a3b8", fontSize: 15, fontWeight: 700 }}>★</span>
                    <input type="number" min="0" max="50" value={experience} onChange={(e) => setExperience(e.target.value)}
                      onFocus={() => setFocused("exp")} onBlur={() => setFocused(null)}
                      placeholder="0" style={fieldStyle("exp")} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Телефон</label>
              <div style={{ position: "relative" }}>
                <FaPhone size={14} color={focused === "phone" ? "#0d9488" : "#94a3b8"}
                  style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }} />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
                  placeholder="+998 90 123 45 67" required style={fieldStyle("phone")} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Пароль</label>
              <div style={{ position: "relative" }}>
                <FaLock size={14} color={focused === "pass" ? "#0d9488" : "#94a3b8"}
                  style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                  placeholder="••••••••" required minLength={6}
                  style={{ ...fieldStyle("pass"), paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  {showPassword ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "#ef444412", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: 13 }}>
                <FaExclamationCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: "#0d9488", color: "#fff", fontSize: 16, fontWeight: 700,
              borderRadius: 12, padding: "15px 24px", border: "none",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
              marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              {loading && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
              {loading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748b" }}>
            {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: "#0d9488", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 7, display: "block" };
