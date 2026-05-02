"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Clock,
  DoorOpen,
  Download,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import {
  clinicApi,
  StatsOverview,
  MonthlyStats,
  DoctorStats,
  Appointment,
  Lead,
  ClinicRoom,
  ClinicStaff,
} from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import "@/i18n";

type Period = "today" | "week" | "month" | "year";

const ONBOARDING_COLLAPSE_KEY = "clinic-onboarding-collapsed";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const UZ_WEEKDAYS = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba",
  "Payshanba", "Juma", "Shanba",
];

const LEAD_STATUS_META: Record<string, string> = {
  NEW: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELED: "border-rose-200 bg-rose-50 text-rose-700",
};

const KPI_TONES = [
  {
    card: "border-sky-200/70 bg-sky-50/80",
    iconWrap: "bg-sky-600 text-white shadow-sky-200/70",
    accent: "bg-sky-500",
    value: "text-sky-950",
    hint: "text-sky-700/80",
  },
  {
    card: "border-emerald-200/70 bg-emerald-50/80",
    iconWrap: "bg-emerald-600 text-white shadow-emerald-200/70",
    accent: "bg-emerald-500",
    value: "text-emerald-950",
    hint: "text-emerald-700/80",
  },
  {
    card: "border-violet-200/70 bg-violet-50/80",
    iconWrap: "bg-violet-600 text-white shadow-violet-200/70",
    accent: "bg-violet-500",
    value: "text-violet-950",
    hint: "text-violet-700/80",
  },
  {
    card: "border-amber-200/70 bg-amber-50/80",
    iconWrap: "bg-amber-500 text-white shadow-amber-200/70",
    accent: "bg-amber-400",
    value: "text-amber-950",
    hint: "text-amber-700/80",
  },
];

interface OnboardingStep {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

function Skeleton({ className = "h-14" }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-2xl bg-slate-200/80`} />;
}

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-rose-700">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
      >
        <RefreshCw size={14} className="transition group-hover:rotate-180" />
        {t("clinic.common.retry")}
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  toneIndex,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  toneIndex: number;
}) {
  const tone = KPI_TONES[toneIndex % KPI_TONES.length];

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:rounded-[24px] sm:p-5 ${tone.card}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${tone.accent}`} />
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
          <p className={`mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl ${tone.value}`}>{value}</p>
          <p className={`mt-1.5 truncate text-[11px] font-medium sm:mt-2 sm:text-xs ${tone.hint}`}>{hint}</p>
        </div>
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md sm:h-12 sm:w-12 sm:rounded-2xl sm:shadow-lg",
            tone.iconWrap,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

function OnboardingBanner({
  steps,
  collapsed,
  onToggleCollapse,
}: {
  steps: OnboardingStep[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation();
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-sky-50 px-5 py-3.5 transition hover:border-teal-300 hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            <Sparkles size={12} />
            Setup
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {t("clinic.dashboard.onboarding.title")} — {completed}/{steps.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronRight size={16} className="rotate-90 text-slate-400" />
        </div>
      </button>
    );
  }

  return (
    <Surface className="overflow-hidden border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-sky-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            <Sparkles size={12} />
            Setup
          </div>
          <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">
            {t("clinic.dashboard.onboarding.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {t("clinic.dashboard.onboarding.subtitle")}
          </p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
          aria-label="Collapse onboarding"
        >
          <ChevronRight size={16} className="-rotate-90" />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {completed}/{steps.length}
          </p>
          <p className="text-xs text-slate-500">Progress</p>
        </div>
        <div className="w-full max-w-xl">
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const content = (
            <>
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                  step.done
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                {step.done ? <CheckCircle size={18} /> : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "text-sm font-bold",
                    step.done ? "text-emerald-700" : "text-slate-900",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.hint}</p>
              </div>
              <div className="shrink-0">
                {step.done ? (
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    Ready
                  </span>
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                )}
              </div>
            </>
          );

          const cardClass = [
            "flex min-h-[104px] items-start gap-3 rounded-[24px] border p-4 transition",
            step.done
              ? "border-emerald-200 bg-white/70"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md",
          ].join(" ");

          return step.done ? (
            <div key={step.key} className={cardClass}>
              {content}
            </div>
          ) : (
            <Link key={step.key} href={step.href} className={cardClass}>
              {content}
            </Link>
          );
        })}
      </div>
    </Surface>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();

  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const PERIOD_LABELS: Record<Period, string> = {
    today: t("clinic.finance.periodToday"),
    week: t("clinic.finance.periodWeek"),
    month: t("clinic.finance.periodMonth"),
    year: t("clinic.finance.periodYear"),
  };

  const LEAD_STATUS_LABELS: Record<string, string> = {
    NEW: t("clinic.leads.status.NEW"),
    IN_PROGRESS: t("clinic.leads.status.IN_PROGRESS"),
    DONE: t("clinic.leads.status.DONE"),
    CANCELED: t("clinic.leads.status.CANCELED"),
  };

  const [period, setPeriod] = useState<Period>("month");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);
  const [todayApps, setTodayApps] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roomStats, setRoomStats] = useState<
    Array<{ roomId: string; name: string; floor: number | null; todayAppointments: number }>
  >([]);
  const [serviceStats, setServiceStats] = useState<
    Array<{ serviceId: string; serviceName: string; count: number }>
  >([]);
  const [showBooking, setShowBooking] = useState(false);

