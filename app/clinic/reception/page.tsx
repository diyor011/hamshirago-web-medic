"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw, CheckSquare, CalendarPlus, List as ListIcon,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Bot, Phone, Plus, Clock, User, PlayCircle, CheckCircle,
} from "lucide-react";
import { clinicApi, getClinicRole, Appointment, AppointmentStatus, Lead, ClinicRoom, DoctorStats } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import { useTranslation } from "react-i18next";
import "@/i18n";

// ─── Calendar constants ───────────────────────────────────────────────────────
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR   = 20;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED:  "Запись",
  CHECKED_IN: "Прибыл",
  IN_PROGRESS:"На приёме",
  DONE:       "Готово",
  CANCELED:   "Отменён",
  NO_SHOW:    "Не явился",
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-600",
  CHECKED_IN:  "bg-yellow-50 text-yellow-600",
  IN_PROGRESS: "bg-orange-50 text-orange-600",
  DONE:        "bg-emerald-50 text-emerald-700",
  CANCELED:    "bg-red-50 text-red-500",
  NO_SHOW:     "bg-slate-100 text-slate-500",
};

// Left-border accent color per status
const STATUS_ACCENT: Record<AppointmentStatus, string> = {
  SCHEDULED:   "#94a3b8",
  CHECKED_IN:  "#2563eb",
  IN_PROGRESS: "#d97706",
  DONE:        "#16a34a",
  CANCELED:    "#ef4444",
  NO_SHOW:     "#cbd5e1",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Наличные", TERMINAL: "Терминал", ONLINE: "Online",
};

// Calendar cell colors
const CAL_STATUS_COLORS: Record<AppointmentStatus, { bg: string; bd: string; fg: string }> = {
  SCHEDULED:   { bg: "#ccfbf1", bd: "#14b8a6", fg: "#0f766e" },
  CHECKED_IN:  { bg: "#fef3c7", bd: "#f59e0b", fg: "#b45309" },
  IN_PROGRESS: { bg: "#dbeafe", bd: "#3b82f6", fg: "#1d4ed8" },
  DONE:        { bg: "#dcfce7", bd: "#22c55e", fg: "#15803d" },
  CANCELED:    { bg: "#fee2e2", bd: "#ef4444", fg: "#b91c1c" },
  NO_SHOW:     { bg: "#f1f5f9", bd: "#94a3b8", fg: "#475569" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "только что";
  if (diff < 60) return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} д назад`;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────

function Skeleton({ className = "h-[70px]" }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-xl bg-slate-100`} />;
}

// ─── Error banner ─────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-500">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <RefreshCw size={13} /> {t("clinic.reception.retry")}
      </button>
    </div>
  );
}

// ─── Modal helper ─────────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border-[1.5px] border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-teal-500";

