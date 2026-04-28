"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, DollarSign, Users, Download } from "lucide-react";
import { clinicApi, StatsOverview, MonthlyStats, DoctorStats } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import { useTranslation } from "react-i18next";
import "@/i18n";

function Skeleton({ className = "h-14" }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-xl bg-slate-100`} />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-500">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <RefreshCw size={13} /> {t("clinic.common.retry")}
      </button>
    </div>
  );
}

type Period = "today" | "week" | "month" | "year";

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-green-50 text-green-600",
  "bg-orange-50 text-orange-600",
  "bg-pink-50 text-pink-600",
];

const BADGE_RANKS = ["bg-amber-400", "bg-slate-400", "bg-yellow-700"];

export default function FinancePage() {
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<Period, string> = {
    today: t("clinic.finance.periodToday"),
    week:  t("clinic.finance.periodWeek"),
    month: t("clinic.finance.periodMonth"),
    year:  t("clinic.finance.periodYear"),
  };

  const [period, setPeriod] = useState<Period>("month");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [errOverview, setErrOverview] = useState<string | null>(null);
  const [errMonthly, setErrMonthly] = useState<string | null>(null);
  const [errDoctors, setErrDoctors] = useState<string | null>(null);
  const { toasts, toast, closeToast } = useToast();

  const fetchOverview = useCallback(async (p: Period) => {
    setLoadingOverview(true); setErrOverview(null);
    try { setOverview(await clinicApi.stats.overview(p)); }
    catch (e) { setErrOverview(e instanceof Error ? e.message : t("clinic.finance.errorLoad")); }
    finally { setLoadingOverview(false); }
  }, [t]);

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true); setErrMonthly(null);
    try { setMonthly(await clinicApi.stats.monthly()); }
    catch (e) { setErrMonthly(e instanceof Error ? e.message : t("clinic.finance.errorLoad")); }
    finally { setLoadingMonthly(false); }
  }, [t]);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); setErrDoctors(null);
    try { setDoctors(await clinicApi.stats.doctors()); }
    catch (e) { setErrDoctors(e instanceof Error ? e.message : t("clinic.finance.errorLoad")); }
    finally { setLoadingDoctors(false); }
  }, [t]);

  useEffect(() => { fetchOverview(period); }, [period, fetchOverview]);
  useEffect(() => { fetchMonthly(); fetchDoctors(); }, [fetchMonthly, fetchDoctors]);

  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);
  const maxDocRevenue = Math.max(...doctors.map((d) => d.revenue), 1);

  function exportCSV() {
    if (monthly.length === 0) { toast.warn(t("clinic.finance.noExportData")); return; }
    const header = [t("clinic.finance.month"), t("clinic.finance.appointmentsCount"), `${t("clinic.finance.revenueCol")} (${t("common.sum")})`];
    const rows = monthly.map((r) => [r.month, r.appointments, r.revenue]);
    const doctorTitle = [t("clinic.staff.title"), t("clinic.finance.appointmentsCount"), `${t("clinic.finance.revenueCol")} (${t("common.sum")})`];
    const doctorRows  = doctors.slice(0, 5).map((d) => [d.doctorName, d.appointments, d.revenue]);
    const allRows = [header, ...rows, [""], doctorTitle, ...doctorRows];
    const csv = allRows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `hamshirago-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const cardCls = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

  return (
    <div className="min-h-full space-y-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-950">{t("clinic.finance.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("clinic.finance.subtitle")}</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:border-teal-500 hover:text-teal-600"
        >
          <Download size={14} /> {t("clinic.finance.exportCsv")}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={[
              "rounded-xl border-[1.5px] px-4 py-2 text-sm font-semibold transition",
              period === p
                ? "border-teal-500 bg-teal-50 text-teal-600"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
            ].join(" ")}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {errOverview && <ErrorBanner message={errOverview} onRetry={() => fetchOverview(period)} />}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {loadingOverview ? (
          [1, 2, 3].map((i) => (
            <div key={i} className={cardCls}><Skeleton className="h-16" /></div>
          ))
        ) : overview ? (
          [
            {
              icon: <DollarSign size={22} className="text-teal-600" />,
              iconBg: "bg-teal-50",
              value: `${(overview.revenue ?? 0).toLocaleString("ru-RU")} ${t("common.sum")}`,
              label: t("clinic.finance.revenue"),
            },
            {
              icon: <Users size={22} className="text-blue-600" />,
              iconBg: "bg-blue-50",
              value: overview.appointments,
              label: t("clinic.finance.appointments"),
            },
            {
              icon: <TrendingUp size={22} className="text-purple-600" />,
              iconBg: "bg-purple-50",
              value: `${overview.cancelRate ?? 0}%`,
              label: t("clinic.finance.cancelRate"),
            },
          ].map(({ icon, iconBg, value, label }) => (
            <div key={label} className={cardCls}>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                  {icon}
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-950 leading-tight">{value}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{label}</div>
                </div>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* Monthly table */}
      <div className={cardCls}>
        <h2 className="mb-5 text-base font-bold text-slate-950">{t("clinic.finance.monthlyStats")}</h2>

        {errMonthly && <div className="mb-4"><ErrorBanner message={errMonthly} onRetry={fetchMonthly} /></div>}
        {loadingMonthly ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 rounded" />)}
          </div>
        ) : monthly.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("clinic.finance.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left font-semibold text-slate-500">{t("clinic.finance.month")}</th>
                  <th className="px-3 pb-3 text-right font-semibold text-slate-500">{t("clinic.finance.appointmentsCount")}</th>
                  <th className="px-3 pb-3 text-right font-semibold text-slate-500">{t("clinic.finance.revenueCol")}</th>
                  <th className="w-40 pb-3" />
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month} className="border-b border-slate-50">
                    <td className="py-2.5 font-semibold text-slate-700">{row.month}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{row.appointments}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      {(row.revenue ?? 0).toLocaleString("ru-RU")} {t("common.sum")}
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top doctors */}
      <div className={cardCls}>
        <h2 className="mb-5 text-base font-bold text-slate-950">{t("clinic.finance.topDoctors")}</h2>

        {errDoctors && <div className="mb-4"><ErrorBanner message={errDoctors} onRetry={fetchDoctors} /></div>}
        {loadingDoctors ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1"><Skeleton className="h-3.5 rounded" /></div>
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("clinic.finance.noData")}</p>
        ) : (
          <div className="space-y-4">
            {doctors.slice(0, 5).map((doc, idx) => {
              const avatarCls = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const pct = Math.round((doc.revenue / maxDocRevenue) * 100);
              return (
                <div key={doc.doctorId} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold ${avatarCls}`}>
                      {(doc.doctorName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    {idx < 3 && (
                      <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${BADGE_RANKS[idx]}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between">
                      <span className="truncate text-sm font-bold text-slate-950">{doc.doctorName}</span>
                      <span className="ml-2 shrink-0 text-sm font-bold text-teal-600">
                        {(doc.revenue ?? 0).toLocaleString("ru-RU")} {t("common.sum")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{doc.appointments} {t("clinic.finance.appointmentsCount")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
