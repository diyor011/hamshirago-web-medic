"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, Clock, Activity, TrendingUp, RefreshCw, ChevronRight, X, Download } from "lucide-react";
import { clinicApi, StatsOverview, MonthlyStats, DoctorStats, Appointment, Lead } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useTranslation } from "react-i18next";
import "@/i18n";

type Period = "today" | "week" | "month" | "year";

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
  const { t } = useTranslation();
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
        <RefreshCw size={13} /> {t("clinic.common.retry")}
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

const ONBOARDING_DISMISS_KEY = "clinic-onboarding-dismissed";

interface OnboardingStep {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

function OnboardingBanner({ steps, onDismiss }: { steps: OnboardingStep[]; onDismiss: () => void }) {
  const { t } = useTranslation();
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)",
      border: "1.5px solid #99f6e4", borderRadius: 16,
      padding: "20px 24px", marginBottom: 24, position: "relative",
    }}>
      <button onClick={onDismiss} style={{
        position: "absolute", top: 14, right: 14,
        background: "none", border: "none", cursor: "pointer",
        color: "#94a3b8", display: "flex", padding: 4,
      }}>
        <X size={16} />
      </button>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
          🚀 {t("clinic.dashboard.onboarding.title")} — {completed}/{steps.length} шагов
        </p>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
          {t("clinic.dashboard.onboarding.subtitle")}
        </p>
        <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: "linear-gradient(90deg, #0d9488, #5eead4)",
            width: `${pct}%`, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step) => (
          <a key={step.key} href={step.done ? undefined : step.href} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10,
            background: step.done ? "rgba(255,255,255,0.5)" : "#fff",
            border: `1px solid ${step.done ? "#bbf7d0" : "#e2e8f0"}`,
            textDecoration: "none", cursor: step.done ? "default" : "pointer",
            transition: "all 0.15s",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: step.done ? "#dcfce7" : "#f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {step.done
                ? <CheckCircle size={16} color="#16a34a" />
                : <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
                    {steps.indexOf(step) + 1}
                  </span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: step.done ? "#16a34a" : "#0f172a", margin: 0 }}>
                {step.label}
              </p>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{step.hint}</p>
            </div>
            {!step.done && <ChevronRight size={15} color="#94a3b8" />}
          </a>
        ))}
      </div>
    </div>
  );
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
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<Period, string> = {
    today: t("clinic.finance.periodToday"),
    week:  t("clinic.finance.periodWeek"),
    month: t("clinic.finance.periodMonth"),
    year:  t("clinic.finance.periodYear"),
  };

  const LEAD_STATUS_LABELS: Record<string, string> = {
    NEW:        t("clinic.leads.status.NEW"),
    IN_PROGRESS: t("clinic.leads.status.IN_PROGRESS"),
    DONE:       t("clinic.leads.status.DONE"),
    CANCELED:   t("clinic.leads.status.CANCELED"),
  };

  const [period, setPeriod] = useState<Period>("today");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [todayApps, setTodayApps] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [roomStats, setRoomStats] = useState<Array<{ roomId: string; name: string; floor: number | null; todayAppointments: number }>>([]);
  const [serviceStats, setServiceStats] = useState<Array<{ serviceId: string; serviceName: string; count: number }>>([]);
  const [showBooking, setShowBooking] = useState(false);

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [hasStaff, setHasStaff]       = useState<boolean | null>(null);
  const [hasRooms, setHasRooms]       = useState<boolean | null>(null);
  const [hasServices, setHasServices] = useState<boolean | null>(null);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);

  const [errOverview, setErrOverview] = useState<string | null>(null);
  const [errMonthly, setErrMonthly] = useState<string | null>(null);
  const [errDoctors, setErrDoctors] = useState<string | null>(null);
  const [errQueue, setErrQueue] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [errRooms, setErrRooms] = useState<string | null>(null);
  const [errServices, setErrServices] = useState<string | null>(null);

  const fetchOverview = useCallback(async (p: Period) => {
    setLoadingOverview(true); setErrOverview(null);
    try { setOverview(await clinicApi.stats.overview(p)); }
    catch (e) { setErrOverview(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingOverview(false); }
  }, [t]);

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true); setErrMonthly(null);
    try { setMonthly(await clinicApi.stats.monthly()); }
    catch (e) { setErrMonthly(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingMonthly(false); }
  }, [t]);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); setErrDoctors(null);
    try { setDoctors(await clinicApi.stats.doctors()); }
    catch (e) { setErrDoctors(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingDoctors(false); }
  }, [t]);

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true); setErrQueue(null);
    try { setTodayApps(await clinicApi.appointments.today()); }
    catch (e) { setErrQueue(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingQueue(false); }
  }, [t]);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({ limit: 5 });
      setLeads(res.data);
    }
    catch (e) { setErrLeads(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingLeads(false); }
  }, [t]);

  const fetchRoomStats = useCallback(async () => {
    setLoadingRooms(true); setErrRooms(null);
    try { setRoomStats(await clinicApi.stats.rooms()); }
    catch (e) { setErrRooms(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingRooms(false); }
  }, [t]);

  const fetchServiceStats = useCallback(async () => {
    setLoadingServices(true); setErrServices(null);
    try { setServiceStats(await clinicApi.stats.services()); }
    catch (e) { setErrServices(e instanceof Error ? e.message : t("clinic.common.error")); }
    finally { setLoadingServices(false); }
  }, [t]);

  useEffect(() => { fetchOverview(period); }, [period, fetchOverview]);
  useEffect(() => {
    fetchMonthly(); fetchDoctors(); fetchLeads(); fetchQueue();
    fetchRoomStats(); fetchServiceStats();
  }, [fetchMonthly, fetchDoctors, fetchLeads, fetchQueue, fetchRoomStats, fetchServiceStats]);
  useEffect(() => {
    const id = setInterval(fetchQueue, 10000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setOnboardingDismissed(!!localStorage.getItem(ONBOARDING_DISMISS_KEY));
    Promise.all([
      clinicApi.staff.list(),
      clinicApi.rooms.list(),
      clinicApi.services.list(),
    ]).then(([staff, rooms, svcs]) => {
      setHasStaff(staff.length > 0);
      setHasRooms(rooms.length > 0);
      setHasServices(svcs.length > 0);
    }).catch(() => {
      setHasStaff(true); setHasRooms(true); setHasServices(true);
    });
  }, []);

  const todayDate = mounted
    ? new Date().toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";
  const waiting = todayApps.filter((a) => a.status === "SCHEDULED").length;
  const inProgress = todayApps.filter((a) => ["CHECKED_IN", "IN_PROGRESS"].includes(a.status)).length;
  const done = todayApps.filter((a) => a.status === "DONE").length;
  const maxDoc = Math.max(...doctors.map((d) => d.appointments), 1);
  const maxMonth = Math.max(...monthly.map((m) => m.appointments), 1);

  const onboardingSteps: OnboardingStep[] = [
    { key: "staff",    label: t("clinic.dashboard.onboarding.addStaff"),   hint: t("clinic.dashboard.onboarding.addStaffHint"),   href: "/clinic/staff",    done: hasStaff    === true },
    { key: "rooms",    label: t("clinic.dashboard.onboarding.createRoom"),  hint: t("clinic.dashboard.onboarding.createRoomHint"),  href: "/clinic/rooms",    done: hasRooms    === true },
    { key: "services", label: t("clinic.dashboard.onboarding.addService"),  hint: t("clinic.dashboard.onboarding.addServiceHint"),  href: "/clinic/services", done: hasServices === true },
  ];
  const allOnboardingDone = onboardingSteps.every((s) => s.done);
  const showOnboarding = !onboardingDismissed && !allOnboardingDone && hasStaff !== null;

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  function downloadCSV(filename: string, rows: string[][]) {
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function exportAppointments() {
    setExporting(true); setExportOpen(false);
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startD = new Date(); startD.setDate(startD.getDate() - 29);
      const startDate = startD.toISOString().slice(0, 10);
      const all: Appointment[] = await clinicApi.appointments.list({ startDate, endDate });
      const rows: string[][] = [
        ["ID", t("reception.patient"), t("reception.phone"), t("reception.doctor"), t("reception.date"), "Time", t("reception.status"), t("reception.payment")],
        ...all.map((a) => [
          a.id.slice(0, 8),
          a.patientName ?? "",
          a.patientPhone,
          a.doctorId ?? "",
          a.date,
          a.time,
          a.status,
          a.paymentType ?? "",
        ]),
      ];
      downloadCSV(`appointments-${endDate}.csv`, rows);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  }

  async function exportLeads() {
    setExporting(true); setExportOpen(false);
    try {
      const res = await clinicApi.leads.list({ limit: 500 });
      const rows: string[][] = [
        ["ID", "Name", "Phone", "Status", "Notes", "Date"],
        ...res.data.map((l) => [
          l.id.slice(0, 8),
          l.name ?? "",
          l.phone,
          l.status,
          l.notes ?? "",
          new Date(l.createdAt).toLocaleDateString("ru-RU"),
        ]),
      ];
      downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  }

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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{t("clinic.dashboard.title")}</h1>
          <p style={{ fontSize: 13, color: "#64748b", textTransform: "capitalize" }}>{todayDate}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Export dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569",
                cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.7 : 1,
              }}
            >
              <Download size={14} /> {exporting ? t("clinic.dashboard.exporting") : t("clinic.dashboard.export")}
            </button>
            {exportOpen && (
              <>
                <div onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                  background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 200, overflow: "hidden",
                }}>
                  {[
                    { label: t("clinic.dashboard.exportAppointments"), fn: exportAppointments },
                    { label: t("clinic.dashboard.exportLeads"),         fn: exportLeads },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn} style={{
                      display: "block", width: "100%", padding: "11px 16px",
                      textAlign: "left", background: "none", border: "none",
                      fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => setShowBooking(true)} style={{
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "10px 20px",
            border: "none", cursor: "pointer",
          }}>
            {t("clinic.dashboard.recordPatient")}
          </button>
        </div>
      </div>

      {/* Onboarding checklist */}
      {showOnboarding && (
        <OnboardingBanner
          steps={onboardingSteps}
          onDismiss={() => {
            localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
            setOnboardingDismissed(true);
          }}
        />
      )}

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
            <KpiCard icon={<Users size={22} color="#2563eb" />} iconBg="#eff6ff" value={overview.newPatients} label={t("clinic.dashboard.kpi.newPatients")} />
            <KpiCard icon={<CheckCircle size={22} color="#16a34a" />} iconBg="#f0fdf4" value={overview.appointments} label={t("clinic.dashboard.kpi.appointments")} />
            <KpiCard icon={<TrendingUp size={22} color="#9333ea" />} iconBg="#faf5ff" value={`${(overview.revenue ?? 0).toLocaleString("ru-RU")} ${t("common.sum")}`} label={t("clinic.dashboard.kpi.revenue")} />
            <KpiCard icon={<Activity size={22} color="#ea580c" />} iconBg="#fff7ed" value={`${overview.cancelRate ?? 0}%`} label={t("clinic.dashboard.kpi.cancelRate")} />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }} className="clinic-grid-stack">
        {/* Monthly */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>{t("clinic.dashboard.monthlyPatients")}</h2>
          {loadingMonthly ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} height={18} radius={6} />)}
            </div>
          ) : errMonthly ? (
            <ErrorBanner message={errMonthly} onRetry={fetchMonthly} />
          ) : monthly.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>{t("clinic.dashboard.noData")}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>{t("clinic.finance.month")}</th>
                  <th style={{ textAlign: "right", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>{t("clinic.finance.appointmentsCount")}</th>
                  <th style={{ textAlign: "right", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>{t("clinic.finance.revenueCol")}</th>
                  <th style={{ width: 120, padding: "0 0 10px" }} />
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "9px 0", color: "#374151", fontWeight: 600 }}>{row.month}</td>
                    <td style={{ padding: "9px 0", textAlign: "right", color: "#374151" }}>{row.appointments}</td>
                    <td style={{ padding: "9px 0", textAlign: "right", color: "#374151" }}>{(row.revenue ?? 0).toLocaleString("ru-RU")} {t("common.sum")}</td>
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
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>{t("clinic.dashboard.todayQueue")}</h2>
          {loadingQueue ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={60} />)}
            </div>
          ) : errQueue ? (
            <ErrorBanner message={errQueue} onRetry={fetchQueue} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { icon: <Clock size={20} color="#ca8a04" />, count: waiting, label: t("clinic.dashboard.waiting"), bg: "#fefce8", color: "#92400e" },
                { icon: <Activity size={20} color="#2563eb" />, count: inProgress, label: t("clinic.dashboard.inProgress"), bg: "#eff6ff", color: "#1e40af" },
                { icon: <CheckCircle size={20} color="#16a34a" />, count: done, label: t("clinic.dashboard.done"), bg: "#f0fdf4", color: "#14532d" },
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
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>{t("clinic.dashboard.doctorsActivity")}</h2>
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
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>{t("clinic.dashboard.noData")}</div>
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
                      {(doc.doctorName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.doctorName}</span>
                        <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, marginLeft: 8 }}>{doc.appointments} {t("clinic.dashboard.appointmentsCount")}</span>
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
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>{t("clinic.dashboard.latestLeads")}</h2>
          {loadingLeads ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} height={52} />)}
            </div>
          ) : errLeads ? (
            <ErrorBanner message={errLeads} onRetry={fetchLeads} />
          ) : leads.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>{t("clinic.dashboard.noLeads")}</div>
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{lead.name ?? t("clinic.dashboard.withoutName")}</span>
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

      {/* Extra KPI row: room stats today + top services */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }} className="clinic-grid-stack">
        {/* Room stats */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t("clinic.dashboard.roomsToday")}</h2>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{t("clinic.dashboard.appointmentsCount")}</span>
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
            <ErrorBanner message={errRooms} onRetry={fetchRoomStats} />
          ) : roomStats.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>{t("clinic.dashboard.noRooms")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(() => {
                const maxApps = Math.max(...roomStats.map((r) => r.todayAppointments), 1);
                return roomStats.map((r) => {
                  const pct = Math.round((r.todayAppointments / maxApps) * 100);
                  return (
                    <div key={r.roomId}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}{r.floor != null ? ` · ${r.floor} ${t("clinic.rooms.floorSuffix")}` : ""}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, marginLeft: 8 }}>{r.todayAppointments} {t("clinic.dashboard.appointmentsCount")}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: pct >= 80 ? "#ef4444" : pct >= 40 ? "#0d9488" : "#94a3b8",
                          width: `${pct}%`, transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Top services */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t("clinic.dashboard.topServices")}</h2>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{t("clinic.dashboard.byAppointments")}</span>
          </div>
          {loadingServices ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} height={44} />)}
            </div>
          ) : errServices ? (
            <ErrorBanner message={errServices} onRetry={fetchServiceStats} />
          ) : serviceStats.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>{t("clinic.dashboard.noData")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(() => {
                const maxCount = Math.max(...serviceStats.map((s) => s.count), 1);
                return serviceStats.slice(0, 8).map((s, idx) => {
                  const c = avatarColors[idx % avatarColors.length];
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.serviceId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: c.bg, color: c.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800,
                      }}>{idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.serviceName}</span>
                          <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, marginLeft: 6 }}>{s.count}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 2, background: "#0d9488", width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .clinic-grid-stack { grid-template-columns: 1fr !important; } }
      `}</style>

      <BookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        onSuccess={() => setShowBooking(false)}
      />
    </div>
  );
}
