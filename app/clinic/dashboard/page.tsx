"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, CheckCircle, Clock, Activity, TrendingUp, RefreshCw, Download, ChevronDown } from "lucide-react";
import { clinicApi, StatsOverview, MonthlyStats, DoctorStats, Appointment, Lead, ClinicRoom, ClinicStaff } from "@/lib/clinicApi";
import { useClinic } from "@/context/ClinicContext";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n"); // BOM for Excel Cyrillic
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const APPOINTMENT_STATUS_RU: Record<string, string> = {
  SCHEDULED: "Запланирован",
  CHECKED_IN: "Зарегистрирован",
  IN_PROGRESS: "На приёме",
  DONE: "Завершён",
  CANCELED: "Отменён",
  NO_SHOW: "Не явился",
};

const PAYMENT_TYPE_RU: Record<string, string> = {
  CASH: "Наличные",
  TERMINAL: "Терминал",
  ONLINE: "Онлайн",
};

const LEAD_STATUS_RU: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  DONE: "Завершён",
  CANCELED: "Отменён",
};

// ─── Onboarding checklist ─────────────────────────────────────────────────────

const ONBOARDING_KEY = "clinic_onboarding_dismissed";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

function OnboardingChecklist() {
  const { clinic } = useClinic();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  });
  const [hasStaff, setHasStaff] = useState<boolean | null>(null);
  const [hasRooms, setHasRooms] = useState<boolean | null>(null);

  useEffect(() => {
    if (dismissed) return;
    clinicApi.staff.list()
      .then((s) => setHasStaff(s.length > 0))
      .catch(() => setHasStaff(false));
    clinicApi.rooms.list()
      .then((r) => setHasRooms(r.length > 0))
      .catch(() => setHasRooms(false));
  }, [dismissed]);

  if (dismissed) return null;
  if (hasStaff === null || hasRooms === null) return null; // wait for data

  const profileDone = !!(clinic?.name && clinic?.address && clinic?.phone);

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Заполните профиль клиники",
      description: "Название, адрес, телефон — клиенты увидят эту информацию",
      href: "/clinic/settings",
      done: profileDone,
    },
    {
      id: "staff",
      title: "Добавьте врача",
      description: "Пригласите первого врача или сотрудника ресепшна",
      href: "/clinic/staff",
      done: hasStaff,
    },
    {
      id: "rooms",
      title: "Создайте кабинет",
      description: "Укажите кабинеты, в которых принимают врачи",
      href: "/clinic/rooms",
      done: hasRooms,
    },
    {
      id: "schedule",
      title: "Назначьте расписание",
      description: "Привяжите врача к кабинету и задайте рабочие часы",
      href: "/clinic/rooms",
      done: hasRooms && hasStaff,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setDismissed(true);
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1.5px solid #ccfbf1",
      padding: "20px 24px", marginBottom: 28,
      boxShadow: "0 4px 20px rgba(13,148,136,0.08)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, marginBottom: 4 }}>
            {allDone ? "Клиника готова к работе! 🎉" : "Настройте клинику"}
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            {allDone
              ? "Все шаги выполнены. Вы можете принимать пациентов."
              : `Выполнено ${doneCount} из ${steps.length} шагов`}
          </p>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", fontSize: 20, lineHeight: 1, padding: "0 0 0 12px",
            flexShrink: 0,
          }}
          title="Закрыть"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          background: allDone ? "#16a34a" : "linear-gradient(90deg, #0d9488, #14b8a6)",
          width: `${pct}%`, transition: "width 0.5s ease",
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {steps.map((step) => (
          <a
            key={step.id}
            href={step.done ? undefined : step.href}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "14px 16px", borderRadius: 12, textDecoration: "none",
              border: `1.5px solid ${step.done ? "#bbf7d0" : "#e2e8f0"}`,
              background: step.done ? "#f0fdf4" : "#f8fafc",
              cursor: step.done ? "default" : "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!step.done) (e.currentTarget as HTMLElement).style.borderColor = "#0d9488";
            }}
            onMouseLeave={(e) => {
              if (!step.done) (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
            }}
          >
            {/* Status circle */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: step.done ? "#16a34a" : "#e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              {step.done
                ? <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>
                : <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>{steps.indexOf(step) + 1}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700,
                color: step.done ? "#166534" : "#0f172a",
                margin: 0, marginBottom: 3,
              }}>
                {step.title}
              </p>
              <p style={{ fontSize: 12, color: step.done ? "#16a34a" : "#64748b", margin: 0, lineHeight: 1.4 }}>
                {step.done ? "Выполнено" : step.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {allDone && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={dismiss}
            style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
              border: "none", borderRadius: 8, padding: "8px 24px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Скрыть это сообщение
          </button>
        </div>
      )}
    </div>
  );
}

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Сегодня",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  DONE: "Завершён",
  CANCELED: "Отменён",
};

