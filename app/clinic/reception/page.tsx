"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw, CheckSquare, CalendarPlus, List as ListIcon,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Bot, Phone, Plus, Clock, User, PlayCircle, CheckCircle, X,
} from "lucide-react";
import { clinicApi, getClinicRole, Appointment, AppointmentStatus, Lead, ClinicRoom, DoctorStats, WaitlistEntry } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import { useTranslation } from "react-i18next";
import "@/i18n";

// ─── Calendar constants ───────────────────────────────────────────────────────
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR   = 20;

// ─── Constants ────────────────────────────────────────────────────────────────

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

function timeAgo(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return t("clinic.reception.timeAgo.justNow");
  if (diff < 60) return t("clinic.reception.timeAgo.minAgo", { n: diff });
  const h = Math.floor(diff / 60);
  if (h < 24) return t("clinic.reception.timeAgo.hAgo", { n: h });
  return t("clinic.reception.timeAgo.dAgo", { n: Math.floor(h / 24) });
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
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);

  // Manage appointment modal (notes / reschedule / reassign doctor)
  const [manageModal, setManageModal] = useState<Appointment | null>(null);
  const [manageTab, setManageTab] = useState<"notes" | "reschedule" | "doctor">("notes");
  const [manageNotes, setManageNotes] = useState("");
  const [manageDate, setManageDate] = useState("");
  const [manageTime, setManageTime] = useState("");
  const [manageDoctorId, setManageDoctorId] = useState("");
  const [manageSaving, setManageSaving] = useState(false);

  const [paymentTypeModal, setPaymentTypeModal] = useState<string | null>(null);
  const [initiatingPayment, setInitiatingPayment] = useState<string | null>(null);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<Set<string>>(new Set());
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [calendarAppts, setCalendarAppts] = useState<Appointment[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [finalPriceModal, setFinalPriceModal] = useState<{ apptId: string; priceMin: number; priceMax: number } | null>(null);
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [finalPriceLoading, setFinalPriceLoading] = useState(false);
  const { toasts, toast, closeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Prefill for BookingModal when clicking "+" in calendar (CLINIC-R3)
  const [bookingPrefill, setBookingPrefill] = useState<{ date: string; time: string; doctorId: string | null; roomId: string | null; phone?: string; patientName?: string } | null>(null);

  // DENT-1: follow-up suggestion after canal treatment → filling next day
  const [followUpAppt, setFollowUpAppt] = useState<Appointment | null>(null);

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
  }, [viewMode, loadCalendar, doctorIdFilter, calendarDate]);

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

  function getTomorrowISO(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  async function handleUpdateStatus(id: string, status: AppointmentStatus) {
    if (status === "DONE") { setPaymentTypeModal(id); return; }
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

  async function handleCompleteWithPayment(id: string, paymentType: string) {
    setPaymentTypeModal(null);
    setUpdatingStatus(id);
    try {
      await clinicApi.appointments.setPaymentType(id, paymentType);
      await clinicApi.appointments.updateStatus(id, "DONE");
      await loadApps(doctorIdFilter ?? null);
      const appt = appointments.find((a) => a.id === id);
      if (appt) setFollowUpAppt({ ...appt, status: "DONE" });
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

  // Manage appointment: notes / reschedule / reassign doctor
  function openManage(app: Appointment, tab: "notes" | "reschedule" | "doctor") {
    setManageModal(app);
    setManageTab(tab);
    setManageNotes(app.notes ?? "");
    setManageDate(app.date);
    setManageTime(app.time);
    setManageDoctorId(app.doctorId ?? "");
    setOpenMoreMenu(null);
  }

  async function handleManageSave() {
    if (!manageModal) return;
    setManageSaving(true);
    try {
      if (manageTab === "notes") {
        await clinicApi.appointments.updateNotes(manageModal.id, manageNotes);
        toast.success(t("clinic.common.saved"));
      } else if (manageTab === "reschedule") {
        await clinicApi.appointments.reschedule(manageModal.id, manageDate, manageTime);
        toast.success(t("clinic.common.saved"));
      } else if (manageTab === "doctor") {
        await clinicApi.appointments.reassignDoctor(manageModal.id, manageDoctorId);
        toast.success(t("clinic.common.saved"));
      }
      setManageModal(null);
      await loadApps(doctorIdFilter ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("clinic.common.error");
      if (msg === "SLOT_TAKEN") {
        toast.error(t("clinic.reception.slotTaken"));
      } else {
        toast.error(msg);
      }
    } finally {
      setManageSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Manage appointment modal: notes / reschedule / reassign doctor */}
      {manageModal && (
        <Modal onClose={() => setManageModal(null)}>
          <h3 className="mb-4 text-base font-extrabold text-slate-950">
            {manageModal.patientName ?? manageModal.patientPhone} — {manageModal.time}
          </h3>
          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {([
              { key: "notes", label: t("clinic.reception.tabNotes") },
              { key: "reschedule", label: t("clinic.reception.tabReschedule") },
              { key: "doctor", label: t("clinic.reception.tabDoctor") },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setManageTab(tab.key)}
                className={[
                  "flex-1 rounded-lg py-2 text-xs font-bold transition",
                  manageTab === tab.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notes tab */}
          {manageTab === "notes" && (
            <div>
              <p className="mb-2 text-xs text-slate-500">{t("clinic.reception.notesHint")}</p>
              <textarea
                value={manageNotes}
                onChange={(e) => setManageNotes(e.target.value)}
                placeholder={t("clinic.reception.notesPlaceholder")}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100"
              />
            </div>
          )}

          {/* Reschedule tab */}
          {manageTab === "reschedule" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("clinic.reception.newDate")}</label>
                <input
                  type="date"
                  value={manageDate}
                  onChange={(e) => setManageDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("clinic.reception.newTime")}</label>
                <input
                  type="time"
                  value={manageTime}
                  onChange={(e) => setManageTime(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                />
              </div>
            </div>
          )}

          {/* Doctor reassign tab */}
          {manageTab === "doctor" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("clinic.reception.newDoctor")}</label>
              <select
                value={manageDoctorId}
                onChange={(e) => setManageDoctorId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-teal-400"
              >
                <option value="">{t("clinic.reception.selectDoctor")}</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.doctorName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleManageSave}
              disabled={manageSaving}
              className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {manageSaving ? t("clinic.common.saving") : t("clinic.common.save")}
            </button>
            <button
              onClick={() => setManageModal(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              {t("clinic.common.cancel")}
            </button>
          </div>
        </Modal>
      )}

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

      {/* DENT-1: Follow-up booking suggestion after canal treatment */}
      {followUpAppt && (
        <Modal onClose={() => setFollowUpAppt(null)}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
              <CalendarPlus size={26} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-950">Записать на следующий приём?</h3>
              <p className="mt-1 text-sm text-slate-500">
                Пациент <span className="font-bold text-slate-800">{followUpAppt.patientName ?? followUpAppt.patientPhone}</span> завершил приём.
                Записать на следующий день?
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={() => {
                  setFollowUpAppt(null);
                  setBookingPrefill({
                    date: getTomorrowISO(),
                    time: followUpAppt.time,
                    doctorId: followUpAppt.doctorId,
                    roomId: followUpAppt.roomId,
                    phone: followUpAppt.patientPhone,
                    patientName: followUpAppt.patientName ?? followUpAppt.patientPhone,
                  });
                  setShowBooking(true);
                }}
                className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                Записать на завтра
              </button>
              <button
                onClick={() => setFollowUpAppt(null)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                Не сейчас
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Calendar picker close overlay (CLINIC-R5) */}
      {showCalPicker && (
        <div onClick={() => setShowCalPicker(false)} className="fixed inset-0 z-[299]" />
      )}

      {/* Payment type modal */}
      {paymentTypeModal && (
        <Modal onClose={() => setPaymentTypeModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                <CheckSquare size={22} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-950">{t("clinic.reception.completeTitle") || "Qabulni yakunlash"}</h3>
                <p className="text-[12px] text-slate-400">{t("clinic.reception.selectPayment") || "To'lov turini tanlang"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: "CASH",   icon: "💵", label: t("clinic.reception.paymentLabels.CASH") || "Naqd" },
                { type: "CARD",   icon: "💳", label: t("clinic.reception.paymentLabels.CARD") || "Karta" },
                { type: "ONLINE", icon: "📱", label: t("clinic.reception.paymentLabels.ONLINE") || "Online" },
              ] as { type: string; icon: string; label: string }[]).map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => handleCompleteWithPayment(paymentTypeModal, type)}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-100 bg-white p-3 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <span className="text-2xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setPaymentTypeModal(null)} className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-50">
              {t("clinic.common.cancel") || "Bekor qilish"}
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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
              <CalendarPlus size={12} />
              Clinic OS
            </div>
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
                  const monthNames = t("clinic.reception.months", { returnObjects: true }) as string[];
                  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : i - offset + 1);
                  return (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-[300] w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="mb-2 flex items-center justify-between">
                        <button onClick={() => setPickerViewDate(new Date(y - 1, m, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">‹‹</button>
                        <button onClick={() => setPickerViewDate(new Date(y, m - 1, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">‹</button>
                        <span className="text-sm font-extrabold text-slate-950">{monthNames[m]} {y}</span>
                        <button onClick={() => setPickerViewDate(new Date(y, m + 1, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">›</button>
                        <button onClick={() => setPickerViewDate(new Date(y + 1, m, 1))} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50">››</button>
                      </div>
                      <div className="mb-1 grid grid-cols-7 gap-0.5">
                        {(t("clinic.reception.weekdaysShort", { returnObjects: true }) as string[]).map((d) => (
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
                    <div className={`px-2 py-1.5 text-[11px] font-semibold text-slate-400 border-t border-slate-200 bg-slate-50`}>
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
                          className="flex min-h-[36px] flex-col gap-0.5 border-t border-l border-slate-200 p-1 bg-white hover:bg-slate-50/60 transition-colors"
                        >
                          {cellAppts.map((a) => {
                            const col = CAL_STATUS_COLORS[a.status as AppointmentStatus];
                            return (
                              <div key={a.id} className="relative group/card">
                                <button
                                  onClick={() => openManage(a, "notes")}
                                  className="w-full rounded-md p-1 text-left text-[11px] font-semibold leading-tight"
                                  style={{ background: col.bg, border: `1px solid ${col.bd}`, color: col.fg }}
                                  title={`${a.time} · ${a.patientName ?? a.patientPhone} · ${t(`clinic.reception.statusLabels.${a.status as AppointmentStatus}`)}`}
                                >
                                  <div className="font-extrabold">{a.time}</div>
                                  {a.patientName && <div className="truncate">{a.patientName}</div>}
                                  <div className="truncate opacity-80">{a.patientPhone}</div>
                                </button>
                                {a.status === "SCHEDULED" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCheckin(a.id); }}
                                    disabled={checkingIn === a.id}
                                    className="absolute top-0.5 right-0.5 hidden group-hover/card:flex h-[18px] w-[18px] items-center justify-center rounded bg-teal-500 text-white transition hover:bg-teal-600"
                                    title={t("clinic.reception.checkin")}
                                  >
                                    <CheckSquare size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {cellAppts.length === 0 && (() => {
                            const isToday = fmtDateISO(calendarDate) === fmtDateISO(new Date());
                            const [sh, sm] = slot.split(":").map(Number);
                            const slotMin = sh * 60 + sm;
                            const now = new Date();
                            const nowMin = now.getHours() * 60 + now.getMinutes();
                            const isPast = isToday && slotMin <= nowMin;
                            if (isPast) return <div className="min-h-[26px]" />;
                            return (
                              <button
                                onClick={() => {
                                  setBookingPrefill({
                                    date: fmtDateISO(calendarDate),
                                    time: slot,
                                    doctorId: doctorIdForCol,
                                    roomId: rooms.length > 0 ? c.id : null,
                                  });
                                  setShowBooking(true);
                                }}
                                className="group flex min-h-[26px] w-full items-center justify-center rounded transition hover:bg-teal-50"
                              >
                                <Plus size={13} className="text-slate-200 group-hover:text-teal-400 transition-colors" />
                              </button>
                            );
                          })()}
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
                {t(`clinic.reception.statusLabels.${s}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Calendar appointment detail modal */}

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
                          {app.notes && (
                            <div className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                              <span className="shrink-0">💬</span>
                              <span className="truncate">{app.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Status + actions */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[st]}`}>
                            {t(`clinic.reception.statusLabels.${st}`)}
                          </span>

                          {/* 3 main action buttons based on status */}
                          {!["CANCELED", "NO_SHOW", "DONE"].includes(st) && (
                            <div className="flex items-center gap-1.5">

                              {/* Keldi (SCHEDULED → CHECKED_IN) */}
                              {st === "SCHEDULED" && (
                                <button
                                  onClick={() => handleCheckin(app.id)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                                >
                                  <CheckSquare size={12} />
                                  {isLoading ? "..." : t("clinic.reception.arrived")}
                                </button>
                              )}

                              {/* Tayyor (CHECKED_IN → DONE or IN_PROGRESS → DONE) */}
                              {(st === "CHECKED_IN" || st === "IN_PROGRESS") && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "DONE")}
                                  disabled={updatingStatus === app.id}
                                  className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <CheckCircle size={12} />
                                  {updatingStatus === app.id ? "..." : t("clinic.reception.ready")}
                                </button>
                              )}

                              {/* Kelmadi (SCHEDULED → NO_SHOW) */}
                              {st === "SCHEDULED" && (
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "NO_SHOW")}
                                  disabled={updatingStatus === app.id}
                                  className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                >
                                  <X size={12} />
                                  {updatingStatus === app.id ? "..." : t("clinic.reception.noShow")}
                                </button>
                              )}

                              {/* More menu (⋯) */}
                              {clinicUser?.role !== "DOCTOR" && (
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenMoreMenu(openMoreMenu === app.id ? null : app.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                                  >
                                    <span className="text-base font-bold leading-none">⋯</span>
                                  </button>
                                  {openMoreMenu === app.id && (
                                    <div className="absolute right-0 top-9 z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                      {/* Start reception */}
                                      {st === "SCHEDULED" && (
                                        <button
                                          onClick={() => { handleCheckin(app.id); setOpenMoreMenu(null); }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <PlayCircle size={14} className="text-blue-500" />
                                          {t("clinic.reception.startReception")}
                                        </button>
                                      )}
                                      {st === "CHECKED_IN" && (
                                        <button
                                          onClick={() => { handleUpdateStatus(app.id, "IN_PROGRESS"); setOpenMoreMenu(null); }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <PlayCircle size={14} className="text-blue-500" />
                                          {t("clinic.reception.startReception")}
                                        </button>
                                      )}
                                      {/* Add comment */}
                                      <button
                                        onClick={() => openManage(app, "notes")}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                      >
                                        <span className="text-amber-500">💬</span>
                                        {t("clinic.reception.addNote")}
                                      </button>
                                      {/* Reschedule */}
                                      {!["DONE", "CANCELED", "NO_SHOW"].includes(st) && (
                                        <button
                                          onClick={() => openManage(app, "reschedule")}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <span className="text-sky-500">📅</span>
                                          {t("clinic.reception.reschedule")}
                                        </button>
                                      )}
                                      {/* Reassign doctor */}
                                      {clinicUser?.role !== "DOCTOR" && !["DONE", "CANCELED", "NO_SHOW"].includes(st) && (
                                        <button
                                          onClick={() => openManage(app, "doctor")}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <span className="text-violet-500">👨‍⚕️</span>
                                          {t("clinic.reception.changeDoctor")}
                                        </button>
                                      )}
                                      {/* Cancel */}
                                      {!["DONE", "CANCELED", "NO_SHOW"].includes(st) && (
                                        <button
                                          onClick={() => { handleUpdateStatus(app.id, "CANCELED"); setOpenMoreMenu(null); }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                        >
                                          <X size={14} />
                                          {t("clinic.reception.cancel")}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
                           (clinicUser.role !== "DOCTOR" || app.doctorId === clinicUser.id) && (
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
                      <span className="text-[11px] text-slate-400">{timeAgo(lead.createdAt, t)}</span>
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
          onClose={() => { setShowBooking(false); setBookingPrefill(null); }}
          onSuccess={() => {
            setShowBooking(false); setBookingPrefill(null);
            loadApps(doctorIdFilter ?? null);
            if (viewMode === "calendar") loadCalendar(doctorIdFilter ?? null);
          }}
          prefillPhone={bookingPrefill?.phone}
          prefillPatientName={bookingPrefill?.patientName}
          prefillDate={bookingPrefill?.date}
          prefillTime={bookingPrefill?.time}
          prefillDoctorId={bookingPrefill?.doctorId ?? undefined}
          prefillRoomId={bookingPrefill?.roomId ?? undefined}
        />
      )}
    </div>
  );
}
