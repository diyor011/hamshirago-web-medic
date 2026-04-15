"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw, Check, X, Settings,
  Video, Home, CreditCard, Clock,
} from "lucide-react";
import { clinicApi, ClinicCompany, ClinicService } from "@/lib/clinicApi";
import { useClinic } from "@/context/ClinicContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DaySchedule {
  open: boolean;
  from: string;
  to: string;
}

interface WorkingHours {
  [day: number]: DaySchedule;
}

interface ClinicFeatures {
  onlineConsultation: boolean;
  houseCall: boolean;
  onlinePayment: boolean;
  slotDuration: number;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_FULL  = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const DEFAULT_HOURS: WorkingHours = {
  0: { open: true,  from: "09:00", to: "18:00" },
  1: { open: true,  from: "09:00", to: "18:00" },
  2: { open: true,  from: "09:00", to: "18:00" },
  3: { open: true,  from: "09:00", to: "18:00" },
  4: { open: true,  from: "09:00", to: "17:00" },
  5: { open: true,  from: "09:00", to: "15:00" },
  6: { open: false, from: "09:00", to: "13:00" },
};

const DEFAULT_FEATURES: ClinicFeatures = {
  onlineConsultation: false,
  houseCall: false,
  onlinePayment: false,
  slotDuration: 30,
};

const LS_HOURS_KEY    = "clinic_working_hours";
const LS_FEATURES_KEY = "clinic_features";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ height = 40, radius = 10 }: { height?: number; radius?: number }) {
  return (
    <div style={{ height, borderRadius: radius, background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, color: "#ef4444" }}>{message}</span>
      <button onClick={onRetry} style={{
        display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
        color: "#ef4444", background: "none", border: "none", cursor: "pointer",
      }}>
        <RefreshCw size={13} /> Повторить
      </button>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}
function ToggleSwitch({ checked, onChange, id }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        background: checked ? "#0d9488" : "#e2e8f0",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
  boxShadow: "0 1px 4px rgba(15,23,42,0.04)", padding: "24px",
};

interface ServiceForm { name: string; price: string; durationMinutes: string; }
const EMPTY_SVC: ServiceForm = { name: "", price: "", durationMinutes: "" };

export default function SettingsPage() {
  const { setClinic } = useClinic();

  // ── Company ──
  const [company, setCompany] = useState<ClinicCompany | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [errCompany, setErrCompany] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: "", address: "", phone: "", email: "", logoUrl: "",
  });

  // ── Telegram ──
  const [tgChatId, setTgChatId] = useState("");
  const [savingTg, setSavingTg] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  async function handleSaveTelegram() {
    if (!tgChatId.trim()) return;
    setSavingTg(true); setTgError(null); setTgSaved(false);
    try {
      await clinicApi.me.saveTelegramChatId(tgChatId.trim());
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 3000);
    } catch (e) {
      setTgError(e instanceof Error ? e.message : "Ошибка");
    }
    setSavingTg(false);
  }

  // ── Services ──
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [errSvc, setErrSvc] = useState<string | null>(null);
  const [showCreateSvc, setShowCreateSvc] = useState(false);
  const [svcForm, setSvcForm] = useState<ServiceForm>(EMPTY_SVC);
  const [creatingSvc, setCreatingSvc] = useState(false);
  const [createSvcError, setCreateSvcError] = useState("");
  const [editingSvc, setEditingSvc] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>(EMPTY_SVC);
  const [updatingSvc, setUpdatingSvc] = useState(false);
  const [deactivatingSvc, setDeactivatingSvc] = useState<string | null>(null);

  // ── Working Hours (localStorage) ──
  const [hours, setHours] = useState<WorkingHours>(() => {
    if (typeof window === "undefined") return DEFAULT_HOURS;
    try {
      const saved = localStorage.getItem(LS_HOURS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_HOURS;
    } catch { return DEFAULT_HOURS; }
  });
  const [hoursSaved, setHoursSaved] = useState(false);

  // ── Features (localStorage) ──
  const [features, setFeatures] = useState<ClinicFeatures>(() => {
    if (typeof window === "undefined") return DEFAULT_FEATURES;
    try {
      const saved = localStorage.getItem(LS_FEATURES_KEY);
      return saved ? { ...DEFAULT_FEATURES, ...JSON.parse(saved) } : DEFAULT_FEATURES;
    } catch { return DEFAULT_FEATURES; }
  });
  const [featuresSaved, setFeaturesSaved] = useState(false);

  // ── Loaders ──
  const loadCompany = useCallback(async () => {
    setLoadingCompany(true); setErrCompany(null);
    try {
      const c = await clinicApi.company.get();
      setCompany(c);
      setCompanyForm({
        name: c.name ?? "", address: c.address ?? "",
        phone: c.phone ?? "", email: c.email ?? "", logoUrl: c.logoUrl ?? "",
      });
    } catch (e) {
      setErrCompany(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally { setLoadingCompany(false); }
  }, []);

  const loadServices = useCallback(async () => {
    setLoadingSvc(true); setErrSvc(null);
    try { setServices(await clinicApi.services.list()); }
    catch (e) { setErrSvc(e instanceof Error ? e.message : "Ошибка загрузки"); }
    finally { setLoadingSvc(false); }
  }, []);

  useEffect(() => { loadCompany(); loadServices(); }, [loadCompany, loadServices]);

  // ── Company save ──
  async function handleSaveCompany() {
    setSaving(true); setSaveSuccess(false);
    try {
      const updated = await clinicApi.company.update({
        name: companyForm.name || undefined,
        address: companyForm.address || undefined,
        phone: companyForm.phone || undefined,
        email: companyForm.email || undefined,
        logoUrl: companyForm.logoUrl || undefined,
      });
      // Push updated data into ClinicContext so sidebar reflects changes instantly
      setClinic({
        id: updated.id,
        name: updated.name,
        logoUrl: updated.logoUrl ?? null,
        phone: updated.phone ?? null,
        address: updated.address ?? null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadCompany();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  }

  // ── Working hours helpers ──
  function updateDay(dayIdx: number, patch: Partial<DaySchedule>) {
    setHours((prev) => ({ ...prev, [dayIdx]: { ...prev[dayIdx], ...patch } }));
  }

  function saveHours() {
    localStorage.setItem(LS_HOURS_KEY, JSON.stringify(hours));
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 2500);
  }

  // ── Features helpers ──
  function updateFeature<K extends keyof ClinicFeatures>(key: K, value: ClinicFeatures[K]) {
    setFeatures((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(LS_FEATURES_KEY, JSON.stringify(next));
      return next;
    });
    setFeaturesSaved(true);
    setTimeout(() => setFeaturesSaved(false), 2000);
  }

  // ── Service actions ──
  async function handleCreateService() {
    if (!svcForm.name.trim()) { setCreateSvcError("Введите название"); return; }
    if (!svcForm.price || isNaN(Number(svcForm.price))) { setCreateSvcError("Введите цену"); return; }
    if (!svcForm.durationMinutes || isNaN(Number(svcForm.durationMinutes))) { setCreateSvcError("Введите длительность"); return; }
    setCreatingSvc(true); setCreateSvcError("");
    try {
      await clinicApi.services.create({
        name: svcForm.name.trim(),
        price: parseInt(svcForm.price, 10),
        durationMinutes: parseInt(svcForm.durationMinutes, 10),
      });
      setSvcForm(EMPTY_SVC); setShowCreateSvc(false);
      await loadServices();
    } catch (e) {
      setCreateSvcError(e instanceof Error ? e.message : "Ошибка создания");
    } finally { setCreatingSvc(false); }
  }

  async function handleUpdateService(id: string) {
    if (!editForm.name.trim()) return;
    setUpdatingSvc(true);
    try {
      await clinicApi.services.update(id, {
        name: editForm.name.trim(),
        price: parseInt(editForm.price, 10),
        durationMinutes: parseInt(editForm.durationMinutes, 10),
      });
      setEditingSvc(null); await loadServices();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка обновления");
    } finally { setUpdatingSvc(false); }
  }

  async function handleDeactivateService(id: string) {
    if (!confirm("Деактивировать услугу?")) return;
    setDeactivatingSvc(id);
    try { await clinicApi.services.deactivate(id); await loadServices(); }
    catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
    finally { setDeactivatingSvc(null); }
  }

  const FEATURE_ITEMS = [
    {
      key: "onlineConsultation" as const,
      icon: <Video size={20} color="#6366f1" />,
      iconBg: "#eef2ff",
      label: "Онлайн-консультация",
      desc: "Видеозвонки через платформу HamshiraGo",
    },
    {
      key: "houseCall" as const,
      icon: <Home size={20} color="#ea580c" />,
      iconBg: "#fff7ed",
      label: "Выезд на дом",
      desc: "Врачи принимают пациентов на дому",
    },
    {
      key: "onlinePayment" as const,
      icon: <CreditCard size={20} color="#0d9488" />,
      iconBg: "#f0fdfa",
      label: "Онлайн-оплата",
      desc: "Принимать оплату через приложение",
    },
  ];

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .day-row:hover { background: #f8fafc !important; }
        .time-input { padding: 7px 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; font-size: 13px; color: #0f172a; outline: none; font-family: inherit; transition: border-color 0.15s; }
        .time-input:focus { border-color: #0d9488; }
        .time-input:disabled { opacity: 0.4; cursor: not-allowed; background: #f8fafc; }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Настройки клиники</h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>Основные данные, расписание и список услуг</p>
      </div>

      {errCompany && <div style={{ marginBottom: 20 }}><ErrorBanner message={errCompany} onRetry={loadCompany} /></div>}

      {/* ── 1. Company info ──────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={15} color="#0d9488" /> Данные клиники
        </h2>

        {loadingCompany ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                {companyForm.logoUrl ? (
                  <img src={companyForm.logoUrl} alt="Logo" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover", border: "2px solid #e2e8f0" }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 14, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#94a3b8" }}>
                    {companyForm.name.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>URL логотипа (Cloudinary)</label>
                  <input style={inputStyle} value={companyForm.logoUrl} onChange={(e) => setCompanyForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[
                { key: "name" as const,    label: "Название клиники *", placeholder: "Медцентр «Здоровье»" },
                { key: "address" as const, label: "Адрес",              placeholder: "ул. Амира Темура 10, Ташкент" },
                { key: "phone" as const,   label: "Телефон",            placeholder: "+998712345678" },
                { key: "email" as const,   label: "Email",              placeholder: "info@clinic.uz" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{label}</label>
                  <input style={inputStyle} value={companyForm[key]} onChange={(e) => setCompanyForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={handleSaveCompany} disabled={saving} style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              {saveSuccess && <span style={{ fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}><Check size={14} /> Сохранено</span>}
            </div>
          </>
        )}
      </div>

      {/* ── 2. Working hours ─────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Clock size={15} color="#0d9488" /> Рабочие часы
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hoursSaved && <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}><Check size={13} /> Сохранено</span>}
            <button onClick={saveHours} style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Сохранить
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 56px 1fr 1fr", gap: 0, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 16px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>День</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Откр.</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Начало</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Конец</span>
          </div>

          {DAY_NAMES.map((name, idx) => {
            const day = hours[idx];
            return (
              <div
                key={idx}
                className="day-row"
                style={{
                  display: "grid", gridTemplateColumns: "140px 56px 1fr 1fr",
                  gap: 0, padding: "12px 16px", alignItems: "center",
                  borderBottom: idx < 6 ? "1px solid #f8fafc" : "none",
                  background: "#fff", transition: "background 0.15s",
                }}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: day.open ? "#0f172a" : "#94a3b8" }}>{DAY_FULL[idx]}</span>
                  {!day.open && <span style={{ fontSize: 11, color: "#ef4444", marginLeft: 6, fontWeight: 600 }}>Закрыто</span>}
                </div>
                <div>
                  <ToggleSwitch checked={day.open} onChange={(v) => updateDay(idx, { open: v })} id={`day-${idx}`} />
                </div>
                <div>
                  <input
                    type="time"
                    className="time-input"
                    value={day.from}
                    disabled={!day.open}
                    onChange={(e) => updateDay(idx, { from: e.target.value })}
                    aria-label={`${DAY_FULL[idx]} начало`}
                  />
                </div>
                <div>
                  <input
                    type="time"
                    className="time-input"
                    value={day.to}
                    disabled={!day.open}
                    onChange={(e) => updateDay(idx, { to: e.target.value })}
                    aria-label={`${DAY_FULL[idx]} конец`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
          Расписание сохраняется локально и будет синхронизировано с сервером в следующем обновлении.
        </p>
      </div>

      {/* ── 3. Feature toggles ───────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Возможности клиники</h2>
          {featuresSaved && <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}><Check size={13} /> Автосохранено</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {FEATURE_ITEMS.map(({ key, icon, iconBg, label, desc }) => {
            const active = features[key];
            return (
              <div
                key={key}
                onClick={() => updateFeature(key, !active)}
                style={{
                  border: `1.5px solid ${active ? "#0d9488" : "#e2e8f0"}`,
                  borderRadius: 14, padding: "16px 18px",
                  background: active ? "#f0fdfa" : "#fff",
                  cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "flex-start", gap: 14,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{label}</span>
                    <ToggleSwitch checked={active} onChange={(v) => updateFeature(key, v)} id={`feature-${key}`} />
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.4 }}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Slot duration ─────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Длительность слота</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>Стандартная продолжительность одного приёма при онлайн-записи</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SLOT_DURATIONS.map((min) => {
            const active = features.slotDuration === min;
            return (
              <button
                key={min}
                onClick={() => updateFeature("slotDuration", min)}
                aria-pressed={active}
                style={{
                  minWidth: 60, padding: "9px 18px", borderRadius: 99,
                  border: `1.5px solid ${active ? "#0d9488" : "#e2e8f0"}`,
                  background: active ? "#0d9488" : "#fff",
                  color: active ? "#fff" : "#475569",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: active ? "0 2px 8px rgba(13,148,136,0.25)" : "none",
                }}
              >
                {min} мин
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Services ──────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Услуги</h2>
          <button onClick={() => setShowCreateSvc(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={14} /> Добавить услугу
          </button>
        </div>

        {showCreateSvc && (
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Название *</label>
                <input style={inputStyle} value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} placeholder="Консультация терапевта" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Цена (UZS) *</label>
                <input type="number" min={0} style={inputStyle} value={svcForm.price} onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value }))} placeholder="150000" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Длит. (мин) *</label>
                <input type="number" min={1} style={inputStyle} value={svcForm.durationMinutes} onChange={(e) => setSvcForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder="30" />
              </div>
            </div>
            {createSvcError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 8 }}>{createSvcError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleCreateService} disabled={creatingSvc} style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: creatingSvc ? "not-allowed" : "pointer" }}>
                {creatingSvc ? "..." : "Создать"}
              </button>
              <button onClick={() => { setShowCreateSvc(false); setSvcForm(EMPTY_SVC); setCreateSvcError(""); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: "pointer", color: "#64748b" }}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {errSvc && <div style={{ marginBottom: 16 }}><ErrorBanner message={errSvc} onRetry={loadServices} /></div>}

        {loadingSvc ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} />)}
          </div>
        ) : services.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Нет услуг. Добавьте первую.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Название</th>
                <th style={{ textAlign: "right", padding: "0 8px 10px", color: "#64748b", fontWeight: 600 }}>Цена</th>
                <th style={{ textAlign: "right", padding: "0 8px 10px", color: "#64748b", fontWeight: 600 }}>Длит.</th>
                <th style={{ textAlign: "center", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Статус</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} style={{ borderBottom: "1px solid #f8fafc", opacity: svc.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 0" }}>
                    {editingSvc === svc.id ? (
                      <input style={{ ...inputStyle, padding: "6px 10px" }} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    ) : (
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{svc.name}</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    {editingSvc === svc.id ? (
                      <input type="number" min={0} style={{ ...inputStyle, padding: "6px 10px", textAlign: "right" }} value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                    ) : (
                      <span style={{ color: "#374151" }}>{svc.price.toLocaleString("ru-RU")} сум</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    {editingSvc === svc.id ? (
                      <input type="number" min={1} style={{ ...inputStyle, padding: "6px 10px", textAlign: "right" }} value={editForm.durationMinutes} onChange={(e) => setEditForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                    ) : (
                      <span style={{ color: "#374151" }}>{svc.durationMinutes} мин</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, ...(svc.isActive ? { background: "#f0fdf4", color: "#16a34a" } : { background: "#f1f5f9", color: "#94a3b8" }) }}>
                      {svc.isActive ? "Активна" : "Неактивна"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                      {editingSvc === svc.id ? (
                        <>
                          <button onClick={() => handleUpdateService(svc.id)} disabled={updatingSvc} style={{ padding: "5px 8px", borderRadius: 7, background: "#f0fdf4", border: "1px solid #bbf7d0", cursor: "pointer", color: "#16a34a" }}><Check size={13} /></button>
                          <button onClick={() => setEditingSvc(null)} style={{ padding: "5px 8px", borderRadius: 7, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b" }}><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingSvc(svc.id); setEditForm({ name: svc.name, price: String(svc.price), durationMinutes: String(svc.durationMinutes) }); }} style={{ padding: "5px 8px", borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b" }}><Pencil size={13} /></button>
                          {svc.isActive && (
                            <button onClick={() => handleDeactivateService(svc.id)} disabled={deactivatingSvc === svc.id} style={{ padding: "5px 8px", borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer", color: "#ef4444" }}><Trash2 size={13} /></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 6. Telegram уведомления ──────────────────────────────────────────── */}
      <div style={{ ...card, marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          Telegram уведомления
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Получайте мгновенные уведомления о новых лидах от Salomat AI прямо в Telegram.
          Напишите нашему боту <b>@HamshiraGoBot</b>, чтобы узнать свой Chat ID, затем введите его ниже.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
              TELEGRAM CHAT ID
            </label>
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="например: 123456789"
              style={{
                width: "100%", height: 42, borderRadius: 8,
                border: "1.5px solid #e2e8f0", padding: "0 12px",
                fontSize: 14, boxSizing: "border-box" as const, outline: "none",
              }}
            />
          </div>
          <button
            onClick={handleSaveTelegram}
            disabled={savingTg || !tgChatId.trim()}
            style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
              border: "none", borderRadius: 8, padding: "0 24px", height: 42,
              fontSize: 14, fontWeight: 700,
              cursor: savingTg || !tgChatId.trim() ? "not-allowed" : "pointer",
              opacity: savingTg || !tgChatId.trim() ? 0.7 : 1,
              flexShrink: 0,
            }}
          >
            {savingTg ? "Сохранение..." : "Подключить"}
          </button>
        </div>
        {tgSaved && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
            ✓ Telegram подключён — уведомления о лидах будут приходить вам
          </p>
        )}
        {tgError && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#ef4444" }}>{tgError}</p>
        )}
      </div>
    </div>
  );
}