// ─── Main component ───────────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const { t } = useTranslation();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errApps, setErrApps] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [calendarAppts, setCalendarAppts] = useState<Appointment[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [finalPriceModal, setFinalPriceModal] = useState<{ apptId: string; priceMin: number; priceMax: number } | null>(null);
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [finalPriceLoading, setFinalPriceLoading] = useState(false);
  const { toasts, toast, closeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Quick booking (CLINIC-R3)
  const [quickBook, setQuickBook] = useState<{ time: string; date: string; roomId: string | null; doctorId: string | null; colLabel: string } | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickLoading, setQuickBookLoading] = useState(false);

  // Calendar date picker (CLINIC-R5)
  const [showCalPicker, setShowCalPicker] = useState(false);
  const [pickerViewDate, setPickerViewDate] = useState(() => new Date());
  const [clinicUser, setClinicUser] = useState<{ id: string; role: string } | null>(null);
  // undefined = не определён ещё, null = не доктор, string = CompanyUser.id доктора
  const [doctorIdFilter, setDoctorIdFilter] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("clinic_user");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) setClinicUser(parsed);
      // ClinicAppointment.doctorId = CompanyUser.id — он всегда есть в clinic_user.id
      if (getClinicRole() === "DOCTOR" && parsed?.id) {
        setDoctorIdFilter(parsed.id);
      } else {
        setDoctorIdFilter(null);
      }
    } catch { setDoctorIdFilter(null); }
  }, []);

  const todayLabel = mounted
    ? new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const fmtDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const fmtDateRu = (d: Date) =>
    d.toLocaleDateString("ru-RU", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const isForbidden = (e: unknown) =>
    e instanceof Error && (e.message.includes("прав") || e.message.toLowerCase().includes("forbidden") || e.message === "UNAUTHORIZED");

  const loadApps = useCallback(async (dId: string | null) => {
    setLoadingApps(true); setErrApps(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const list = dId
        ? await clinicApi.appointments.list({ date: today, doctorId: dId })
        : await clinicApi.appointments.today();
      setAppointments(list);
    }
    catch (e) {
      if (!isForbidden(e)) setErrApps(e instanceof Error ? e.message : t("clinic.reception.errorLoad"));
    }
    finally { setLoadingApps(false); }
  }, [t]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({ status: "NEW", limit: 5 });
      setLeads(res.data);
    } catch (e) {
      if (!isForbidden(e)) setErrLeads(e instanceof Error ? e.message : t("clinic.reception.errorLoad"));
    } finally {
      setLoadingLeads(false);
    }
  }, [t]);

  useEffect(() => {
    if (doctorIdFilter === undefined) return; // ждём резолва
    loadApps(doctorIdFilter);
    loadLeads();
  }, [loadApps, loadLeads, doctorIdFilter]);

  useEffect(() => {
    if (doctorIdFilter === undefined) return;
    // Доктор видит только свои комнаты, остальные — все
    const roomsPromise = doctorIdFilter
      ? clinicApi.rooms.forDoctor(doctorIdFilter).then((slots) =>
          slots.map((s) => ({ id: s.roomId, name: s.roomName, floor: s.floor ?? null }))
        )
      : clinicApi.rooms.list();
    roomsPromise.then(setRooms).catch(() => setRooms([]));
    // Restore doctor loading for all roles (FIX: lost during merge)
    clinicApi.stats.doctors().then(setDoctors).catch(() => setDoctors([]));
  }, [doctorIdFilter]);

  const loadCalendar = useCallback(async (dId: string | null) => {
    setLoadingCalendar(true);
    try {
      const list = await clinicApi.appointments.list({ date: fmtDateISO(calendarDate), ...(dId ? { doctorId: dId } : {}) });
      setCalendarAppts(list);
    } catch {
      setCalendarAppts([]);
    } finally {
      setLoadingCalendar(false);
    }
  }, [calendarDate]);

  useEffect(() => {
    if (viewMode === "calendar") loadCalendar(doctorIdFilter ?? null);
  }, [viewMode, loadCalendar, doctorIdFilter]);

  useEffect(() => {
    const id = setInterval(() => loadApps(doctorIdFilter ?? null), 30000);
    return () => clearInterval(id);
  }, [loadApps, doctorIdFilter]);

  async function handleSetFinalPrice() {
    if (!finalPriceModal) return;
    const val = parseInt(finalPriceInput.replace(/\D/g, ""), 10);
    if (!val || val < finalPriceModal.priceMin || val > finalPriceModal.priceMax) {
      toast.error(`Введите сумму от ${finalPriceModal.priceMin.toLocaleString()} до ${finalPriceModal.priceMax.toLocaleString()} UZS`);
      return;
    }
    setFinalPriceLoading(true);
    try {
      await clinicApi.appointments.setFinalPrice(finalPriceModal.apptId, val);
      toast.success("Итоговая цена сохранена");
      setFinalPriceModal(null); setFinalPriceInput("");
      await loadApps(doctorIdFilter ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setFinalPriceLoading(false);
    }
  }

  async function handleCheckin(id: string) {
    setCheckingIn(id);
    try {
      await clinicApi.appointments.checkin(id);
      await loadApps(doctorIdFilter ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.reception.errorLoad"));
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleUpdateStatus(id: string, status: AppointmentStatus) {
    setUpdatingStatus(id);
    try {
      await clinicApi.appointments.updateStatus(id, status);
      await loadApps(doctorIdFilter ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.reception.errorLoad"));
    } finally {
      setUpdatingStatus(null);
    }
  }

  const waiting    = appointments.filter((a) => ["SCHEDULED", "CHECKED_IN"].includes(a.status)).length;
  const inProgress = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const done       = appointments.filter((a) => a.status === "DONE").length;

  // ─── Calendar helpers ──────────────────────────────────────────────────────────

  const timeSlots = useMemo(() => {
    const arr: string[] = [];
    for (let h = CALENDAR_START_HOUR; h < CALENDAR_END_HOUR; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    arr.push(`${String(CALENDAR_END_HOUR).padStart(2, "0")}:00`);
    return arr;
  }, []);

  type CalColumn = { id: string; label: string };
  const calendarColumns: CalColumn[] = useMemo(() => {
    if (rooms.length > 0) return rooms.map((r) => ({ id: r.id, label: r.name }));
    if (doctors.length > 0) return doctors.map((d) => ({ id: d.doctorId, label: d.doctorName }));
    return [{ id: "__all__", label: t("clinic.reception.all") }];
  }, [rooms, doctors, t]);

  const columnKey = (a: Appointment): string => {
    if (rooms.length > 0) return a.roomId ?? "__none__";
    if (doctors.length > 0) return a.doctorId ?? "__none__";
    return "__all__";
  };

  const slotIndexFor = (time: string): number => {
    const [hh, mm] = time.split(":").map(Number);
    const total = hh * 60 + mm;
    const base  = CALENDAR_START_HOUR * 60;
    const end   = CALENDAR_END_HOUR   * 60;
    if (total < base) return 0;
    if (total > end)  return timeSlots.length - 1;
    return Math.floor((total - base) / 30);
  };

  const shiftDate = (days: number) => {
    const d = new Date(calendarDate);
    d.setDate(d.getDate() + days);
    setCalendarDate(d);
  };

  // CLINIC-R2: room → doctor name from today's appointments
  const roomDoctorMap = useMemo(() => {
    const map: Record<string, string> = {};
    calendarAppts.forEach((a) => {
      if (a.roomId && a.doctorId && !map[a.roomId]) {
        const doc = doctors.find((d) => d.doctorId === a.doctorId);
        if (doc) map[a.roomId] = doc.doctorName;
      }
    });
    return map;
  }, [calendarAppts, doctors]);

  // CLINIC-R3: quick book handler
  async function handleQuickBook() {
    if (!quickBook || !quickName.trim() || !quickPhone.trim()) return;
    setQuickBookLoading(true);
    try {
      await clinicApi.appointments.create({
        patientName: quickName.trim(),
        patientPhone: quickPhone.trim(),
        doctorId: quickBook.doctorId ?? undefined,
        roomId: quickBook.roomId ?? undefined,
        date: quickBook.date,
        time: quickBook.time,
      });
      toast.success("Запись добавлена");
      setQuickBook(null); setQuickName(""); setQuickPhone("");
      await loadCalendar(doctorIdFilter ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setQuickBookLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Final price modal */}
      {finalPriceModal && (
        <Modal onClose={() => setFinalPriceModal(null)}>
          <h3 className="mb-1.5 text-base font-extrabold text-slate-950">Итоговая цена</h3>
          <p className="mb-4 text-sm text-slate-500">
            Диапазон: {finalPriceModal.priceMin.toLocaleString()} — {finalPriceModal.priceMax.toLocaleString()} UZS
          </p>
          <input
            type="number"
            value={finalPriceInput}
            onChange={(e) => setFinalPriceInput(e.target.value)}
            placeholder={`${finalPriceModal.priceMin.toLocaleString()} – ${finalPriceModal.priceMax.toLocaleString()}`}
            min={finalPriceModal.priceMin}
            max={finalPriceModal.priceMax}
            autoFocus
            className="mb-4 h-12 w-full rounded-xl border-[1.5px] border-teal-500 px-3.5 text-[15px] text-slate-900 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSetFinalPrice}
              disabled={finalPriceLoading}
              className="flex-1 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 py-3 text-sm font-bold text-white disabled:opacity-70"
            >
              {finalPriceLoading ? "Сохраняем..." : "Сохранить"}
            </button>
            <button
              onClick={() => setFinalPriceModal(null)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-500"
            >
              Отмена
            </button>
          </div>
        </Modal>
      )}

      {/* Calendar picker close overlay (CLINIC-R5) */}
      {showCalPicker && (
        <div onClick={() => setShowCalPicker(false)} className="fixed inset-0 z-[299]" />
      )}

      {/* Quick booking modal (CLINIC-R3) */}
      {quickBook && (
        <Modal onClose={() => setQuickBook(null)}>
          <h3 className="mb-1 text-base font-extrabold text-slate-950">Новая запись</h3>
          <p className="mb-4 text-sm text-slate-500">
            {quickBook.time} · {quickBook.colLabel}
            {quickBook.doctorId && doctors.find(d => d.doctorId === quickBook.doctorId) &&
              ` · ${doctors.find(d => d.doctorId === quickBook.doctorId)!.doctorName}`}
          </p>
          <div className="mb-4 flex flex-col gap-2.5">
            <input autoFocus value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Имя клиента" className={inputCls} />
            <input
              value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)}
              placeholder="+998 xx xxx xx xx" type="tel" className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && handleQuickBook()}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleQuickBook}
              disabled={quickLoading || !quickName.trim() || !quickPhone.trim()}
              className="flex-1 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
            >
              {quickLoading ? "Сохраняем..." : "Добавить"}
            </button>
            <button onClick={() => setQuickBook(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-500">
              Отмена
            </button>
          </div>
        </Modal>
      )}

      {/* Page header */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t("clinic.reception.title")}</h1>
            <p className="mt-2 text-sm capitalize text-slate-400">{todayLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View toggle */}
            <div className="inline-flex gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur">
              {([
                { k: "list" as const,     labelKey: "clinic.reception.list",     Icon: ListIcon },
                { k: "calendar" as const, labelKey: "clinic.reception.calendar", Icon: CalendarIcon },
              ]).map(({ k, labelKey, Icon }) => {
                const active = viewMode === k;
                return (
                  <button
                    key={k}
                    onClick={() => setViewMode(k)}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all duration-150",
                      active ? "bg-teal-500 text-white" : "text-slate-300 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon size={14} /> {t(labelKey)}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50"
            >
              <Plus size={16} /> {t("clinic.reception.bookPatient")}
            </button>
          </div>
        </div>
      </section>

      {/* Quick stats strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {[
          { labelKey: "clinic.reception.waiting",    value: waiting,    bg: "bg-amber-50 border-amber-200",    num: "text-teal-600",   label: "text-amber-800" },
          { labelKey: "clinic.reception.inProgress", value: inProgress, bg: "bg-blue-50 border-blue-200",      num: "text-blue-600",   label: "text-blue-800" },
          { labelKey: "clinic.reception.done",       value: done,       bg: "bg-emerald-50 border-emerald-200", num: "text-emerald-600", label: "text-emerald-900" },
        ].map(({ labelKey, value, bg, num, label }) => (
          <div key={labelKey} className={`flex min-h-[80px] flex-col items-center justify-center rounded-2xl border px-5 py-4 ${bg}`}>
            <div className={`text-3xl font-black leading-none ${num}`}>{value}</div>
            <div className={`mt-1.5 text-xs font-semibold ${label}`}>{t(labelKey)}</div>
          </div>
        ))}
      </div>

      {/* ─── Calendar view ─────────────────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {/* Date navigator (CLINIC-R5) */}
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)} className="flex rounded-lg border border-slate-200 bg-white p-1.5">
                <ChevronLeft size={16} className="text-slate-500" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                  mounted && calendarDate.toDateString() === new Date().toDateString()
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-slate-200 bg-white text-teal-700",
                ].join(" ")}
              >
                {mounted && calendarDate.toDateString() !== new Date().toDateString()
                  ? calendarDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                  : t("clinic.reception.todayBtn")}
              </button>
              <button onClick={() => shiftDate(1)} className="flex rounded-lg border border-slate-200 bg-white p-1.5">
                <ChevronRight size={16} className="text-slate-500" />
              </button>

              {/* Date picker (CLINIC-R5) */}
              <div className="relative">
                <button
                  onClick={() => { setShowCalPicker((v) => !v); setPickerViewDate(new Date(calendarDate)); }}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-sm font-bold capitalize transition",
                    showCalPicker ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-slate-900",
                  ].join(" ")}
                >
                  {mounted ? fmtDateRu(calendarDate) : ""}
                </button>

                {showCalPicker && (() => {
                  const today = new Date();
                  const y = pickerViewDate.getFullYear();
                  const m = pickerViewDate.getMonth();
                  const firstDay = new Date(y, m, 1).getDay();
                  const offset = firstDay === 0 ? 6 : firstDay - 1;
                  const daysInMonth = new Date(y, m + 1, 0).getDate();
                  const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
                  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : i - offset + 1);
                  return (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-[300] w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="mb-2 flex items-center justify-between">
                        <button onClick={() => setPickerViewDate(new Date(y - 1, m, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">‹‹</button>
                        <button onClick={() => setPickerViewDate(new Date(y, m - 1, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">‹</button>
                        <span className="text-sm font-extrabold text-slate-950">{monthNames[m]} {y}</span>
                        <button onClick={() => setPickerViewDate(new Date(y, m + 1, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">›</button>
                        <button onClick={() => setPickerViewDate(new Date(y + 1, m, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">››</button>
                      </div>
                      <div className="mb-1 grid grid-cols-7 gap-0.5">
                        {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => (
                          <div key={d} className="py-0.5 text-center text-[10px] font-bold text-slate-400">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {cells.map((day, i) => {
                          if (!day) return <div key={`e-${i}`} />;
                          const date = new Date(y, m, day);
                          const isActive = date.toDateString() === calendarDate.toDateString();
                          const isToday  = date.toDateString() === today.toDateString();
                          return (
                            <button
                              key={day}
                              onClick={() => { setCalendarDate(date); setShowCalPicker(false); }}
                              className={[
                                "rounded-lg py-1.5 text-xs transition",
                                isActive ? "bg-teal-500 font-extrabold text-white"
                                  : isToday ? "font-extrabold text-teal-600 outline outline-[1.5px] outline-teal-500"
                                  : "font-medium text-slate-900 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <button onClick={() => loadCalendar(doctorIdFilter ?? null)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <RefreshCw size={13} /> {t("clinic.reception.update")}
            </button>
          </div>

          {loadingCalendar ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="overflow-hidden rounded-xl border border-slate-200"
                style={{
                  display: "grid",
                  gridTemplateColumns: `70px repeat(${calendarColumns.length}, minmax(150px, 1fr))`,
                  minWidth: calendarColumns.length > 1 ? 70 + calendarColumns.length * 150 : undefined,
                }}
              >
                {/* Header row */}
                <div className="border-b border-slate-200 bg-slate-50 px-1.5 py-2 text-[11px] font-bold text-slate-500">
                  {t("clinic.reception.time")}
                </div>
                {calendarColumns.map((c) => (
                  <div key={c.id} className="border-b border-l border-slate-200 bg-slate-50 px-2.5 py-2">
                    <div className="truncate text-xs font-bold text-slate-950">{c.label}</div>
                    {/* CLINIC-R2: doctor name under room */}
                    {rooms.length > 0 && roomDoctorMap[c.id] && (
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-teal-600">{roomDoctorMap[c.id]}</div>
                    )}
                    {rooms.length === 0 && <div className="mt-0.5 text-[10px] text-slate-400">врач</div>}
                  </div>
                ))}

                {/* Body rows */}
                {timeSlots.map((slot, rowIdx) => (
                  <div key={`row-${slot}`} style={{ display: "contents" }}>
                    <div className={`px-1.5 py-1.5 text-[11px] font-semibold text-slate-400 ${rowIdx > 0 ? "border-t border-dashed border-slate-100" : ""} bg-slate-50/50`}>
                      {slot}
                    </div>
                    {calendarColumns.map((c) => {
                      const cellAppts = calendarAppts.filter(
                        (a) => columnKey(a) === c.id && slotIndexFor(a.time) === rowIdx
                      );
                      const doctorIdForCol = rooms.length > 0
                        ? (calendarAppts.find(a => a.roomId === c.id)?.doctorId ?? null)
                        : (rooms.length === 0 && doctors.length > 0 ? c.id : null);
                      return (
                        <div
                          key={`${c.id}-${slot}`}
                          className={`flex min-h-[34px] flex-col gap-0.5 border-l border-slate-100 p-1 ${rowIdx > 0 ? "border-t border-dashed border-slate-100" : ""}`}
                        >
                          {cellAppts.map((a) => {
                            const col = CAL_STATUS_COLORS[a.status as AppointmentStatus];
                            return (
                              <button
                                key={a.id}
                                onClick={() => setSelectedAppt(a)}
                                className="rounded-md p-1 text-left text-[11px] font-semibold leading-tight"
                                style={{ background: col.bg, border: `1px solid ${col.bd}`, color: col.fg }}
                                title={`${a.time} · ${a.patientName ?? a.patientPhone} · ${STATUS_LABELS[a.status as AppointmentStatus]}`}
                              >
                                <div className="font-extrabold">{a.time}</div>
                                {/* CLINIC-R4: show name AND phone */}
                                {a.patientName && <div className="truncate">{a.patientName}</div>}
                                <div className="truncate opacity-80">{a.patientPhone}</div>
                              </button>
                            );
                          })}

                          {/* CLINIC-R3: empty slot — click to quick-book */}
                          {cellAppts.length === 0 && (
                            <button
                              onClick={() => {
                                setQuickBook({ time: slot, date: fmtDateISO(calendarDate), roomId: rooms.length > 0 ? c.id : null, doctorId: doctorIdForCol, colLabel: c.label });
                                setQuickName(""); setQuickPhone("");
                              }}
                              className="group flex min-h-[26px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-300 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-500"
                            >
                              +
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
            {(Object.keys(CAL_STATUS_COLORS) as AppointmentStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: CAL_STATUS_COLORS[s].bg, border: `1px solid ${CAL_STATUS_COLORS[s].bd}` }}
                />
                {STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calendar appointment detail modal */}
      {viewMode === "calendar" && selectedAppt && (
        <div
          onClick={() => setSelectedAppt(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="mb-3 text-base font-extrabold text-slate-950">
              {t("clinic.reception.appointment")} · {selectedAppt.time}
            </h3>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <div><b>{t("clinic.reception.patient")}:</b> {selectedAppt.patientName ?? "—"}</div>
              <div><b>{t("clinic.reception.phone")}:</b> {selectedAppt.patientPhone}</div>
              <div><b>{t("clinic.reception.date")}:</b> {selectedAppt.date.split("-").reverse().join(".")}</div>
              <div><b>{t("clinic.reception.room")}:</b> {rooms.find((r) => r.id === selectedAppt.roomId)?.name ?? selectedAppt.roomId}</div>
              <div><b>{t("clinic.reception.doctor")}:</b> {doctors.find((d) => d.doctorId === selectedAppt.doctorId)?.doctorName ?? selectedAppt.doctorId}</div>
              <div><b>{t("clinic.reception.payment")}:</b> {PAYMENT_LABELS[selectedAppt.paymentType ?? ""] ?? selectedAppt.paymentType ?? "—"}</div>
              <div className="flex items-center gap-2">
                <b>{t("clinic.reception.status")}:</b>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[selectedAppt.status as AppointmentStatus]}`}>
                  {STATUS_LABELS[selectedAppt.status as AppointmentStatus]}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedAppt(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                {t("clinic.reception.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── List view ──────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Left: appointments */}
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-950">{t("clinic.reception.todayAppointments")}</h2>
              <button onClick={() => loadApps(doctorIdFilter ?? null)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                <RefreshCw size={13} /> {t("clinic.reception.refresh")}
              </button>
            </div>

            {errApps && <div className="mb-3.5"><ErrorBanner message={errApps} onRetry={() => loadApps(doctorIdFilter ?? null)} /></div>}

            {loadingApps ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px]" />)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                <p className="text-sm text-slate-400">{t("clinic.reception.noAppointments")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments
                  .slice()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((app) => {
                    const st = app.status as AppointmentStatus;
                    const canCheckin = st === "SCHEDULED";
                    const isLoading  = checkingIn === app.id;

                    return (
                      <div
                        key={app.id}
                        className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:border-teal-400 hover:shadow-md"
                        style={{ borderLeft: `4px solid ${STATUS_ACCENT[st]}` }}
                      >
                        {/* Time */}
                        <div className="w-13 shrink-0 text-center">
                          <div className="text-[15px] font-extrabold leading-none text-teal-600">{app.time}</div>
                          <Clock size={11} className="mx-auto mt-1 text-slate-400" />
                        </div>

                        <div className="h-full w-px shrink-0 self-stretch bg-slate-100" />

                        {/* Patient info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            <span className="truncate text-sm font-bold text-slate-950">
                              {app.patientName ?? app.patientPhone}
                            </span>
                          </div>
                          {app.patientName && (
                            <div className="mb-0.5 flex items-center gap-1 text-sm text-slate-500">
                              <Phone size={11} className="text-slate-400" />
                              {app.patientPhone}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400">
                            {PAYMENT_LABELS[app.paymentType ?? ""] ?? app.paymentType ?? "—"}
                          </div>
                        </div>

                        {/* Status + actions */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[st]}`}>
                            {STATUS_LABELS[st]}
                          </span>

                          {canCheckin && (
                            <button
                              onClick={() => handleCheckin(app.id)}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              <CheckSquare size={13} />
                              {isLoading ? "..." : "Check In"}
                            </button>
                          )}

                          {st === "CHECKED_IN" && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, "IN_PROGRESS")}
                              disabled={updatingStatus === app.id}
                              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              <PlayCircle size={13} />
                              {updatingStatus === app.id ? "..." : t("clinic.reception.startReception")}
                            </button>
                          )}

                          {st === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, "DONE")}
                              disabled={updatingStatus === app.id}
                              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              <CheckCircle size={13} />
                              {updatingStatus === app.id ? "..." : t("clinic.reception.finishReception")}
                            </button>
                          )}

                          {app.finalPrice != null && (
                            <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              ✓ {app.finalPrice.toLocaleString("ru-RU")} сум
                            </span>
                          )}

                          {app.priceMin != null && app.priceMax != null && !app.finalPrice && st !== "IN_PROGRESS" && st !== "DONE" && (
                            <span className="whitespace-nowrap text-[11px] text-slate-400">
                              {app.priceMin.toLocaleString("ru-RU")}–{app.priceMax.toLocaleString("ru-RU")}
                            </span>
                          )}

                          {app.priceMin != null && app.priceMax != null && !app.finalPrice &&
                           (st === "IN_PROGRESS" || st === "DONE") &&
                           clinicUser != null &&
                           clinicUser.role !== "RECEPTION" &&
                           (clinicUser.role !== "DOCTOR" || app.doctorId === clinicUser.doctorId) && (
                            <button
                              onClick={() => {
                                setFinalPriceModal({ apptId: app.id, priceMin: app.priceMin!, priceMax: app.priceMax! });
                                setFinalPriceInput("");
                              }}
                              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              💰 Ввести цену ({app.priceMin.toLocaleString("ru-RU")}–{app.priceMax.toLocaleString("ru-RU")})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right: AI leads sidebar */}
          <div>
            <div className="mb-3.5 flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-slate-950">{t("clinic.reception.newAiLeads")}</h2>
              {leads.length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{leads.length}</span>
              )}
            </div>

            {errLeads && <div className="mb-3.5"><ErrorBanner message={errLeads} onRetry={loadLeads} /></div>}

            {loadingLeads ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-5 py-10 text-center shadow-sm">
                <Bot size={32} className="text-slate-200" />
                <p className="text-sm text-slate-400">{t("clinic.reception.noLeads")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:border-slate-200 hover:shadow-md">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-950">{lead.name ?? t("clinic.reception.withoutName")}</span>
                      <span className="text-[11px] text-slate-400">{timeAgo(lead.createdAt)}</span>
                    </div>
                    <a
                      href={`tel:${lead.phone}`}
                      className={`flex items-center gap-1.5 text-sm font-semibold text-teal-600 no-underline ${lead.notes ? "mb-1" : "mb-2"}`}
                    >
                      <Phone size={12} /> {lead.phone}
                    </a>
                    {lead.notes && (
                      <p className="mb-2 truncate text-[11px] text-slate-400">{lead.notes}</p>
                    )}
                    <button
                      onClick={() => setShowBooking(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500 py-1.5 text-xs font-bold text-purple-600 transition hover:bg-purple-500 hover:text-white"
                    >
                      <CalendarPlus size={13} /> {t("clinic.reception.bookFromLead")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showBooking && (
        <BookingModal
          open={showBooking}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); loadApps(doctorIdFilter ?? null); }}
        />
      )}
    </div>
  );
}