const LEAD_STATUS_STYLES: Record<string, React.CSSProperties> = {
  NEW:       { background: "#eff6ff", color: "#2563eb" },
  IN_PROGRESS: { background: "#fefce8", color: "#ca8a04" },
  DONE:      { background: "#f0fdf4", color: "#16a34a" },
  CANCELED:  { background: "#fef2f2", color: "#ef4444" },
};

function Skeleton({ height = 56, radius = 12 }: { height?: number; radius?: number }) {
  return (
    <div style={{
      height, borderRadius: radius, background: "#f1f5f9",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
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

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
}

function KpiCard({ icon, iconBg, value, label }: KpiCardProps) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 20px",
      border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [todayApps, setTodayApps] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // New KPI widgets: room occupancy (7d) + top doctors (30d)
  const [roomOccupancy, setRoomOccupancy] = useState<Array<{ roomId: string; roomName: string; percent: number; appointments: number }>>([]);
  const [topDoctors, setTopDoctors] = useState<Array<{ doctorId: string; name: string; done: number }>>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingTopDocs, setLoadingTopDocs] = useState(true);

  const [exportingCSV, setExportingCSV] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [errOverview, setErrOverview] = useState<string | null>(null);
  const [errMonthly, setErrMonthly] = useState<string | null>(null);
  const [errDoctors, setErrDoctors] = useState<string | null>(null);
  const [errQueue, setErrQueue] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [errRooms, setErrRooms] = useState<string | null>(null);
  const [errTopDocs, setErrTopDocs] = useState<string | null>(null);

  const fetchOverview = useCallback(async (p: Period) => {
    setLoadingOverview(true); setErrOverview(null);
    try { setOverview(await clinicApi.stats.overview(p)); }
    catch (e) { setErrOverview(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingOverview(false); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true); setErrMonthly(null);
    try { setMonthly(await clinicApi.stats.monthly()); }
    catch (e) { setErrMonthly(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingMonthly(false); }
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); setErrDoctors(null);
    try { setDoctors(await clinicApi.stats.doctors()); }
    catch (e) { setErrDoctors(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingDoctors(false); }
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true); setErrQueue(null);
    try { setTodayApps(await clinicApi.appointments.today()); }
    catch (e) { setErrQueue(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingQueue(false); }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({ limit: 5 });
      setLeads(res.data);
    }
    catch (e) { setErrLeads(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingLeads(false); }
  }, []);

  const fetchRoomOccupancy = useCallback(async () => {
    setLoadingRooms(true); setErrRooms(null);
    try {
      const rooms: ClinicRoom[] = await clinicApi.rooms.list();
      // last 7 days (including today)
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      const perDay = await Promise.all(days.map((date) => clinicApi.appointments.list({ date })));
      const all: Appointment[] = perDay.flat();
      // Assume workday = 8 hours = 8 slots per room per day → 56 slots per week
      const CAPACITY_PER_WEEK = 7 * 8;
      const counts = new Map<string, number>();
      for (const a of all) {
        if (a.status === "CANCELED" || a.status === "NO_SHOW") continue;
        counts.set(a.roomId, (counts.get(a.roomId) ?? 0) + 1);
      }
      const occ = rooms.map((r) => {
        const n = counts.get(r.id) ?? 0;
        return {
          roomId: r.id,
          roomName: r.name,
          appointments: n,
          percent: Math.min(100, Math.round((n / CAPACITY_PER_WEEK) * 100)),
        };
      }).sort((a, b) => b.percent - a.percent);
      setRoomOccupancy(occ);
    } catch (e) { setErrRooms(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingRooms(false); }
  }, []);

  const fetchTopDoctors = useCallback(async () => {
    setLoadingTopDocs(true); setErrTopDocs(null);
    try {
      const staff: ClinicStaff[] = await clinicApi.staff.list();
      const doctorMap = new Map(staff.filter((s) => s.role === "DOCTOR").map((s) => [s.id, s.name]));
      const days: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      const perDay = await Promise.all(days.map((date) => clinicApi.appointments.list({ date, status: "DONE" })));
      const all: Appointment[] = perDay.flat();
      const counts = new Map<string, number>();
      for (const a of all) {
        counts.set(a.doctorId, (counts.get(a.doctorId) ?? 0) + 1);
      }
      const top = Array.from(counts.entries())
        .map(([doctorId, done]) => ({ doctorId, name: doctorMap.get(doctorId) ?? "Врач", done }))
        .sort((a, b) => b.done - a.done)
        .slice(0, 5);
      setTopDoctors(top);
    } catch (e) { setErrTopDocs(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingTopDocs(false); }
  }, []);

  useEffect(() => { fetchOverview(period); }, [period, fetchOverview]);
  useEffect(() => {
    fetchMonthly(); fetchDoctors(); fetchLeads(); fetchQueue();
    fetchRoomOccupancy(); fetchTopDoctors();
  }, [fetchMonthly, fetchDoctors, fetchLeads, fetchQueue, fetchRoomOccupancy, fetchTopDoctors]);
  useEffect(() => {
    const id = setInterval(fetchQueue, 10000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  // Close export menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function exportAppointments() {
    setExportingCSV(true);
    setShowExportMenu(false);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const apps = await clinicApi.appointments.list({ date: today });
      const csv = buildCSV(
        ["Дата", "Время", "Пациент", "Телефон", "Оплата", "Статус"],
        apps.map((a) => [
          a.date,
          a.time,
          a.patientName ?? "",
          a.patientPhone,
          PAYMENT_TYPE_RU[a.paymentType] ?? a.paymentType,
          APPOINTMENT_STATUS_RU[a.status] ?? a.status,
        ])
      );
      triggerDownload(csv, `appointments_${today}.csv`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка экспорта");
    }
    setExportingCSV(false);
  }

  async function exportLeads() {
    setExportingCSV(true);
    setShowExportMenu(false);
    try {
      const res = await clinicApi.leads.list({ limit: 500 });
      const csv = buildCSV(
        ["Имя", "Телефон", "Статус", "Заметки", "Дата"],
        res.data.map((l) => [
          l.name ?? "",
          l.phone,
          LEAD_STATUS_RU[l.status] ?? l.status,
          l.notes ?? "",
          new Date(l.createdAt).toLocaleDateString("ru-RU"),
        ])
      );
      triggerDownload(csv, `leads_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка экспорта");
    }
    setExportingCSV(false);
  }

  function exportMonthly() {
    setShowExportMenu(false);
    if (monthly.length === 0) return;
    const csv = buildCSV(
      ["Месяц", "Приёмов", "Выручка (сум)"],
      monthly.map((m) => [m.month, m.appointments, m.revenue])
    );
    triggerDownload(csv, `monthly_stats_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const todayDate = new Date().toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const waiting = todayApps.filter((a) => ["SCHEDULED", "WAITING"].includes(a.status)).length;
  const inProgress = todayApps.filter((a) => ["CHECKED_IN", "IN_PROGRESS"].includes(a.status)).length;
  const done = todayApps.filter((a) => a.status === "DONE").length;
  const maxDoc = Math.max(...doctors.map((d) => d.appointments), 1);
  const maxMonth = Math.max(...monthly.map((m) => m.appointments), 1);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, padding: "20px 24px",
    border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  };

  const avatarColors = [
    { bg: "#eff6ff", color: "#2563eb" },
    { bg: "#faf5ff", color: "#9333ea" },
    { bg: "#f0fdf4", color: "#16a34a" },
    { bg: "#fff7ed", color: "#ea580c" },
    { bg: "#fdf2f8", color: "#db2777" },
  ];

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      <OnboardingChecklist />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#64748b", textTransform: "capitalize" }}>{todayDate}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Export dropdown */}
          <div ref={exportMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exportingCSV}
              style={{
                background: "#fff", color: "#0d9488",
                border: "1.5px solid #0d9488", borderRadius: 10,
                padding: "10px 14px", fontSize: 14, fontWeight: 700,
                cursor: exportingCSV ? "not-allowed" : "pointer",
                opacity: exportingCSV ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Download size={15} />
              {exportingCSV ? "Экспорт..." : "Экспорт"}
              <ChevronDown size={13} />
            </button>
            {showExportMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                minWidth: 210, zIndex: 100, overflow: "hidden",
              }}>
                {[
                  { label: "Записи (сегодня) .csv", onClick: exportAppointments },
                  { label: "Лиды Salomat AI .csv", onClick: exportLeads },
                  { label: "Помесячная статистика .csv", onClick: exportMonthly },
                ].map(({ label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "11px 16px", background: "none", border: "none",
                      fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button style={{
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "10px 20px",
            border: "none", cursor: "pointer",
          }}>
            + Записать пациента
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${period === p ? "#0d9488" : "#e2e8f0"}`,
            background: period === p ? "#f0fdfa" : "#fff",
            color: period === p ? "#0d9488" : "#475569",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {errOverview && <div style={{ marginBottom: 20 }}><ErrorBanner message={errOverview} onRetry={() => fetchOverview(period)} /></div>}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {loadingOverview ? (
          [1,2,3,4].map(i => (
            <div key={i} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ flex: 1 }}>
                  <Skeleton height={28} radius={6} />
                  <div style={{ marginTop: 6 }}><Skeleton height={14} radius={4} /></div>
                </div>
              </div>
            </div>
          ))
        ) : overview ? (
          <>
            <KpiCard icon={<Users size={22} color="#2563eb" />} iconBg="#eff6ff" value={overview.newPatients} label="Новых пациентов" />
            <KpiCard icon={<CheckCircle size={22} color="#16a34a" />} iconBg="#f0fdf4" value={overview.appointments} label="Всего приёмов" />
            <KpiCard icon={<TrendingUp size={22} color="#9333ea" />} iconBg="#faf5ff" value={`${overview.revenue.toLocaleString("ru-RU")} сум`} label="Выручка" />
            <KpiCard icon={<Activity size={22} color="#ea580c" />} iconBg="#fff7ed" value={`${overview.cancelRate}%`} label="Процент отмен" />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }} className="clinic-grid-stack">
        {/* Monthly */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Пациенты по месяцам</h2>
          {loadingMonthly ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} height={18} radius={6} />)}
            </div>
          ) : errMonthly ? (
            <ErrorBanner message={errMonthly} onRetry={fetchMonthly} />
          ) : monthly.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>Нет данных</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Месяц</th>
                  <th style={{ textAlign: "right", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Приёмов</th>
                  <th style={{ textAlign: "right", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Выручка</th>
                  <th style={{ width: 120, padding: "0 0 10px" }} />
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "9px 0", color: "#374151", fontWeight: 600 }}>{row.month}</td>
                    <td style={{ padding: "9px 0", textAlign: "right", color: "#374151" }}>{row.appointments}</td>
                    <td style={{ padding: "9px 0", textAlign: "right", color: "#374151" }}>{row.revenue.toLocaleString("ru-RU")} сум</td>
                    <td style={{ padding: "9px 0 9px 16px" }}>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "#0d9488", width: `${(row.appointments / maxMonth) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Queue */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Очередь сегодня</h2>
          {loadingQueue ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={60} />)}
            </div>
          ) : errQueue ? (
            <ErrorBanner message={errQueue} onRetry={fetchQueue} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { icon: <Clock size={20} color="#ca8a04" />, count: waiting, label: "Ожидают", bg: "#fefce8", color: "#92400e" },
                { icon: <Activity size={20} color="#2563eb" />, count: inProgress, label: "На приёме", bg: "#eff6ff", color: "#1e40af" },
                { icon: <CheckCircle size={20} color="#16a34a" />, count: done, label: "Готово", bg: "#f0fdf4", color: "#14532d" },
              ].map(({ icon, count, label, bg, color }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: "16px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {icon}
                  <span style={{ fontSize: 22, fontWeight: 800, color }}>{count}</span>
                  <span style={{ fontSize: 11, color, opacity: 0.8, lineHeight: 1.2 }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="clinic-grid-stack">
        {/* Doctors */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Врачи — активность</h2>
          {loadingDoctors ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={14} radius={4} />
                    <div style={{ marginTop: 6 }}><Skeleton height={6} radius={3} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : errDoctors ? (
            <ErrorBanner message={errDoctors} onRetry={fetchDoctors} />
          ) : doctors.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Нет данных</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {doctors.map((doc, idx) => {
                const c = avatarColors[idx % avatarColors.length];
                const pct = Math.round((doc.appointments / maxDoc) * 100);
                return (
                  <div key={doc.doctorId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: c.bg, color: c.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700,
                    }}>
                      {doc.doctorName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.doctorName}</span>
                        <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, marginLeft: 8 }}>{doc.appointments} приёмов</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "#0d9488", width: `${pct}%`, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leads */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Последние лиды — Salomat AI</h2>
          {loadingLeads ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} height={52} />)}
            </div>
          ) : errLeads ? (
            <ErrorBanner message={errLeads} onRetry={fetchLeads} />
          ) : leads.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Нет лидов</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {leads.map((lead) => {
                const summary = lead.notes ? (lead.notes.length > 60 ? lead.notes.slice(0, 60) + "…" : lead.notes) : null;
                const statusStyle = LEAD_STATUS_STYLES[lead.status] ?? { background: "#f1f5f9", color: "#475569" };
                const dateStr = new Date(lead.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={lead.id} style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
                    padding: "10px 8px", borderRadius: 10, transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{lead.name ?? "Без имени"}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{lead.phone}</span>
                      </div>
                      {summary && <p style={{ fontSize: 12, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, ...statusStyle }}>
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Extra KPI row: room occupancy + top doctors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }} className="clinic-grid-stack">
        {/* Room occupancy — 7 days */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Загрузка кабинетов за неделю</h2>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>7 дней</span>
          </div>
          {loadingRooms ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1,2,3,4].map(i => (
                <div key={i}>
                  <Skeleton height={14} radius={4} />
                  <div style={{ marginTop: 6 }}><Skeleton height={6} radius={3} /></div>
                </div>
              ))}
            </div>
          ) : errRooms ? (
            <ErrorBanner message={errRooms} onRetry={fetchRoomOccupancy} />
          ) : roomOccupancy.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Нет кабинетов</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {roomOccupancy.map((r) => (
                <div key={r.roomId}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.roomName}</span>
                    <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, marginLeft: 8 }}>{r.percent}% · {r.appointments} приёмов</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: r.percent >= 80 ? "#ef4444" : r.percent >= 50 ? "#0d9488" : "#94a3b8",
                      width: `${r.percent}%`, transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top doctors by DONE — 30 days */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Топ врачей по визитам</h2>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>30 дней · DONE</span>
          </div>
          {loadingTopDocs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} height={44} />)}
            </div>
          ) : errTopDocs ? (
            <ErrorBanner message={errTopDocs} onRetry={fetchTopDoctors} />
          ) : topDoctors.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Нет завершённых визитов</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {topDoctors.map((d, idx) => {
                const c = avatarColors[idx % avatarColors.length];
                return (
                  <div key={d.doctorId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 6px", borderRadius: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: "#f0fdfa", color: "#0d9488",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                    }}>{idx + 1}</div>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: c.bg, color: c.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0d9488", flexShrink: 0 }}>{d.done}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .clinic-grid-stack { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
