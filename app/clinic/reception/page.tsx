"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw, CheckSquare, CalendarPlus, List as ListIcon,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Bot, Phone, Plus, Clock, User,
} from "lucide-react";
import { clinicApi, Appointment, AppointmentStatus, Lead, ClinicRoom, DoctorStats } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import { useTranslation } from "react-i18next";
import "@/i18n";

// ─── Constants ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED:  "Запись",
  CHECKED_IN: "Прибыл",
  IN_PROGRESS:"На приёме",
  DONE:       "Готово",
  CANCELED:   "Отменён",
  NO_SHOW:    "Не явился",
};

const STATUS_STYLES: Record<AppointmentStatus, React.CSSProperties> = {
  SCHEDULED:   { background: "#eff6ff", color: "#2563eb" },
  CHECKED_IN:  { background: "#fefce8", color: "#ca8a04" },
  IN_PROGRESS: { background: "#fff7ed", color: "#ea580c" },
  DONE:        { background: "#f0fdf4", color: "#16a34a" },
  CANCELED:    { background: "#fef2f2", color: "#ef4444" },
  NO_SHOW:     { background: "#f1f5f9", color: "#94a3b8" },
};

// 4-px left-border color per status
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

function Skeleton({ height = 70, radius = 14 }: { height?: number; radius?: number }) {
  return (
    <div
      style={{
        height, borderRadius: radius,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, color: "#ef4444" }}>{message}</span>
      <button
        onClick={onRetry}
        style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
          color: "#ef4444", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <RefreshCw size={13} /> {t("clinic.reception.retry")}
      </button>
    </div>
  );
}

// ─── Shared card style ────────────────────────────────────────────────────────────

const baseCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

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
  const [showBooking, setShowBooking] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [calendarAppts, setCalendarAppts] = useState<Appointment[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const { toasts, toast, closeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Today label for header — deferred to client to avoid hydration mismatch
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
    e instanceof Error && (e.message.includes("прав") || e.message.toLowerCase().includes("forbidden"));

  const loadApps = useCallback(async () => {
    setLoadingApps(true); setErrApps(null);
    try { setAppointments(await clinicApi.appointments.today()); }
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

  useEffect(() => { loadApps(); loadLeads(); }, [loadApps, loadLeads]);

  useEffect(() => {
    clinicApi.rooms.list().then(setRooms).catch(() => setRooms([]));
    clinicApi.stats.doctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    try {
      const list = await clinicApi.appointments.list({ date: fmtDateISO(calendarDate) });
      setCalendarAppts(list);
    } catch {
      setCalendarAppts([]);
    } finally {
      setLoadingCalendar(false);
    }
  }, [calendarDate]);

  useEffect(() => {
    if (viewMode === "calendar") loadCalendar();
  }, [viewMode, loadCalendar]);

  useEffect(() => {
    const id = setInterval(loadApps, 30000);
    return () => clearInterval(id);
  }, [loadApps]);

  async function handleCheckin(id: string) {
    setCheckingIn(id);
    try {
      await clinicApi.appointments.checkin(id);
      await loadApps();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.reception.errorLoad"));
    } finally {
      setCheckingIn(null);
    }
  }

  const waiting    = appointments.filter((a) => ["SCHEDULED", "CHECKED_IN"].includes(a.status)).length;
  const inProgress = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const done       = appointments.filter((a) => a.status === "DONE").length;

  // ─── Calendar helpers ──────────────────────────────────────────────────────────

  const timeSlots = useMemo(() => {
    const arr: string[] = [];
    for (let h = 8; h < 20; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    arr.push("20:00");
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
    const base = 8 * 60;
    if (total < base) return 0;
    if (total > 20 * 60) return timeSlots.length - 1;
    return Math.floor((total - base) / 30);
  };

  const CAL_STATUS_COLORS: Record<AppointmentStatus, { bg: string; bd: string; fg: string }> = {
    SCHEDULED:   { bg: "#ccfbf1", bd: "#14b8a6", fg: "#0f766e" },
    CHECKED_IN:  { bg: "#fef3c7", bd: "#f59e0b", fg: "#b45309" },
    IN_PROGRESS: { bg: "#dbeafe", bd: "#3b82f6", fg: "#1d4ed8" },
    DONE:        { bg: "#dcfce7", bd: "#22c55e", fg: "#15803d" },
    CANCELED:    { bg: "#fee2e2", bd: "#ef4444", fg: "#b91c1c" },
    NO_SHOW:     { bg: "#f1f5f9", bd: "#94a3b8", fg: "#475569" },
  };

  const shiftDate = (days: number) => {
    const d = new Date(calendarDate);
    d.setDate(d.getDate() + days);
    setCalendarDate(d);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        .appt-card {
          transition: box-shadow 150ms ease, border-color 150ms ease;
        }
        .appt-card:hover {
          box-shadow: 0 4px 12px rgba(13,148,136,0.10) !important;
          border-color: #0d9488 !important;
        }
        .lead-card {
          transition: box-shadow 150ms ease;
        }
        .lead-card:hover {
          box-shadow: 0 4px 10px rgba(15,23,42,0.08) !important;
        }
        .toggle-btn { transition: background 150ms ease, color 150ms ease; }

        @media (max-width: 900px) { .reception-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 700px) {
          .calendar-grid { font-size: 11px; }
          .stat-strip { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        {/* Title + date */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
            {t("clinic.reception.title")}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0", textTransform: "capitalize" }}>
            {todayLabel}
          </p>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Pill toggle */}
          <div style={{
            display: "inline-flex", background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 99, padding: 3, gap: 2,
          }}>
            {([
              { k: "list",     labelKey: "clinic.reception.list",     Icon: ListIcon },
              { k: "calendar", labelKey: "clinic.reception.calendar", Icon: CalendarIcon },
            ] as const).map(({ k, labelKey, Icon }) => {
              const active = viewMode === k;
              return (
                <button
                  key={k}
                  className="toggle-btn"
                  onClick={() => setViewMode(k)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700,
                    border: "none",
                    background: active ? "#0d9488" : "transparent",
                    color: active ? "#fff" : "#64748b",
                  }}
                >
                  <Icon size={14} /> {t(labelKey)}
                </button>
              );
            })}
          </div>

          {/* Book button */}
          <button
            onClick={() => setShowBooking(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
              background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 700,
              borderRadius: 10, padding: "10px 18px", border: "none",
              minHeight: 44, transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#0f766e")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0d9488")}
          >
            <Plus size={16} /> {t("clinic.reception.bookPatient")}
          </button>
        </div>
      </div>

      {/* Quick stats strip */}
      <div
        className="stat-strip"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}
      >
        {([
          {
            labelKey: "clinic.reception.waiting", value: waiting,
            bg: "#fffbeb", border: "#fde68a", numColor: "#0d9488", labelColor: "#92400e",
          },
          {
            labelKey: "clinic.reception.inProgress", value: inProgress,
            bg: "#eff6ff", border: "#bfdbfe", numColor: "#2563eb", labelColor: "#1e40af",
          },
          {
            labelKey: "clinic.reception.done", value: done,
            bg: "#f0fdf4", border: "#bbf7d0", numColor: "#16a34a", labelColor: "#14532d",
          },
        ] as const).map(({ labelKey, value, bg, border, numColor, labelColor }) => (
          <div
            key={labelKey}
            style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 14, padding: "16px 20px",
              display: "flex", flexDirection: "column", alignItems: "center",
              minHeight: 80, justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 900, color: numColor, lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: labelColor, marginTop: 5 }}>
              {t(labelKey)}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <div style={{ ...baseCard, padding: 16, marginBottom: 24 }}>
          {/* Date navigator */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14, flexWrap: "wrap", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => shiftDate(-1)}
                style={{
                  padding: 7, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", display: "flex",
                }}
                aria-label={t("clinic.reception.prevDay")}
              >
                <ChevronLeft size={16} color="#475569" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#0f766e",
                }}
              >
                {t("clinic.reception.todayBtn")}
              </button>
              <button
                onClick={() => shiftDate(1)}
                style={{
                  padding: 7, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", display: "flex",
                }}
                aria-label={t("clinic.reception.nextDay")}
              >
                <ChevronRight size={16} color="#475569" />
              </button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "capitalize" }}>
              {mounted ? fmtDateRu(calendarDate) : ""}
            </div>
            <button
              onClick={loadCalendar}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#64748b", display: "flex", alignItems: "center", gap: 4, fontSize: 12,
              }}
            >
              <RefreshCw size={13} /> {t("clinic.reception.update")}
            </button>
          </div>

          {loadingCalendar ? (
            <Skeleton height={300} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div
                className="calendar-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: `70px repeat(${calendarColumns.length}, minmax(150px, 1fr))`,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  minWidth: calendarColumns.length > 1 ? 70 + calendarColumns.length * 150 : undefined,
                }}
              >
                {/* Header row */}
                <div style={{
                  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
                  padding: "8px 6px", fontSize: 11, fontWeight: 700, color: "#64748b",
                }}>
                  {t("clinic.reception.time")}
                </div>
                {calendarColumns.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
                      borderLeft: "1px solid #e2e8f0", padding: "8px 10px",
                      fontSize: 12, fontWeight: 700, color: "#0f172a",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {c.label}
                  </div>
                ))}

                {/* Body rows */}
                {timeSlots.map((slot, rowIdx) => (
                  <div key={`row-${slot}`} style={{ display: "contents" }}>
                    <div style={{
                      borderTop: rowIdx === 0 ? "none" : "1px dashed #f1f5f9",
                      padding: "6px 6px", fontSize: 11, fontWeight: 600,
                      color: "#94a3b8", background: "#fafbfc",
                    }}>
                      {slot}
                    </div>
                    {calendarColumns.map((c) => {
                      const cellAppts = calendarAppts.filter(
                        (a) => columnKey(a) === c.id && slotIndexFor(a.time) === rowIdx
                      );
                      return (
                        <div
                          key={`${c.id}-${slot}`}
                          style={{
                            borderTop: rowIdx === 0 ? "none" : "1px dashed #f1f5f9",
                            borderLeft: "1px solid #f1f5f9",
                            padding: 4, minHeight: 34,
                            display: "flex", flexDirection: "column", gap: 3,
                          }}
                        >
                          {cellAppts.map((a) => {
                            const col = CAL_STATUS_COLORS[a.status as AppointmentStatus];
                            return (
                              <button
                                key={a.id}
                                onClick={() => setSelectedAppt(a)}
                                style={{
                                  textAlign: "left", cursor: "pointer",
                                  background: col.bg, border: `1px solid ${col.bd}`, color: col.fg,
                                  borderRadius: 6, padding: "4px 6px", fontSize: 11, fontWeight: 600,
                                  lineHeight: 1.2,
                                }}
                                title={`${a.time} · ${a.patientName ?? a.patientPhone} · ${STATUS_LABELS[a.status as AppointmentStatus]}`}
                              >
                                <div style={{ fontWeight: 800 }}>{a.time}</div>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {a.patientName ?? a.patientPhone}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontSize: 11, color: "#64748b" }}>
            {(Object.keys(CAL_STATUS_COLORS) as AppointmentStatus[]).map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 3,
                  background: CAL_STATUS_COLORS[s].bg, border: `1px solid ${CAL_STATUS_COLORS[s].bd}`,
                }} />
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
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 400 }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
              {t("clinic.reception.appointment")} · {selectedAppt.time}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#334155" }}>
              <div><b>{t("clinic.reception.patient")}:</b> {selectedAppt.patientName ?? "—"}</div>
              <div><b>{t("clinic.reception.phone")}:</b> {selectedAppt.patientPhone}</div>
              <div><b>{t("clinic.reception.date")}:</b> {selectedAppt.date.split("-").reverse().join(".")}</div>
              <div><b>{t("clinic.reception.room")}:</b> {rooms.find((r) => r.id === selectedAppt.roomId)?.name ?? selectedAppt.roomId}</div>
              <div><b>{t("clinic.reception.doctor")}:</b> {doctors.find((d) => d.doctorId === selectedAppt.doctorId)?.doctorName ?? selectedAppt.doctorId}</div>
              <div><b>{t("clinic.reception.payment")}:</b> {PAYMENT_LABELS[selectedAppt.paymentType ?? ""] ?? selectedAppt.paymentType ?? "—"}</div>
              <div>
                <b>{t("clinic.reception.status")}:</b>{" "}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, ...STATUS_STYLES[selectedAppt.status as AppointmentStatus] }}>
                  {STATUS_LABELS[selectedAppt.status as AppointmentStatus]}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#475569",
                }}
              >
                {t("clinic.reception.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div
          className="reception-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}
        >
          {/* Left: appointments list */}
          <div>
            {/* Section header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {t("clinic.reception.todayAppointments")}
              </h2>
              <button
                onClick={loadApps}
                style={{
                  display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                  background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 600,
                }}
              >
                <RefreshCw size={13} /> {t("clinic.reception.refresh")}
              </button>
            </div>

            {errApps && (
              <div style={{ marginBottom: 14 }}>
                <ErrorBanner message={errApps} onRetry={loadApps} />
              </div>
            )}

            {/* Shimmer skeletons */}
            {loadingApps ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={76} />)}
              </div>
            ) : appointments.length === 0 ? (
              <div style={{ ...baseCard, padding: 50, textAlign: "center" }}>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>{t("clinic.reception.noAppointments")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {appointments
                  .slice()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((app) => {
                    const st = app.status as AppointmentStatus;
                    const canCheckin = st === "SCHEDULED";
                    const isLoading = checkingIn === app.id;
                    const accentColor = STATUS_ACCENT[st];

                    return (
                      <div
                        key={app.id}
                        className="appt-card"
                        style={{
                          ...baseCard,
                          borderLeft: `4px solid ${accentColor}`,
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        {/* Time column */}
                        <div style={{
                          flexShrink: 0, width: 52, textAlign: "center",
                        }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0d9488", lineHeight: 1 }}>
                            {app.time}
                          </div>
                          <Clock size={11} color="#94a3b8" style={{ marginTop: 3 }} />
                        </div>

                        {/* Divider */}
                        <div style={{
                          width: 1, alignSelf: "stretch", background: "#f1f5f9", flexShrink: 0,
                        }} />

                        {/* Patient info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6, marginBottom: 2,
                          }}>
                            <User size={13} color="#94a3b8" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {app.patientName ?? app.patientPhone}
                            </span>
                          </div>
                          {app.patientName && (
                            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <Phone size={11} color="#94a3b8" />
                              {app.patientPhone}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {PAYMENT_LABELS[app.paymentType ?? ""] ?? app.paymentType ?? "—"}
                          </div>
                        </div>

                        {/* Status + action */}
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0,
                        }}>
                          {/* Status pill */}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "3px 10px",
                            borderRadius: 99, whiteSpace: "nowrap",
                            ...STATUS_STYLES[st],
                          }}>
                            {STATUS_LABELS[st]}
                          </span>

                          {/* Check In button — only for SCHEDULED */}
                          {canCheckin && (
                            <button
                              onClick={() => handleCheckin(app.id)}
                              disabled={isLoading}
                              style={{
                                display: "flex", alignItems: "center", gap: 5, cursor: isLoading ? "not-allowed" : "pointer",
                                padding: "5px 12px", minHeight: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                                background: isLoading ? "#e2e8f0" : "#0d9488",
                                color: isLoading ? "#94a3b8" : "#fff",
                                border: "none",
                                opacity: isLoading ? 0.7 : 1,
                                transition: "background 150ms ease",
                              }}
                            >
                              <CheckSquare size={13} />
                              {isLoading ? "..." : "Check In"}
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
            {/* Sidebar header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {t("clinic.reception.newAiLeads")}
              </h2>
              {leads.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 99, background: "#ef4444", color: "#fff",
                  lineHeight: 1.4,
                }}>
                  {leads.length}
                </span>
              )}
            </div>

            {errLeads && (
              <div style={{ marginBottom: 14 }}>
                <ErrorBanner message={errLeads} onRetry={loadLeads} />
              </div>
            )}

            {loadingLeads ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height={72} />)}
              </div>
            ) : leads.length === 0 ? (
              /* Empty state */
              <div style={{
                ...baseCard, padding: "40px 20px", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <Bot size={32} color="#cbd5e1" />
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>{t("clinic.reception.noLeads")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="lead-card"
                    style={{
                      ...baseCard,
                      padding: "12px 14px",
                    }}
                  >
                    {/* Name + time */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {lead.name ?? t("clinic.reception.withoutName")}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>

                    {/* Phone as teal link */}
                    <a
                      href={`tel:${lead.phone}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 13, color: "#0d9488", fontWeight: 600,
                        textDecoration: "none", marginBottom: lead.notes ? 4 : 8,
                      }}
                    >
                      <Phone size={12} />
                      {lead.phone}
                    </a>

                    {/* Notes (truncated) */}
                    {lead.notes && (
                      <p style={{
                        fontSize: 11, color: "#94a3b8", margin: "0 0 8px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {lead.notes}
                      </p>
                    )}

                    {/* Book button — purple outline */}
                    <button
                      onClick={() => setShowBooking(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                        width: "100%", justifyContent: "center",
                        padding: "5px 10px", minHeight: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: "transparent", color: "#9333ea",
                        border: "1px solid #9333ea",
                        transition: "background 150ms ease, color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#9333ea";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#9333ea";
                      }}
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

      {/* Booking modal */}
      {showBooking && (
        <BookingModal
          open={showBooking}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); loadApps(); }}
        />
      )}
    </div>
  );
}
