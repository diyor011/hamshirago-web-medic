"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw, Check, X, Settings,
  Video, Home, CreditCard, Clock,
} from "lucide-react";
import { clinicApi, ClinicCompany, ClinicService } from "@/lib/clinicApi";
import { useClinic } from "@/context/ClinicContext";
import { useToast, ToastContainer, ConfirmDialog } from "@/components/clinic/Toast";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface DaySchedule { open: boolean; from: string; to: string; }
interface WorkingHours { [day: number]: DaySchedule; }
interface ClinicFeatures { onlineConsultation: boolean; houseCall: boolean; onlinePayment: boolean; slotDuration: number; }

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
  onlineConsultation: false, houseCall: false, onlinePayment: false, slotDuration: 30,
};

const LS_HOURS_KEY    = "clinic_working_hours";
const LS_FEATURES_KEY = "clinic_features";

function Skeleton() {
  return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-500">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <RefreshCw size={13} /> Повторить
      </button>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border-none p-0 outline-none focus:outline-none transition-colors duration-200 ${checked ? "bg-teal-500" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all duration-200 ${checked ? "translate-x-[23px]" : "translate-x-[3px]"}`}
      />
    </button>
  );
}

type ServiceCategory = "CONSULTATION" | "LAB" | "DIAGNOSTIC" | "PROCEDURE";
const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "CONSULTATION", label: "Консультация" },
  { value: "LAB",          label: "Лаборатория" },
  { value: "DIAGNOSTIC",   label: "Диагностика" },
  { value: "PROCEDURE",    label: "Процедура" },
];

interface ServiceForm { name: string; price: string; durationMinutes: string; category: ServiceCategory; isRangePrice: boolean; priceMin: string; priceMax: string; }
const EMPTY_SVC: ServiceForm = { name: "", price: "", durationMinutes: "", category: "CONSULTATION", isRangePrice: false, priceMin: "", priceMax: "" };

const inputCls = "w-full rounded-xl border-[1.5px] border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500";
const cardCls  = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { setClinic } = useClinic();

  const [company, setCompany]             = useState<ClinicCompany | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [errCompany, setErrCompany]         = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [saveSuccess, setSaveSuccess]       = useState(false);
  const [companyForm, setCompanyForm]       = useState({ name: "", address: "", logoUrl: "" });

  const [tgChatId, setTgChatId] = useState("");
  const [savingTg, setSavingTg] = useState(false);
  const [tgSaved, setTgSaved]   = useState(false);
  const [tgError, setTgError]   = useState<string | null>(null);

  const [services, setServices]             = useState<ClinicService[]>([]);
  const [loadingSvc, setLoadingSvc]         = useState(true);
  const [errSvc, setErrSvc]                 = useState<string | null>(null);
  const [showCreateSvc, setShowCreateSvc]   = useState(false);
  const [svcForm, setSvcForm]               = useState<ServiceForm>(EMPTY_SVC);
  const [creatingSvc, setCreatingSvc]       = useState(false);
  const [createSvcError, setCreateSvcError] = useState("");
  const [editingSvc, setEditingSvc]         = useState<string | null>(null);
  const [editForm, setEditForm]             = useState<ServiceForm>(EMPTY_SVC);
  const [updatingSvc, setUpdatingSvc]       = useState(false);
  const [deactivatingSvc, setDeactivatingSvc] = useState<string | null>(null);
  const [confirmSvcId, setConfirmSvcId]     = useState<string | null>(null);
  const { toasts, toast, closeToast }       = useToast();

  const [hours, setHours] = useState<WorkingHours>(() => {
    if (typeof window === "undefined") return DEFAULT_HOURS;
    try {
      const saved = localStorage.getItem(LS_HOURS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_HOURS;
    } catch { return DEFAULT_HOURS; }
  });
  const [hoursSaved, setHoursSaved] = useState(false);

  const [features, setFeatures] = useState<ClinicFeatures>(() => {
    if (typeof window === "undefined") return DEFAULT_FEATURES;
    try {
      const saved = localStorage.getItem(LS_FEATURES_KEY);
      return saved ? { ...DEFAULT_FEATURES, ...JSON.parse(saved) } : DEFAULT_FEATURES;
    } catch { return DEFAULT_FEATURES; }
  });
  const [featuresSaved, setFeaturesSaved] = useState(false);

  const loadCompany = useCallback(async () => {
    setLoadingCompany(true); setErrCompany(null);
    try {
      const c = await clinicApi.company.get();
      setCompany(c);
      setCompanyForm({ name: c.name ?? "", address: c.address ?? "", logoUrl: c.logoUrl ?? "" });
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

  async function handleSaveCompany() {
    if (companyForm.logoUrl && !companyForm.logoUrl.startsWith("https://res.cloudinary.com/")) {
      toast.error("URL логотипа должен начинаться с https://res.cloudinary.com/");
      return;
    }
    setSaving(true); setSaveSuccess(false);
    try {
      const updated = await clinicApi.company.update({
        name: companyForm.name || undefined,
        address: companyForm.address || undefined,
        logoUrl: companyForm.logoUrl || undefined,
      });
      setClinic({ id: updated.id, name: updated.name, logoUrl: updated.logoUrl ?? null, address: updated.address ?? null });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadCompany();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  }

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

  function updateDay(dayIdx: number, patch: Partial<DaySchedule>) {
    setHours((prev) => ({ ...prev, [dayIdx]: { ...prev[dayIdx], ...patch } }));
  }

  async function saveHours() {
    localStorage.setItem(LS_HOURS_KEY, JSON.stringify(hours));
    try {
      await clinicApi.company.update({ settings: { workingHours: hours } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка синхронизации расписания");
      return;
    }
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 2500);
  }

  function updateFeature<K extends keyof ClinicFeatures>(key: K, value: ClinicFeatures[K]) {
    setFeatures((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(LS_FEATURES_KEY, JSON.stringify(next));
      return next;
    });
    setFeaturesSaved(true);
    setTimeout(() => setFeaturesSaved(false), 2000);
  }

  async function handleCreateService() {
    if (!svcForm.name.trim()) { setCreateSvcError("Введите название"); return; }
    if (!svcForm.durationMinutes || isNaN(Number(svcForm.durationMinutes))) { setCreateSvcError("Введите длительность"); return; }
    if (svcForm.isRangePrice) {
      if (!svcForm.priceMin || isNaN(Number(svcForm.priceMin))) { setCreateSvcError("Введите минимальную цену"); return; }
      if (!svcForm.priceMax || isNaN(Number(svcForm.priceMax))) { setCreateSvcError("Введите максимальную цену"); return; }
    } else {
      if (!svcForm.price || isNaN(Number(svcForm.price))) { setCreateSvcError("Введите цену"); return; }
    }
    setCreatingSvc(true); setCreateSvcError("");
    try {
      await clinicApi.services.create({
        name: svcForm.name.trim(),
        price: svcForm.isRangePrice ? parseInt(svcForm.priceMin, 10) : parseInt(svcForm.price, 10),
        durationMinutes: parseInt(svcForm.durationMinutes, 10),
        category: svcForm.category,
        ...(svcForm.isRangePrice ? { priceMin: parseInt(svcForm.priceMin, 10), priceMax: parseInt(svcForm.priceMax, 10) } : {}),
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
        price: editForm.isRangePrice ? parseInt(editForm.priceMin, 10) : parseInt(editForm.price, 10),
        durationMinutes: parseInt(editForm.durationMinutes, 10),
        ...(editForm.isRangePrice
          ? { priceMin: parseInt(editForm.priceMin, 10), priceMax: parseInt(editForm.priceMax, 10) }
          : { priceMin: null, priceMax: null }),
      });
      setEditingSvc(null); await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка обновления");
    } finally { setUpdatingSvc(false); }
  }

  async function doDeactivateService(id: string) {
    setConfirmSvcId(null);
    setDeactivatingSvc(id);
    try { await clinicApi.services.deactivate(id); toast.success("Услуга деактивирована"); await loadServices(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    finally { setDeactivatingSvc(null); }
  }

  const FEATURE_ITEMS = [
    { key: "onlineConsultation" as const, icon: <Video size={20} className="text-indigo-500" />, iconBg: "bg-indigo-50", label: "Онлайн-консультация", desc: "Видеозвонки через платформу HamshiraGo" },
    { key: "houseCall" as const,          icon: <Home size={20} className="text-orange-500" />,  iconBg: "bg-orange-50",  label: "Выезд на дом",         desc: "Врачи принимают пациентов на дому" },
    { key: "onlinePayment" as const,      icon: <CreditCard size={20} className="text-teal-600" />, iconBg: "bg-teal-50",  label: "Онлайн-оплата",       desc: "Принимать оплату через приложение" },
  ];

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {confirmSvcId && (
        <ConfirmDialog
          message={t("clinic.services.confirmDeactivate")}
          confirmLabel={t("clinic.services.deactivateBtn")}
          onConfirm={() => doDeactivateService(confirmSvcId)}
          onCancel={() => setConfirmSvcId(null)}
        />
      )}

      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
            <Settings size={12} />
            Clinic OS
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t("clinic.settings.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t("clinic.settings.subtitle")}</p>
        </div>
      </section>

      {errCompany && <ErrorBanner message={errCompany} onRetry={loadCompany} />}

      {/* 1. Company info */}
      <div className={cardCls}>
        <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-slate-950">
          <Settings size={15} className="text-teal-600" /> Данные клиники
        </h2>

        {loadingCompany ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-4">
                {companyForm.logoUrl ? (
                  <img src={companyForm.logoUrl} alt="Logo" className="h-18 w-18 rounded-2xl border-2 border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-slate-100 text-3xl font-extrabold text-slate-400">
                    {companyForm.name.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">URL логотипа (Cloudinary)</label>
                  <input className={inputCls} value={companyForm.logoUrl} onChange={(e) => setCompanyForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {[
                { key: "name" as const,    label: "Название клиники *", placeholder: "Медцентр «Здоровье»" },
                { key: "address" as const, label: "Адрес",              placeholder: "ул. Амира Темура 10, Ташкент" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</label>
                  <input className={inputCls} value={companyForm[key]} onChange={(e) => setCompanyForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveCompany} disabled={saving} className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              {saveSuccess && <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><Check size={14} /> Сохранено</span>}
            </div>
          </>
        )}
      </div>

      {/* 2. Working hours */}
      <div className={cardCls}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
            <Clock size={15} className="text-teal-600" /> Рабочие часы
          </h2>
          <div className="flex items-center gap-2.5">
            {hoursSaved && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={13} /> Сохранено</span>}
            <button onClick={saveHours} className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2 text-sm font-bold text-white">
              Сохранить
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="grid border-b border-slate-200 bg-slate-50 px-4 py-2.5" style={{ gridTemplateColumns: "140px 56px 1fr 1fr" }}>
            {["День", "Откр.", "Начало", "Конец"].map((h) => (
              <span key={h} className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</span>
            ))}
          </div>

          {DAY_NAMES.map((_, idx) => {
            const day = hours[idx];
            return (
              <div
                key={idx}
                className="grid items-center border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60"
                style={{ gridTemplateColumns: "140px 56px 1fr 1fr" }}
              >
                <div>
                  <span className={`text-sm font-semibold ${day.open ? "text-slate-950" : "text-slate-400"}`}>{DAY_FULL[idx]}</span>
                  {!day.open && <span className="ml-1.5 text-[11px] font-bold text-red-500">Закрыто</span>}
                </div>
                <ToggleSwitch checked={day.open} onChange={(v) => updateDay(idx, { open: v })} id={`day-${idx}`} />
                <input
                  type="time"
                  value={day.from}
                  disabled={!day.open}
                  onChange={(e) => updateDay(idx, { from: e.target.value })}
                  className="rounded-lg border-[1.5px] border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <input
                  type="time"
                  value={day.to}
                  disabled={!day.open}
                  onChange={(e) => updateDay(idx, { to: e.target.value })}
                  className="rounded-lg border-[1.5px] border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>
            );
          })}
        </div>

        <p className="mt-2.5 text-[11px] text-slate-400">
          Расписание сохраняется на сервере и доступно с любого устройства.
        </p>
      </div>

      {/* 3. Feature toggles */}
      <div className={cardCls}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-slate-950">Возможности клиники</h2>
          {featuresSaved && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={13} /> Автосохранено</span>}
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {FEATURE_ITEMS.map(({ key, icon, iconBg, label, desc }) => {
            const active = features[key];
            return (
              <div
                key={key}
                onClick={() => updateFeature(key, !active)}
                className={[
                  "flex cursor-pointer items-start gap-3.5 rounded-2xl border-[1.5px] p-4 transition-all duration-200",
                  active ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-950">{label}</span>
                    <ToggleSwitch checked={active} onChange={(v) => updateFeature(key, v)} id={`feature-${key}`} />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Slot duration */}
      <div className={cardCls}>
        <h2 className="mb-1.5 text-[15px] font-bold text-slate-950">Длительность слота</h2>
        <p className="mb-4 text-sm text-slate-500">Стандартная продолжительность одного приёма при онлайн-записи</p>

        <div className="flex flex-wrap gap-2">
          {SLOT_DURATIONS.map((min) => {
            const active = features.slotDuration === min;
            return (
              <button
                key={min}
                onClick={() => updateFeature("slotDuration", min)}
                aria-pressed={active}
                className={[
                  "min-w-[60px] rounded-full border-[1.5px] px-5 py-2 text-sm font-bold transition-all duration-150",
                  active
                    ? "border-teal-500 bg-teal-500 text-white shadow-md shadow-teal-200"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                ].join(" ")}
              >
                {min} мин
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Services */}
      <div className={cardCls}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-950">Услуги</h2>
          <button onClick={() => setShowCreateSvc(true)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2 text-sm font-bold text-white">
            <Plus size={14} /> Добавить услугу
          </button>
        </div>

        {showCreateSvc && (
          <div className="mb-4 rounded-xl bg-slate-50 p-4">
            <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Название *</label>
                <input className={inputCls} value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} placeholder="Консультация терапевта" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Категория *</label>
                <select className={`${inputCls} bg-white`} value={svcForm.category} onChange={(e) => setSvcForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))}>
                  {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Длит. (мин) *</label>
                <input type="number" min={1} className={inputCls} value={svcForm.durationMinutes} onChange={(e) => setSvcForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder="30" />
              </div>
            </div>

            <div className="mb-2.5">
              <div className="mb-1.5 flex items-center gap-2.5">
                <label className="text-[11px] font-semibold text-slate-500">Цена (UZS) *</label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
                  <input type="checkbox" checked={svcForm.isRangePrice} onChange={(e) => setSvcForm((f) => ({ ...f, isRangePrice: e.target.checked }))} className="cursor-pointer" />
                  Диапазон цен
                </label>
              </div>
              {svcForm.isRangePrice ? (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} className={`${inputCls} max-w-[160px]`} value={svcForm.priceMin} onChange={(e) => setSvcForm((f) => ({ ...f, priceMin: e.target.value }))} placeholder="от 100000" />
                  <span className="text-sm text-slate-500">—</span>
                  <input type="number" min={0} className={`${inputCls} max-w-[160px]`} value={svcForm.priceMax} onChange={(e) => setSvcForm((f) => ({ ...f, priceMax: e.target.value }))} placeholder="до 300000" />
                </div>
              ) : (
                <input type="number" min={0} className={`${inputCls} max-w-[200px]`} value={svcForm.price} onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value }))} placeholder="150000" />
              )}
            </div>
            {createSvcError && <p className="mb-2 text-sm text-red-500">{createSvcError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreateService} disabled={creatingSvc} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-70">
                {creatingSvc ? "..." : "Создать"}
              </button>
              <button onClick={() => { setShowCreateSvc(false); setSvcForm(EMPTY_SVC); setCreateSvcError(""); }} className="rounded-xl bg-slate-200 px-5 py-2 text-sm text-slate-500 transition hover:bg-slate-300">
                Отмена
              </button>
            </div>
          </div>
        )}

        {errSvc && <div className="mb-4"><ErrorBanner message={errSvc} onRetry={loadServices} /></div>}

        {loadingSvc ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => <Skeleton key={i} />)}
          </div>
        ) : services.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Нет услуг. Добавьте первую.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2.5 text-left font-semibold text-slate-500">Название</th>
                <th className="px-2 pb-2.5 text-right font-semibold text-slate-500">Цена</th>
                <th className="px-2 pb-2.5 text-right font-semibold text-slate-500">Длит.</th>
                <th className="px-2 pb-2.5 text-center font-semibold text-slate-500">Статус</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className={`border-b border-slate-50 last:border-0 ${!svc.isActive ? "opacity-50" : ""}`}>
                  <td className="py-2.5">
                    {editingSvc === svc.id ? (
                      <input className={`${inputCls} py-1.5`} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    ) : (
                      <span className="font-semibold text-slate-950">{svc.name}</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {editingSvc === svc.id ? (
                      editForm.isRangePrice ? (
                        <div className="flex justify-end gap-1">
                          <input type="number" min={0} placeholder="от" className={`${inputCls} w-18 py-1.5 text-right`} value={editForm.priceMin} onChange={(e) => setEditForm((f) => ({ ...f, priceMin: e.target.value }))} />
                          <input type="number" min={0} placeholder="до" className={`${inputCls} w-18 py-1.5 text-right`} value={editForm.priceMax} onChange={(e) => setEditForm((f) => ({ ...f, priceMax: e.target.value }))} />
                        </div>
                      ) : (
                        <input type="number" min={0} className={`${inputCls} py-1.5 text-right`} value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                      )
                    ) : (
                      <span className="text-slate-700">
                        {svc.priceMin != null && svc.priceMax != null
                          ? `${svc.priceMin.toLocaleString("ru-RU")}–${svc.priceMax.toLocaleString("ru-RU")} сум`
                          : `${svc.price.toLocaleString("ru-RU")} сум`}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {editingSvc === svc.id ? (
                      <input type="number" min={1} className={`${inputCls} py-1.5 text-right`} value={editForm.durationMinutes} onChange={(e) => setEditForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                    ) : (
                      <span className="text-slate-700">{svc.durationMinutes} мин</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${svc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      {svc.isActive ? "Активна" : "Неактивна"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {editingSvc === svc.id ? (
                        <>
                          <button onClick={() => handleUpdateService(svc.id)} disabled={updatingSvc} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600"><Check size={13} /></button>
                          <button onClick={() => setEditingSvc(null)} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500"><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const hasRange = svc.priceMin != null && svc.priceMax != null;
                              setEditingSvc(svc.id);
                              setEditForm({ name: svc.name, price: String(svc.price), durationMinutes: String(svc.durationMinutes ?? ""), category: "CONSULTATION", isRangePrice: hasRange, priceMin: hasRange ? String(svc.priceMin) : "", priceMax: hasRange ? String(svc.priceMax) : "" });
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-slate-100"
                          >
                            <Pencil size={13} />
                          </button>
                          {svc.isActive && (
                            <button onClick={() => setConfirmSvcId(svc.id)} disabled={deactivatingSvc === svc.id} className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100">
                              <Trash2 size={13} />
                            </button>
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

      {/* 6. Telegram */}
      <div className={cardCls}>
        <h2 className="mb-1.5 text-[15px] font-bold text-slate-950">Telegram уведомления</h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          Получайте мгновенные уведомления о новых лидах от Salomat AI прямо в Telegram.
          Напишите нашему боту <b>@HamshiraGoBot</b>, чтобы узнать свой Chat ID, затем введите его ниже.
        </p>
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">TELEGRAM CHAT ID</label>
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="например: 123456789"
              className="h-[42px] w-full rounded-xl border-[1.5px] border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <button
            onClick={handleSaveTelegram}
            disabled={savingTg || !tgChatId.trim()}
            className="h-[42px] shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-6 text-sm font-bold text-white disabled:opacity-70"
          >
            {savingTg ? "Сохранение..." : "Подключить"}
          </button>
        </div>
        {tgSaved && <p className="mt-2.5 text-sm font-semibold text-emerald-600">✓ Telegram подключён — уведомления о лидах будут приходить вам</p>}
        {tgError && <p className="mt-2.5 text-sm text-red-500">{tgError}</p>}
      </div>
    </div>
  );
}
