"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Phone, Lock, Eye, EyeOff, AlertCircle,
  User, MapPin, FileText, Calendar, ChevronRight, ChevronLeft, CheckCircle2,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://hamshira-backend-production.up.railway.app";

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
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

function rawPhone(formatted: string) {
  const digits = formatted.replace(/\D/g, "");
  return "+" + digits;
}

const STEPS = ["Клиника", "Лицензия", "CEO аккаунт"];

export default function ClinicRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1 — Clinic info
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // Step 2 — License
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");

  // Step 3 — CEO
  const [ceoName, setCeoName] = useState("");
  const [ceoPhone, setCeoPhone] = useState("");
  const [ceoPassword, setCeoPassword] = useState("");

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%", height: 48, borderRadius: 10,
    border: `1.5px solid ${focused === name ? "#0d9488" : "#e2e8f0"}`,
    padding: "0 14px 0 44px", fontSize: 14, color: "#0f172a", outline: "none",
    background: focused === name ? "#fff" : "#f8fafc", boxSizing: "border-box",
    boxShadow: focused === name ? "0 0 0 3px rgba(13,148,136,0.12)" : "none",
    transition: "all 0.15s",
  });

  const inputStyleNoIcon = (name: string): React.CSSProperties => ({
    ...inputStyle(name), paddingLeft: 14,
  });

  const canNext0 = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 11;
  const canNext1 = true; // license is optional
  const canSubmit = ceoName.trim().length >= 2 && ceoPhone.replace(/\D/g, "").length >= 11 && ceoPassword.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        phone: rawPhone(phone),
        ceoName: ceoName.trim(),
        ceoPhone: rawPhone(ceoPhone),
        ceoPassword,
      };
      if (legalName.trim()) body.legalName = legalName.trim();
      if (address.trim()) body.address = address.trim();
      if (city.trim()) body.city = city.trim();
      if (licenseNumber.trim()) body.licenseNumber = licenseNumber.trim();
      if (licenseExpiry) body.licenseExpiry = licenseExpiry;

      const res = await fetch(`${BASE_URL}/clinic/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Ошибка регистрации");
      }
      setSuccess(true);
      setTimeout(() => router.push("/clinic/auth"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #0d9488, #0f766e)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
          }}>
            <CheckCircle2 size={40} color="#fff" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>Клиника зарегистрирована!</h2>
          <p style={{ fontSize: 15, color: "#64748b" }}>Перенаправляем на страницу входа...</p>
        </div>
      </div>
    );
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
            Регистрация новой клиники
          </p>

          {/* Steps indicator */}
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: i < step ? "rgba(255,255,255,0.9)" : i === step ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: i === step ? "2px solid rgba(255,255,255,0.8)" : "2px solid transparent",
                }}>
                  {i < step
                    ? <span style={{ color: "#0d9488", fontSize: 13, fontWeight: 800 }}>✓</span>
                    : <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                  }
                </div>
                <span style={{
                  fontSize: 14, fontWeight: i === step ? 700 : 400,
                  color: i === step ? "#fff" : "rgba(255,255,255,0.65)",
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 12 }}>
            {["Управление расписанием и кабинетами", "Запись пациентов в один клик", "Аналитика и статистика клиники"].map((text) => (
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Mobile logo */}
          <div className="clinic-mobile-logo" style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0d9488, #0f766e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>HamshiraGo Clinic</span>
          </div>

          {/* Step indicator mobile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i < step ? "#0d9488" : i === step ? "#0d9488" : "#e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                  color: i <= step ? "#fff" : "#94a3b8",
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ height: 2, width: 24, background: i < step ? "#0d9488" : "#e2e8f0", borderRadius: 2 }} />
                )}
              </div>
            ))}
            <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>{STEPS[step]}</span>
          </div>

          {/* STEP 0 — Clinic info */}
          {step === 0 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Данные клиники</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Основная информация о вашей клинике</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Название клиники *">
                  <div style={{ position: "relative" }}>
                    <Building2 size={16} color={focused === "name" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                      placeholder="Клиника «Ибн Сино»" style={inputStyle("name")} />
                  </div>
                </Field>

                <Field label="Юридическое название">
                  <div style={{ position: "relative" }}>
                    <FileText size={16} color={focused === "legalName" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={legalName} onChange={(e) => setLegalName(e.target.value)}
                      onFocus={() => setFocused("legalName")} onBlur={() => setFocused(null)}
                      placeholder='ООО "Ибн Сино Медицина"' style={inputStyle("legalName")} />
                  </div>
                </Field>

                <Field label="Телефон клиники *">
                  <div style={{ position: "relative" }}>
                    <Phone size={16} color={focused === "phone" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="tel" value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value.replace(/\D/g, "")))}
                      onFocus={() => { setFocused("phone"); if (!phone) setPhone("+998 "); }}
                      onBlur={() => { setFocused(null); if (phone === "+998 ") setPhone(""); }}
                      placeholder="+998 90 123 45 67" style={inputStyle("phone")} />
                  </div>
                </Field>

                <Field label="Адрес">
                  <div style={{ position: "relative" }}>
                    <MapPin size={16} color={focused === "address" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={address} onChange={(e) => setAddress(e.target.value)}
                      onFocus={() => setFocused("address")} onBlur={() => setFocused(null)}
                      placeholder="ул. Навои, 12" style={inputStyle("address")} />
                  </div>
                </Field>

                <Field label="Город">
                  <input value={city} onChange={(e) => setCity(e.target.value)}
                    onFocus={() => setFocused("city")} onBlur={() => setFocused(null)}
                    placeholder="Ташкент" style={inputStyleNoIcon("city")} />
                </Field>

                <button onClick={() => setStep(1)} disabled={!canNext0} style={btnStyle(!canNext0)}>
                  Далее <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* STEP 1 — License */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Лицензия</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Необязательно — можно заполнить позже в настройках</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Номер лицензии">
                  <div style={{ position: "relative" }}>
                    <FileText size={16} color={focused === "lic" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                      onFocus={() => setFocused("lic")} onBlur={() => setFocused(null)}
                      placeholder="МЛ-2024-001234" style={inputStyle("lic")} />
                  </div>
                </Field>

                <Field label="Дата окончания лицензии">
                  <div style={{ position: "relative" }}>
                    <Calendar size={16} color={focused === "exp" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)}
                      onFocus={() => setFocused("exp")} onBlur={() => setFocused(null)}
                      style={inputStyle("exp")} />
                  </div>
                </Field>

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button onClick={() => setStep(0)} style={btnSecStyle()}>
                    <ChevronLeft size={16} /> Назад
                  </button>
                  <button onClick={() => setStep(2)} style={{ ...btnStyle(false), flex: 1 }}>
                    Далее <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — CEO */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Аккаунт руководителя</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>CEO — главный администратор клиники (роль CEO)</p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="ФИО руководителя *">
                  <div style={{ position: "relative" }}>
                    <User size={16} color={focused === "ceoName" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={ceoName} onChange={(e) => setCeoName(e.target.value)}
                      onFocus={() => setFocused("ceoName")} onBlur={() => setFocused(null)}
                      placeholder="Алишер Каримов" style={inputStyle("ceoName")} />
                  </div>
                </Field>

                <Field label="Телефон руководителя *">
                  <div style={{ position: "relative" }}>
                    <Phone size={16} color={focused === "ceoPhone" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type="tel" value={ceoPhone}
                      onChange={(e) => setCeoPhone(formatPhone(e.target.value.replace(/\D/g, "")))}
                      onFocus={() => { setFocused("ceoPhone"); if (!ceoPhone) setCeoPhone("+998 "); }}
                      onBlur={() => { setFocused(null); if (ceoPhone === "+998 ") setCeoPhone(""); }}
                      placeholder="+998 90 123 45 67" style={inputStyle("ceoPhone")} />
                  </div>
                </Field>

                <Field label="Пароль *">
                  <div style={{ position: "relative" }}>
                    <Lock size={16} color={focused === "pass" ? "#0d9488" : "#94a3b8"} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                    <input type={showPass ? "text" : "password"} value={ceoPassword}
                      onChange={(e) => setCeoPassword(e.target.value)}
                      onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                      placeholder="Минимум 6 символов" minLength={6}
                      style={{ ...inputStyle("pass"), paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass((v) => !v)} style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex",
                    }}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    Войти в портал можно по телефону руководителя и этому паролю
                  </p>
                </Field>

                {error && (
                  <div style={{
                    background: "#fef2f2", borderRadius: 10, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: 13,
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)} style={btnSecStyle()}>
                    <ChevronLeft size={16} /> Назад
                  </button>
                  <button type="submit" disabled={loading || !canSubmit} style={{ ...btnStyle(loading || !canSubmit), flex: 1 }}>
                    {loading && <Spinner />}
                    {loading ? "Регистрация..." : "Зарегистрировать"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Login link */}
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#64748b" }}>
            Уже есть аккаунт?{" "}
            <Link href="/clinic/auth" style={{ color: "#0d9488", fontWeight: 600, textDecoration: "none" }}>
              Войти
            </Link>
          </p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "linear-gradient(135deg, #0d9488, #0f766e)",
    color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 10,
    padding: "13px 24px", border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  };
}

function btnSecStyle(): React.CSSProperties {
  return {
    background: "#f1f5f9", color: "#64748b", fontSize: 14, fontWeight: 600,
    borderRadius: 10, padding: "13px 20px", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6,
  };
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
