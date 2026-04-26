"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, Clock, Activity, TrendingUp, RefreshCw, ChevronRight, X, Download } from "lucide-react";
import { clinicApi, StatsOverview, MonthlyStats, DoctorStats, Appointment, Lead } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useTranslation } from "react-i18next";
import "@/i18n";

type Period = "today" | "week" | "month" | "year";

const LEAD_STATUS_CLS: Record<string, string> = {
  NEW:         "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-yellow-50 text-yellow-600",
  DONE:        "bg-green-50 text-green-600",
  CANCELED:    "bg-red-50 text-red-500",
};

function Skeleton({ className = "h-14" }: { className?: string }) {
  return <div className={`${className} rounded-xl bg-slate-100 animate-pulse`} />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-red-500">{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-sm font-semibold text-red-500 bg-transparent border-0 cursor-pointer"
      >
        <RefreshCw size={13} /> {t("clinic.common.retry")}
      </button>
    </div>
  );
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
    <div className="bg-gradient-to-br from-teal-50 to-sky-100 border-[1.5px] border-teal-200 rounded-2xl p-6 mb-6 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3.5 right-3.5 bg-transparent border-0 cursor-pointer text-slate-400 flex p-1"
      >
        <X size={16} />
      </button>

      <div className="mb-4">
        <p className="text-[15px] font-extrabold text-slate-900 mb-1">
          🚀 {t("clinic.dashboard.onboarding.title")} — {completed}/{steps.length} шагов
        </p>
        <p className="text-sm text-slate-500 mb-2.5">{t("clinic.dashboard.onboarding.subtitle")}</p>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300 transition-all duration-400"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <a
            key={step.key}
            href={step.done ? undefined : step.href}
            className={[
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border no-underline transition-all duration-150",
              step.done
                ? "bg-white/50 border-green-200 cursor-default"
                : "bg-white border-slate-200 cursor-pointer",
            ].join(" ")}
          >
            <div className={[
              "w-7 h-7 rounded-full shrink-0 flex items-center justify-center",
              step.done ? "bg-green-100" : "bg-slate-100",
            ].join(" ")}>
              {step.done
                ? <CheckCircle size={16} className="text-green-600" />
                : <span className="text-xs font-bold text-slate-400">{steps.indexOf(step) + 1}</span>
              }
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold m-0 ${step.done ? "text-green-600" : "text-slate-900"}`}>
                {step.label}
              </p>
              <p className="text-xs text-slate-500 m-0">{step.hint}</p>
            </div>
            {!step.done && <ChevronRight size={15} className="text-slate-400" />}
          </a>
        ))}
      </div>
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
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</div>
          <div className="text-sm text-slate-500 mt-0.5 truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf2f8", color: "#db2777" },
];

export default function DashboardPage() {
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<Period, string> = {
    today: t("clinic.finance.periodToday"),
    week:  t("clinic.finance.periodWeek"),
    month: t("clinic.finance.periodMonth"),
    year:  t("clinic.finance.periodYear"),
  };

  const LEAD_STATUS_LABELS: Record<string, string> = {
    NEW:         t("clinic.leads.status.NEW"),
    IN_PROGRESS: t("clinic.leads.status.IN_PROGRESS"),
    DONE:        t("clinic.leads.status.DONE"),
    CANCELED:    t("clinic.leads.status.CANCELED"),
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

  const [loadingOverview, setLoadingOverview]   = useState(true);
  const [loadingMonthly, setLoadingMonthly]     = useState(true);
  const [loadingDoctors, setLoadingDoctors]     = useState(true);
  const [loadingQueue, setLoadingQueue]         = useState(true);
  const [loadingLeads, setLoadingLeads]         = useState(true);
  const [loadingRooms, setLoadingRooms]         = useState(true);
  const [loadingServices, setLoadingServices]   = useState(true);

  const [errOverview, setErrOverview]   = useState<string | null>(null);
  const [errMonthly, setErrMonthly]     = useState<string | null>(null);
  const [errDoctors, setErrDoctors]     = useState<string | null>(null);
  const [errQueue, setErrQueue]         = useState<string | null>(null);
  const [errLeads, setErrLeads]         = useState<string | null>(null);
  const [errRooms, setErrRooms]         = useState<string | null>(null);
  const [errServices, setErrServices]   = useState<string | null>(null);

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

  const waiting    = todayApps.filter((a) => a.status === "SCHEDULED").length;
  const inProgress = todayApps.filter((a) => ["CHECKED_IN", "IN_PROGRESS"].includes(a.status)).length;
  const done       = todayApps.filter((a) => a.status === "DONE").length;
  const maxDoc     = Math.max(...doctors.map((d) => d.appointments), 1);
  const maxMonth   = Math.max(...monthly.map((m) => m.appointments), 1);

  const onboardingSteps: OnboardingStep[] = [
    { key: "staff",    label: t("clinic.dashboard.onboarding.addStaff"),   hint: t("clinic.dashboard.onboarding.addStaffHint"),   href: "/clinic/staff",    done: hasStaff    === true },
    { key: "rooms",    label: t("clinic.dashboard.onboarding.createRoom"),  hint: t("clinic.dashboard.onboarding.createRoomHint"),  href: "/clinic/rooms",    done: hasRooms    === true },
    { key: "services", label: t("clinic.dashboard.onboarding.addService"),  hint: t("clinic.dashboard.onboarding.addServiceHint"),  href: "/clinic/services", done: hasServices === true },
  ];
  const allOnboardingDone = onboardingSteps.every((s) => s.done);
  const showOnboarding    = !onboardingDismissed && !allOnboardingDone && hasStaff !== null;

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting]   = useState(false);

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
      const endDate  = new Date().toISOString().slice(0, 10);
      const startD   = new Date(); startD.setDate(startD.getDate() - 29);
      const startDate = startD.toISOString().slice(0, 10);
      const all: Appointment[] = await clinicApi.appointments.list({ startDate, endDate });
      const rows: string[][] = [
        ["ID", t("reception.patient"), t("reception.phone"), t("reception.doctor"), t("reception.date"), "Time", t("reception.status"), t("reception.payment")],
        ...all.map((a) => [a.id.slice(0, 8), a.patientName ?? "", a.patientPhone, a.doctorId ?? "", a.date, a.time, a.status, a.paymentType ?? ""]),
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
        ...res.data.map((l) => [l.id.slice(0, 8), l.name ?? "", l.phone, l.status, l.notes ?? "", new Date(l.createdAt).toLocaleDateString("ru-RU")]),
      ];
      downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  }

  return (
    <div className="min-h-full bg-slate-50">

      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t("clinic.dashboard.title")}</h1>
          <p className="text-sm text-slate-500 capitalize">{todayDate}</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              {exporting ? t("clinic.dashboard.exporting") : t("clinic.dashboard.export")}
            </button>
            {exportOpen && (
              <>
                <div onClick={() => setExportOpen(false)} className="fixed inset-0 z-[99]" />
                <div className="absolute top-[calc(100%+6px)] right-0 z-[100] bg-white rounded-xl border border-slate-200 shadow-lg min-w-[200px] overflow-hidden">
                  {[
                    { label: t("clinic.dashboard.exportAppointments"), fn: exportAppointments },
                    { label: t("clinic.dashboard.exportLeads"),         fn: exportLeads },
                  ].map(({ label, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="block w-full px-4 py-3 text-left bg-transparent border-0 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Main CTA — bigger for CEO */}
          <button
            onClick={() => setShowBooking(true)}
            className="bg-gradient-to-br from-teal-600 to-teal-700 text-white text-base font-bold rounded-xl px-7 py-3.5 border-0 cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
          >
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
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={[
              "px-5 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-all duration-150",
              period === p
                ? "border-teal-600 bg-teal-50 text-teal-600"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {errOverview && <div className="mb-5"><ErrorBanner message={errOverview} onRetry={() => fetchOverview(period)} /></div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loadingOverview ? (
          [1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-7" />
                  <div className="mt-1.5"><Skeleton className="h-4" /></div>
                </div>
              </div>
            </div>
          ))
        ) : overview ? (
          <>
            <KpiCard icon={<Users size={24} color="#2563eb" />}    iconBg="#eff6ff" value={overview.newPatients ?? 0}                                             label={t("clinic.dashboard.kpi.newPatients")} />
            <KpiCard icon={<CheckCircle size={24} color="#16a34a" />} iconBg="#f0fdf4" value={overview.appointments ?? 0}                                          label={t("clinic.dashboard.kpi.appointments")} />
            <KpiCard icon={<TrendingUp size={24} color="#9333ea" />}  iconBg="#faf5ff" value={`${(overview.revenue ?? 0).toLocaleString("ru-RU")} ${t("common.sum")}`} label={t("clinic.dashboard.kpi.revenue")} />
            <KpiCard icon={<Activity size={24} color="#ea580c" />}   iconBg="#fff7ed" value={`${overview.cancelRate ?? 0}%`}                                       label={t("clinic.dashboard.kpi.cancelRate")} />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">
        {/* Monthly */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">{t("clinic.dashboard.monthlyPatients")}</h2>
          {loadingMonthly ? (
            <div className="flex flex-col gap-2.5">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-5" />)}
            </div>
          ) : errMonthly ? (
            <ErrorBanner message={errMonthly} onRetry={fetchMonthly} />
          ) : monthly.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10">{t("clinic.dashboard.noData")}</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left pb-2.5 text-slate-500 font-semibold">{t("clinic.finance.month")}</th>
                  <th className="text-right pb-2.5 text-slate-500 font-semibold">{t("clinic.finance.appointmentsCount")}</th>
                  <th className="text-right pb-2.5 text-slate-500 font-semibold">{t("clinic.finance.revenueCol")}</th>
                  <th className="w-28 pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month} className="border-b border-slate-50">
                    <td className="py-2.5 text-slate-700 font-semibold">{row.month}</td>
                    <td className="py-2.5 text-right text-slate-700">{row.appointments}</td>
                    <td className="py-2.5 text-right text-slate-700">{(row.revenue ?? 0).toLocaleString("ru-RU")} {t("common.sum")}</td>
                    <td className="py-2.5 pl-4">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{ width: `${(row.appointments / maxMonth) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">{t("clinic.dashboard.todayQueue")}</h2>
          {loadingQueue ? (
            <div className="flex flex-col gap-2.5">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : errQueue ? (
            <ErrorBanner message={errQueue} onRetry={fetchQueue} />
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: <Clock size={22} className="text-yellow-600" />, count: waiting,    label: t("clinic.dashboard.waiting"),    bg: "bg-yellow-50",  color: "text-yellow-800" },
                { icon: <Activity size={22} className="text-blue-600" />, count: inProgress, label: t("clinic.dashboard.inProgress"), bg: "bg-blue-50",    color: "text-blue-800" },
                { icon: <CheckCircle size={22} className="text-green-600" />, count: done,  label: t("clinic.dashboard.done"),       bg: "bg-green-50",   color: "text-green-800" },
              ].map(({ icon, count, label, bg, color }) => (
                <div key={label} className={`${bg} rounded-xl py-4 px-2 text-center flex flex-col items-center gap-1.5`}>
                  {icon}
                  <span className={`text-2xl font-extrabold ${color}`}>{count}</span>
                  <span className={`text-xs ${color} opacity-80 leading-tight`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Doctors */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">{t("clinic.dashboard.doctorsActivity")}</h2>
          {loadingDoctors ? (
            <div className="flex flex-col gap-3.5">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5" />
                    <div className="mt-1.5"><Skeleton className="h-1.5" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : errDoctors ? (
            <ErrorBanner message={errDoctors} onRetry={fetchDoctors} />
          ) : doctors.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">{t("clinic.dashboard.noData")}</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {doctors.map((doc, idx) => {
                const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const pct = Math.round((doc.appointments / maxDoc) * 100);
                return (
                  <div key={doc.doctorId} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[15px] font-bold"
                      style={{ background: c.bg, color: c.color }}
                    >
                      {(doc.doctorName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">{doc.doctorName}</span>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{doc.appointments} {t("clinic.dashboard.appointmentsCount")}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leads */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">{t("clinic.dashboard.latestLeads")}</h2>
          {loadingLeads ? (
            <div className="flex flex-col gap-2.5">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : errLeads ? (
            <ErrorBanner message={errLeads} onRetry={fetchLeads} />
          ) : leads.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">{t("clinic.dashboard.noLeads")}</div>
          ) : (
            <div className="flex flex-col gap-1">
              {leads.map((lead) => {
                const summary = lead.notes ? (lead.notes.length > 60 ? lead.notes.slice(0, 60) + "…" : lead.notes) : null;
                const statusCls = LEAD_STATUS_CLS[lead.status] ?? "bg-slate-100 text-slate-600";
                const dateStr = new Date(lead.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={lead.id}
                    className="flex items-start justify-between gap-2.5 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition-colors duration-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{lead.name ?? t("clinic.dashboard.withoutName")}</span>
                        <span className="text-xs text-slate-400">{lead.phone}</span>
                      </div>
                      {summary && <p className="text-xs text-slate-500 mt-0.5 truncate">{summary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusCls}`}>
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      <span className="text-[11px] text-slate-400">{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Extra KPI row: room stats + top services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Room stats */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">{t("clinic.dashboard.roomsToday")}</h2>
            <span className="text-xs text-slate-400">{t("clinic.dashboard.appointmentsCount")}</span>
          </div>
          {loadingRooms ? (
            <div className="flex flex-col gap-3.5">
              {[1,2,3,4].map(i => (
                <div key={i}>
                  <Skeleton className="h-3.5" />
                  <div className="mt-1.5"><Skeleton className="h-1.5" /></div>
                </div>
              ))}
            </div>
          ) : errRooms ? (
            <ErrorBanner message={errRooms} onRetry={fetchRoomStats} />
          ) : roomStats.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">{t("clinic.dashboard.noRooms")}</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {(() => {
                const maxApps = Math.max(...roomStats.map((r) => r.todayAppointments), 1);
                return roomStats.map((r) => {
                  const pct = Math.round((r.todayAppointments / maxApps) * 100);
                  const barColor = pct >= 80 ? "bg-red-500" : pct >= 40 ? "bg-teal-600" : "bg-slate-400";
                  return (
                    <div key={r.roomId}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {r.name}{r.floor != null ? ` · ${r.floor} ${t("clinic.rooms.floorSuffix")}` : ""}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{r.todayAppointments} {t("clinic.dashboard.appointmentsCount")}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Top services */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">{t("clinic.dashboard.topServices")}</h2>
            <span className="text-xs text-slate-400">{t("clinic.dashboard.byAppointments")}</span>
          </div>
          {loadingServices ? (
            <div className="flex flex-col gap-2.5">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-11" />)}
            </div>
          ) : errServices ? (
            <ErrorBanner message={errServices} onRetry={fetchServiceStats} />
          ) : serviceStats.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">{t("clinic.dashboard.noData")}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(() => {
                const maxCount = Math.max(...serviceStats.map((s) => s.count), 1);
                return serviceStats.slice(0, 8).map((s, idx) => {
                  const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.serviceId} className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg">
                      <div
                        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-extrabold"
                        style={{ background: c.bg, color: c.color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-semibold text-slate-900 truncate">{s.serviceName}</span>
                          <span className="text-xs text-slate-500 shrink-0 ml-1.5">{s.count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
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

      <BookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        onSuccess={() => setShowBooking(false)}
      />
    </div>
  );
}