  const [onboardingCollapsed, setOnboardingCollapsed] = useState(false);
  const [hasStaff, setHasStaff] = useState<boolean | null>(null);
  const [hasRooms, setHasRooms] = useState<boolean | null>(null);
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

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchOverview = useCallback(
    async (nextPeriod: Period) => {
      setLoadingOverview(true);
      setErrOverview(null);
      try {
        setOverview(await clinicApi.stats.overview(nextPeriod));
      } catch (error) {
        setErrOverview(error instanceof Error ? error.message : t("clinic.common.error"));
      } finally {
        setLoadingOverview(false);
      }
    },
    [t],
  );

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true);
    setErrMonthly(null);
    try {
      setMonthly(await clinicApi.stats.monthly());
    } catch (error) {
      setErrMonthly(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingMonthly(false);
    }
  }, [t]);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    setErrDoctors(null);
    try {
      setDoctors(await clinicApi.stats.doctors());
    } catch (error) {
      setErrDoctors(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingDoctors(false);
    }
  }, [t]);

  const fetchingQueue = useRef(false);
  const fetchQueue = useCallback(async () => {
    if (fetchingQueue.current) return;
    fetchingQueue.current = true;
    setLoadingQueue(true);
    setErrQueue(null);
    try {
      setTodayApps(await clinicApi.appointments.today());
    } catch (error) {
      setErrQueue(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingQueue(false);
      fetchingQueue.current = false;
    }
  }, [t]);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    setErrLeads(null);
    try {
      const response = await clinicApi.leads.list({ limit: 5 });
      setLeads(response.data);
    } catch (error) {
      setErrLeads(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingLeads(false);
    }
  }, [t]);

  const fetchRoomStats = useCallback(async () => {
    setLoadingRooms(true);
    setErrRooms(null);
    try {
      setRoomStats(await clinicApi.stats.rooms());
    } catch (error) {
      setErrRooms(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingRooms(false);
    }
  }, [t]);

  const fetchServiceStats = useCallback(async () => {
    setLoadingServices(true);
    setErrServices(null);
    try {
      setServiceStats(await clinicApi.stats.services());
    } catch (error) {
      setErrServices(error instanceof Error ? error.message : t("clinic.common.error"));
    } finally {
      setLoadingServices(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOverview(period);
  }, [fetchOverview, period]);

  useEffect(() => {
    fetchMonthly();
    fetchDoctors();
    fetchLeads();
    fetchQueue();
    fetchRoomStats();
    fetchServiceStats();
  }, [fetchDoctors, fetchLeads, fetchMonthly, fetchQueue, fetchRoomStats, fetchServiceStats]);

  useEffect(() => {
    const id = setInterval(fetchQueue, 10_000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  useEffect(() => {
    setMounted(true);
    setOnboardingCollapsed(Boolean(localStorage.getItem(ONBOARDING_COLLAPSE_KEY)));

    Promise.all([
      clinicApi.staff.list(),
      clinicApi.rooms.list(),
      clinicApi.services.list(),
    ])
      .then(([staff, rooms, services]) => {
        setHasStaff(staff.length > 0);
        setHasRooms(rooms.length > 0);
        setHasServices(services.length > 0);
      })
      .catch(() => {
        setHasStaff(true);
        setHasRooms(true);
        setHasServices(true);
      });
  }, []);

  const todayDate = mounted
    ? (() => {
        const now = new Date();
        if (language === "uz") {
          return `${UZ_WEEKDAYS[now.getDay()]}, ${now.getDate()}-${UZ_MONTHS[now.getMonth()].toLowerCase()} ${now.getFullYear()}`;
        }
        const RU_MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
        const RU_DAYS = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
        return `${RU_DAYS[now.getDay()]}, ${now.getDate()} ${RU_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      })()
    : "";

  const waiting = todayApps.filter((appointment) => appointment.status === "SCHEDULED").length;
  const inProgress = todayApps.filter((appointment) =>
    ["CHECKED_IN", "IN_PROGRESS"].includes(appointment.status),
  ).length;
  const done = todayApps.filter((appointment) => appointment.status === "DONE").length;

  const maxDoctorAppointments = Math.max(...doctors.map((doctor) => doctor.appointments), 1);
  const maxMonthAppointments = Math.max(...monthly.map((item) => item.appointments), 1);
  const maxRoomAppointments = Math.max(...roomStats.map((item) => item.todayAppointments), 1);
  const visibleServiceStats = serviceStats.filter(
    (item) => (item.serviceName ?? "").trim().length >= 3,
  );
  const maxServiceCount = Math.max(...visibleServiceStats.map((item) => item.count), 1);

  const onboardingSteps: OnboardingStep[] = [
    {
      key: "staff",
      label: t("clinic.dashboard.onboarding.addStaff"),
      hint: t("clinic.dashboard.onboarding.addStaffHint"),
      href: "/clinic/staff",
      done: hasStaff === true,
    },
    {
      key: "rooms",
      label: t("clinic.dashboard.onboarding.createRoom"),
      hint: t("clinic.dashboard.onboarding.createRoomHint"),
      href: "/clinic/rooms",
      done: hasRooms === true,
    },
    {
      key: "services",
      label: t("clinic.dashboard.onboarding.addService"),
      hint: t("clinic.dashboard.onboarding.addServiceHint"),
      href: "/clinic/services",
      done: hasServices === true,
    },
  ];

  const allOnboardingDone = onboardingSteps.every((step) => step.done);
  const showOnboarding = !allOnboardingDone && hasStaff !== null;

  const formatNumber = (value: number) => value.toLocaleString(locale);
  const formatCurrency = (value: number) =>
    `${value.toLocaleString(locale)} ${t("common.sum")}`;
  const formatLeadDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  const formatMonthLabel = (value: string) => {
    if (!value) return "";
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return value;
    const [, year, month] = match;
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return value;
    if (language === "uz") {
      return `${UZ_MONTHS[monthIndex]} ${year}`;
    }
    const date = new Date(Number(year), monthIndex, 1);
    if (Number.isNaN(date.getTime())) return value;
    const formatted = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  function downloadCSV(filename: string, rows: string[][]) {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportAppointments() {
    setExporting(true);
    setExportOpen(false);
    setExportError(null);
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 29);
      const startDate = startDateObj.toISOString().slice(0, 10);
      const data: Appointment[] = await clinicApi.appointments.list({ startDate, endDate });

      const rows: string[][] = [
        [
          "ID",
          t("reception.patient"),
          t("reception.phone"),
          t("reception.doctor"),
          t("reception.date"),
          "Time",
          t("reception.status"),
          t("reception.payment"),
        ],
        ...data.map((appointment) => [
          appointment.id.slice(0, 8),
          appointment.patientName ?? "",
          appointment.patientPhone,
          appointment.doctorId ?? "",
          appointment.date,
          appointment.time,
          appointment.status,
          appointment.paymentType ?? "",
        ]),
      ];

      downloadCSV(`appointments-${endDate}.csv`, rows);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  async function exportLeads() {
    setExporting(true);
    setExportOpen(false);
    setExportError(null);
    try {
      const response = await clinicApi.leads.list({ limit: 500 });
      const rows: string[][] = [
        ["ID", "Name", "Phone", "Status", "Notes", "Date"],
        ...response.data.map((lead) => [
          lead.id.slice(0, 8),
          lead.name ?? "",
          lead.phone,
          lead.status,
          lead.notes ?? "",
          new Intl.DateTimeFormat(locale).format(new Date(lead.createdAt)),
        ]),
      ];

      downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6 sm:py-7">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
                <Sparkles size={12} />
                Clinic OS
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {t("clinic.dashboard.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                {todayDate}
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("clinic.dashboard.kpi.newPatients")}
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {loadingOverview || !overview ? "-" : formatNumber(overview.newPatients ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("clinic.dashboard.kpi.appointments")}
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {loadingOverview || !overview ? "-" : formatNumber(overview.appointments ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("clinic.dashboard.kpi.revenue")}
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {loadingOverview || !overview ? "-" : formatCurrency(overview.revenue ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative">
                {exportError && (
                  <div className="absolute right-0 top-[-30px] flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-rose-400">
                    <AlertCircle size={13} /> {exportError}
                  </div>
                )}
                <button
                  onClick={() => setExportOpen((value) => !value)}
                  disabled={exporting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  <Download size={15} />
                  {exporting ? t("clinic.dashboard.exporting") : t("clinic.dashboard.export")}
                </button>

                {exportOpen ? (
                  <>
                    <div
                      onClick={() => setExportOpen(false)}
                      className="fixed inset-0 z-[90]"
                    />
                    <div className="absolute right-0 top-[calc(100%+10px)] z-[95] min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl">
                      {[
                        {
                          label: t("clinic.dashboard.exportAppointments"),
                          onClick: exportAppointments,
                        },
                        {
                          label: t("clinic.dashboard.exportLeads"),
                          onClick: exportLeads,
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{item.label}</span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              <button
                onClick={() => setShowBooking(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-teal-950/20 transition hover:-translate-y-0.5 hover:bg-teal-50 sm:w-auto"
              >
                <CalendarClock size={16} />
                {t("clinic.dashboard.recordPatient")}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Period
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setPeriod(item)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      period === item
                        ? "bg-white text-slate-950 shadow-sm"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {PERIOD_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
              {[
                {
                  label: t("clinic.dashboard.waiting"),
                  value: waiting,
                  tone: "border-amber-400/20 bg-amber-400/10 text-amber-100",
                },
                {
                  label: t("clinic.dashboard.inProgress"),
                  value: inProgress,
                  tone: "border-sky-400/20 bg-sky-400/10 text-sky-100",
                },
                {
                  label: t("clinic.dashboard.done"),
                  value: done,
                  tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-3 py-3 ${item.tone}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showOnboarding ? (
        <OnboardingBanner
          steps={onboardingSteps}
          collapsed={onboardingCollapsed}
          onToggleCollapse={() => {
            const next = !onboardingCollapsed;
            setOnboardingCollapsed(next);
            if (next) {
              localStorage.setItem(ONBOARDING_COLLAPSE_KEY, "1");
            } else {
              localStorage.removeItem(ONBOARDING_COLLAPSE_KEY);
            }
          }}
        />
      ) : null}

      {errOverview ? <ErrorBanner message={errOverview} onRetry={() => fetchOverview(period)} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loadingOverview ? (
          Array.from({ length: 4 }, (_, index) => (
            <Surface key={index} className="space-y-3">
              <Skeleton className="h-10 w-10 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl" />
              <Skeleton className="h-3 w-20 sm:h-4 sm:w-28" />
              <Skeleton className="h-8 w-24 sm:h-10 sm:w-40" />
              <Skeleton className="h-3 w-16 sm:w-24" />
            </Surface>
          ))
        ) : overview ? (
          <>
            <MetricCard
              icon={<Users size={22} />}
              label={t("clinic.dashboard.kpi.newPatients")}
              value={formatNumber(overview.newPatients ?? 0)}
              hint={PERIOD_LABELS[period]}
              toneIndex={0}
            />
            <MetricCard
              icon={<CheckCircle size={22} />}
              label={t("clinic.dashboard.kpi.appointments")}
              value={formatNumber(overview.appointments ?? 0)}
              hint={`${t("clinic.dashboard.todayLabel")}: ${todayApps.length}`}
              toneIndex={1}
            />
            <MetricCard
              icon={<TrendingUp size={22} />}
              label={t("clinic.dashboard.kpi.revenue")}
              value={formatCurrency(overview.revenue ?? 0)}
              hint={t("clinic.finance.revenue")}
              toneIndex={2}
            />
            <MetricCard
              icon={<Activity size={22} />}
              label={t("clinic.dashboard.kpi.cancelRate")}
              value={`${overview.cancelRate ?? 0}%`}
              hint={t("clinic.finance.cancelRate")}
              toneIndex={3}
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.monthlyPatients")}
            subtitle={t("clinic.finance.monthlyStats")}
          />

          {loadingMonthly ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : errMonthly ? (
            <ErrorBanner message={errMonthly} onRetry={fetchMonthly} />
          ) : monthly.length === 0 ? (
            <EmptyState label={t("clinic.dashboard.noData")} />
          ) : (
            <div className="space-y-3">
              {monthly.map((item) => {
                const width = Math.max(8, Math.round((item.appointments / maxMonthAppointments) * 100));
                return (
                  <div
                    key={item.month}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{formatMonthLabel(item.month)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatNumber(item.appointments)} {t("clinic.finance.appointmentsCount")}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-extrabold text-slate-950">
                          {formatCurrency(item.revenue ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{t("clinic.finance.revenueCol")}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.todayQueue")}
            subtitle={`${todayApps.length} ${t("clinic.dashboard.appointmentsCount")}`}
          />

          {loadingQueue ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : errQueue ? (
            <ErrorBanner message={errQueue} onRetry={fetchQueue} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                {
                  label: t("clinic.dashboard.waiting"),
                  count: waiting,
                  icon: <Clock size={18} />,
                  className: "border-amber-200 bg-amber-50 text-amber-800",
                },
                {
                  label: t("clinic.dashboard.inProgress"),
                  count: inProgress,
                  icon: <Activity size={18} />,
                  className: "border-sky-200 bg-sky-50 text-sky-800",
                },
                {
                  label: t("clinic.dashboard.done"),
                  count: done,
                  icon: <CheckCircle size={18} />,
                  className: "border-emerald-200 bg-emerald-50 text-emerald-800",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[22px] border p-4 ${item.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
                      {item.icon}
                    </div>
                    <p className="text-3xl font-black">{item.count}</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.doctorsActivity")}
            subtitle={t("clinic.dashboard.byAppointments")}
          />

          {loadingDoctors ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : errDoctors ? (
            <ErrorBanner message={errDoctors} onRetry={fetchDoctors} />
          ) : doctors.length === 0 ? (
            <EmptyState label={t("clinic.dashboard.noData")} />
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor, index) => {
                const percent = Math.round((doctor.appointments / maxDoctorAppointments) * 100);
                const tone = KPI_TONES[index % KPI_TONES.length];
                const initial = (doctor.doctorName ?? "?").charAt(0).toUpperCase();

                return (
                  <div
                    key={doctor.doctorId}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm",
                          tone.iconWrap,
                        ].join(" ")}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {doctor.doctorName}
                          </p>
                          <span className="shrink-0 text-xs font-semibold text-slate-500">
                            {doctor.appointments} {t("clinic.dashboard.appointmentsCount")}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.latestLeads")}
            subtitle={t("clinic.leads.subtitle")}
          />

          {loadingLeads ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : errLeads ? (
            <ErrorBanner message={errLeads} onRetry={fetchLeads} />
          ) : leads.length === 0 ? (
            <EmptyState label={t("clinic.dashboard.noLeads")} />
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => {
                const summary = lead.notes
                  ? lead.notes.length > 88
                    ? `${lead.notes.slice(0, 88)}...`
                    : lead.notes
                  : null;

                return (
                  <div
                    key={lead.id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {lead.name ?? t("clinic.dashboard.withoutName")}
                          </p>
                          <span className="text-xs text-slate-400">{lead.phone}</span>
                        </div>
                        {summary ? (
                          <p className="mt-2 text-sm leading-6 text-slate-500">{summary}</p>
                        ) : null}
                      </div>
                      <span
                        className={[
                          "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          LEAD_STATUS_META[lead.status] ??
                            "border-slate-200 bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span>{formatLeadDate(lead.createdAt)}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                        Salomat AI
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.roomsToday")}
            subtitle={t("clinic.dashboard.appointmentsCount")}
          />

          {loadingRooms ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : errRooms ? (
            <ErrorBanner message={errRooms} onRetry={fetchRoomStats} />
          ) : roomStats.length === 0 ? (
            <EmptyState label={t("clinic.dashboard.noRooms")} />
          ) : (
            <div className="space-y-3">
              {roomStats.map((room) => {
                const percent = Math.round((room.todayAppointments / maxRoomAppointments) * 100);

                return (
                  <div
                    key={room.roomId}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <DoorOpen size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {room.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {room.floor != null
                                ? `${room.floor} ${t("clinic.rooms.floorSuffix")}`
                                : "-"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-slate-500">
                            {room.todayAppointments} {t("clinic.dashboard.appointmentsCount")}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-slate-700 to-teal-500"
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <Surface>
          <SectionHeader
            title={t("clinic.dashboard.topServices")}
            subtitle={t("clinic.dashboard.byAppointments")}
          />

          {loadingServices ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : errServices ? (
            <ErrorBanner message={errServices} onRetry={fetchServiceStats} />
          ) : visibleServiceStats.length === 0 ? (
            <EmptyState label={t("clinic.dashboard.noData")} />
          ) : (
            <div className="space-y-3">
              {visibleServiceStats.slice(0, 8).map((service, index) => {
                const percent = Math.round((service.count / maxServiceCount) * 100);

                return (
                  <div
                    key={service.serviceId}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                        <Stethoscope size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {service.serviceName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Top {index + 1}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-slate-500">
                            {service.count}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>

      <BookingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        onSuccess={() => setShowBooking(false)}
      />
    </div>
  );
}
