"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Users, XCircle, Home, Crown, ArrowRight,
  CalendarDays, CheckCircle2, ArrowUpRight, Minus,
  Download, RefreshCw, Banknote, Activity,
} from "lucide-react";
import Link from "next/link";
import {
  clinicApi, StatsOverview, MonthlyStats, DoctorStats, ClinicSubscription,
} from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import "@/i18n";

type Period = "today" | "week" | "month" | "year";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "h-8 rounded-xl" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 ${className}`} />;
}

function SkLight({ className = "h-8 rounded-xl" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 ${className}`} />;
}

// ─── Revenue Hero ─────────────────────────────────────────────────────────────

const PERIOD_META: Record<Period, { label: string; hint: string }> = {
  today: { label: "Сегодня",  hint: "за сегодня" },
  week:  { label: "Неделя",   hint: "за эту неделю" },
  month: { label: "Месяц",    hint: "за этот месяц" },
  year:  { label: "Год",      hint: "за этот год" },
};

function RevenueHero({
  overview, loading, period, onPeriod, onExport,
}: {
  overview: StatsOverview | null;
  loading: boolean;
  period: Period;
  onPeriod: (p: Period) => void;
  onExport: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-[#0f172a] to-teal-950 p-6 text-white shadow-2xl shadow-slate-950/50 sm:p-8">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-teal-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-[60px]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* left — number */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
              <Banknote size={16} className="text-white" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-teal-400/90">
              Выручка клиники · {PERIOD_META[period].hint}
            </p>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <Sk className="h-16 w-80 rounded-2xl" />
              <Sk className="h-5 w-56 rounded-lg opacity-50" />
            </div>
          ) : overview ? (
            <>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-6xl font-black leading-none tracking-tight drop-shadow-sm sm:text-7xl">
                  {fmt(overview.revenue ?? 0)}
                </span>
                <span className="text-2xl font-semibold text-teal-500/80">сум</span>
              </div>
              
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                  <ArrowUpRight size={12} strokeWidth={3} /> 
                  <span>от приёмов в клинике</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/5 pt-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Комиссия лидов</p>
                  <p className="mt-1 text-xl font-black text-white">
                    {fmt(overview.commission ?? 0)} <span className="text-teal-600/60 text-sm font-bold">сум</span>
                  </p>
                </div>
                <div className="h-10 w-px bg-white/5" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Новых пациентов</p>
                  <p className="mt-1 text-xl font-black text-white">{overview.newPatients}</p>
                </div>
                <div className="h-10 w-px bg-white/5" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Активных лидов</p>
                  <p className="mt-1 text-xl font-black text-white">{overview.activeLeads}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 border border-white/5">
              <Activity size={16} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-400 text-balance">Нет данных за выбранный период. Аналитика обновится после завершения приёмов.</p>
            </div>
          )}
        </div>

        {/* right — controls */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-md">
            {(Object.keys(PERIOD_META) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriod(p)}
                className={[
                  "cursor-pointer rounded-xl px-4 py-2 text-[12px] font-bold transition-all duration-200",
                  period === p
                    ? "bg-teal-500 text-white shadow-xl shadow-teal-500/40 scale-[1.02]"
                    : "text-slate-400 hover:bg-white/10 hover:text-slate-200",
                ].join(" ")}
              >
                {PERIOD_META[p].label}
              </button>
            ))}
          </div>
          <button
            onClick={onExport}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-[12px] font-bold text-slate-300 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
          >
            <Download size={14} strokeWidth={2.5} /> 
            <span>Экспорт данных</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCards({
  overview, loading,
}: {
  overview: StatsOverview | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <SkLight key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  if (!overview) return null;

  const cancelRate = overview.cancelRate ?? 0;
  const convRate   = overview.conversionRate ?? 0;

  const cards = [
    {
      label:  "Приёмов",
      value:  overview.appointments,
      sub:    "за выбранный период",
      icon:   <Activity size={18} />,
      iconBg: "bg-blue-500",
      numCls: "text-blue-600",
      trend:  overview.appointments > 0 ? "up" as const : "neutral" as const,
    },
    {
      label:  "Отмены",
      value:  `${cancelRate}%`,
      sub:    "от всех приёмов",
      icon:   <XCircle size={18} />,
      iconBg: cancelRate > 15 ? "bg-red-500"   : "bg-slate-400",
      numCls: cancelRate > 15 ? "text-red-500" : "text-slate-600",
      trend:  cancelRate > 15 ? "down" as const : "neutral" as const,
    },
    {
      label:  "Конверсия лидов",
      value:  `${convRate}%`,
      sub:    "лид → приём",
      icon:   <TrendingUp size={18} />,
      iconBg: "bg-emerald-500",
      numCls: "text-emerald-600",
      trend:  convRate > 30 ? "up" as const : "neutral" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80 transition-shadow duration-200 hover:shadow-md"
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${c.iconBg}`}>
            {c.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-end gap-1.5">
              <span className={`text-2xl font-black leading-none ${c.numCls}`}>{c.value}</span>
              {c.trend === "up"      && <ArrowUpRight size={14} className="mb-0.5 text-emerald-500" />}
              {c.trend === "down"    && <ArrowUpRight size={14} className="mb-0.5 rotate-90 text-red-400" />}
              {c.trend === "neutral" && <Minus size={12} className="mb-1 text-slate-300" />}
            </div>
            <p className="mt-1 text-[13px] font-semibold text-slate-700">{c.label}</p>
            <p className="text-[11px] text-slate-400">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Monthly Trend ────────────────────────────────────────────────────────────

function MonthlyTrend({
  monthly, loading, error, onRetry,
}: {
  monthly: MonthlyStats[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const maxRev = Math.max(...monthly.map((m) => m.revenue), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-100/80">
      <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
        <div>
          <p className="text-[15px] font-bold text-slate-900">Динамика по месяцам</p>
          <p className="mt-0.5 text-[12px] text-slate-400">Выручка и количество приёмов</p>
        </div>
        {error && (
          <button
            onClick={onRetry}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-500 transition hover:bg-red-100"
          >
            <RefreshCw size={11} /> Повторить
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 p-6">
          {[1, 2, 3, 4, 5].map((i) => <SkLight key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : monthly.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <TrendingUp size={24} className="text-slate-300" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-600">Ещё нет данных</p>
            <p className="mt-1 text-[12px] text-slate-400">Статистика появится после первых приёмов</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Месяц</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Приёмов</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Выручка</th>
                <th className="w-40 px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">График</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row, i) => {
                const barPct = Math.round((row.revenue / maxRev) * 100);
                return (
                  <tr
                    key={row.month}
                    className={[
                      "transition-colors duration-150 hover:bg-slate-50/80",
                      i < monthly.length - 1 ? "border-b border-slate-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{row.month}</td>
                    <td className="px-4 py-4 text-right text-[13px] text-slate-500">{row.appointments}</td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-[14px] font-bold text-emerald-600">{fmt(row.revenue ?? 0)}</span>
                      <span className="ml-1 text-[11px] text-slate-400">сум</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-400 transition-all duration-700"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Top Doctors ──────────────────────────────────────────────────────────────

const RANK_RING = [
  "ring-2 ring-amber-400/60",
  "ring-2 ring-slate-300/80",
  "ring-2 ring-orange-400/60",
];
const RANK_BADGE = ["bg-amber-400", "bg-slate-400", "bg-orange-400"];
const AVATAR_BG  = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

function TopDoctors({
  doctors, loading, error, onRetry,
}: {
  doctors: DoctorStats[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const maxRev = Math.max(...doctors.map((d) => d.revenue), 1);
  const total  = doctors.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-100/80">
      <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
        <div>
          <p className="text-[15px] font-bold text-slate-900">Топ врачей по выручке</p>
          <p className="mt-0.5 text-[12px] text-slate-400">Рейтинг за выбранный период</p>
        </div>
        {error && (
          <button onClick={onRetry} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-500 transition hover:bg-red-100">
            <RefreshCw size={11} /> Повторить
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <SkLight className="h-11 w-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkLight className="h-3 rounded-lg" />
                <SkLight className="h-2 w-2/3 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <Users size={24} className="text-slate-300" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-600">Нет данных по врачам</p>
            <p className="mt-1 text-[12px] text-slate-400">Добавьте врачей и приёмы появятся здесь</p>
          </div>
        </div>
      ) : (
        <div>
          {doctors.slice(0, 5).map((doc, idx) => {
            const isTop    = idx === 0;
            const barPct   = Math.round((doc.revenue / maxRev) * 100);
            const share    = total > 0 ? Math.round((doc.revenue / total) * 100) : 0;
            const avatarCls = AVATAR_BG[idx % AVATAR_BG.length];
            const ringCls  = RANK_RING[idx] ?? "";
            const badgeCls = RANK_BADGE[idx] ?? "";

            return (
              <div
                key={doc.doctorId}
                className={[
                  "flex items-center gap-4 px-6 py-4 transition-colors duration-150",
                  idx < doctors.slice(0, 5).length - 1 ? "border-b border-slate-50" : "",
                  isTop ? "bg-linear-to-r from-amber-50/60 to-transparent hover:from-amber-50" : "hover:bg-slate-50/60",
                ].join(" ")}
              >
                {/* avatar */}
                <div className="relative shrink-0">
                  <div className={[
                    "flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-extrabold",
                    avatarCls, ringCls,
                  ].join(" ")}>
                    {(doc.doctorName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  {idx < 3 && (
                    <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${badgeCls}`}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={[
                      "truncate text-[13px] font-bold",
                      isTop ? "text-amber-900" : "text-slate-800",
                    ].join(" ")}>
                      {doc.doctorName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {share}%
                      </span>
                      <span className="text-[13px] font-black text-emerald-600">
                        {fmt(doc.revenue ?? 0)}<span className="ml-0.5 text-[10px] font-normal text-slate-400">сум</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={[
                          "h-full rounded-full transition-all duration-700",
                          isTop
                            ? "bg-linear-to-r from-amber-400 to-yellow-300"
                            : "bg-linear-to-r from-slate-300 to-slate-200",
                        ].join(" ")}
                        style={{ width: `${Math.max(barPct, 6)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">{doc.appointments} приёмов</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Home Orders Card ─────────────────────────────────────────────────────────

function HomeOrdersCard({
  overview, loading,
}: {
  overview: StatsOverview | null;
  loading: boolean;
}) {
  const hasData = overview != null && overview.homeOrdersCommission != null;
  const pct = hasData && (overview!.revenue ?? 0) > 0
    ? Math.round((overview!.homeOrdersCommission! / overview!.revenue!) * 100)
    : 0;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100/80">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <Home size={18} className="text-teal-600" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-900">Заказы на дом</p>
          <p className="text-[11px] text-slate-400">Комиссия с выездных услуг</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 space-y-3">
          <SkLight className="h-10 rounded-xl" />
          <SkLight className="h-2.5 rounded-full" />
          <SkLight className="h-3 w-1/2 rounded-lg" />
        </div>
      ) : hasData ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black leading-none text-slate-900">
                {fmt(overview!.homeOrdersCommission!)}
              </span>
              <span className="mb-1 text-[14px] font-medium text-slate-400">сум</span>
            </div>
            {overview!.homeOrdersCount != null && (
              <p className="mt-1.5 text-[12px] text-slate-500">
                {overview!.homeOrdersCount} заказов выполнено
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Доля в общей выручке</span>
              <span className="text-[12px] font-bold text-teal-600">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <Link
            href="/clinic/home-orders"
            className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600 transition-all duration-150 hover:bg-teal-50 hover:text-teal-700"
          >
            Перейти к заказам
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
            <Home size={22} className="text-slate-300" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-700">Пока нет заказов на дом</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
              Аналитика появится после первых выездов
            </p>
          </div>
          <Link
            href="/clinic/home-orders"
            className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-teal-700"
          >
            К заказам <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

const PLAN_CLS: Record<string, string> = {
  PRO:    "bg-blue-50 text-blue-700 border-blue-200",
  MAX:    "bg-purple-50 text-purple-700 border-purple-200",
  CUSTOM: "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_CLS: Record<string, { dot: string; text: string; label: string }> = {
  ACTIVE:    { dot: "bg-emerald-500", text: "text-emerald-600", label: "Активна"  },
  EXPIRED:   { dot: "bg-red-400",     text: "text-red-500",     label: "Истекла"  },
  CANCELLED: { dot: "bg-slate-300",   text: "text-slate-400",   label: "Отменена" },
};

function SubscriptionCard({
  sub, loading,
}: {
  sub: ClinicSubscription | null;
  loading: boolean;
}) {
  const plan      = sub?.plan ?? "PRO";
  const rawStatus = (sub as unknown as { status?: string })?.status ?? "ACTIVE";
  const st        = STATUS_CLS[rawStatus] ?? STATUS_CLS.ACTIVE;
  const planCls   = PLAN_CLS[plan] ?? PLAN_CLS.PRO;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100/80">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <Crown size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-900">Подписка</p>
            <p className="text-[11px] text-slate-400">Тариф платформы</p>
          </div>
        </div>
        <Link
          href="/clinic/subscription"
          className="flex cursor-pointer items-center gap-1 text-[12px] font-semibold text-teal-600 transition hover:text-teal-700"
        >
          Управлять <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 space-y-3">
          <SkLight className="h-9 w-28 rounded-xl" />
          <SkLight className="h-3 rounded-lg" />
          <SkLight className="h-3 w-3/4 rounded-lg" />
        </div>
      ) : sub ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold ${planCls}`}>
              <Crown size={11} /> {plan}
            </span>
            <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${st.text}`}>
              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </div>

          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-black leading-none text-slate-900">${sub.priceUsd}</span>
            <span className="mb-0.5 text-[13px] font-medium text-slate-400">/мес</span>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3">
            {sub.startedAt && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Активна с
                </span>
                <span className="font-semibold text-slate-700">{formatDate(sub.startedAt)}</span>
              </div>
            )}
            {sub.expiresAt && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CalendarDays size={12} className="text-blue-400" /> Следующий платёж
                </span>
                <span className="font-semibold text-slate-700">{formatDate(sub.expiresAt)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Crown size={22} className="text-amber-300" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-700">Тариф не выбран</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
              Активируйте тариф для доступа<br />ко всем функциям
            </p>
          </div>
          <Link
            href="/clinic/subscription"
            className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-amber-600"
          >
            Выбрать тариф <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [period,       setPeriod]       = useState<Period>("month");
  const [overview,     setOverview]     = useState<StatsOverview | null>(null);
  const [monthly,      setMonthly]      = useState<MonthlyStats[]>([]);
  const [doctors,      setDoctors]      = useState<DoctorStats[]>([]);
  const [subscription, setSubscription] = useState<ClinicSubscription | null>(null);

  const [loadingOverview,     setLoadingOverview]     = useState(true);
  const [loadingMonthly,      setLoadingMonthly]      = useState(true);
  const [loadingDoctors,      setLoadingDoctors]      = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const [errMonthly, setErrMonthly] = useState<string | null>(null);
  const [errDoctors, setErrDoctors] = useState<string | null>(null);

  const { toasts, toast, closeToast } = useToast();

  const fetchOverview = useCallback(async (p: Period) => {
    setLoadingOverview(true);
    try   { setOverview(await clinicApi.stats.overview(p)); }
    catch { /* silent */ }
    finally { setLoadingOverview(false); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true); setErrMonthly(null);
    try   { setMonthly(await clinicApi.stats.monthly()); }
    catch (e) { setErrMonthly(e instanceof Error ? e.message : "Ошибка"); }
    finally   { setLoadingMonthly(false); }
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); setErrDoctors(null);
    try   { setDoctors(await clinicApi.stats.doctors()); }
    catch (e) { setErrDoctors(e instanceof Error ? e.message : "Ошибка"); }
    finally   { setLoadingDoctors(false); }
  }, []);

  const fetchSub = useCallback(async () => {
    setLoadingSubscription(true);
    try   { setSubscription(await clinicApi.subscription.get()); }
    catch { /* 404 = нет подписки */ }
    finally { setLoadingSubscription(false); }
  }, []);

  useEffect(() => { fetchOverview(period); }, [period, fetchOverview]);
  useEffect(() => {
    fetchMonthly();
    fetchDoctors();
    fetchSub();
  }, [fetchMonthly, fetchDoctors, fetchSub]);

  function exportCSV() {
    if (monthly.length === 0) { toast.warn("Нет данных для экспорта"); return; }
    const rows = [
      ["Месяц", "Приёмов", "Выручка (сум)"],
      ...monthly.map((r) => [r.month, r.appointments, r.revenue]),
    ];
    const csv  = rows.map((r) => r.map(String).map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
      href: url, download: `finance-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full space-y-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Финансы</h1>
        <p className="mt-1 text-sm text-slate-500">Аналитика доходов и эффективности клиники</p>
      </div>

      {/* Hero */}
      <RevenueHero
        overview={overview}
        loading={loadingOverview}
        period={period}
        onPeriod={setPeriod}
        onExport={exportCSV}
      />

      {/* KPIs */}
      <KpiCards overview={overview} loading={loadingOverview} />

      {/* Secondary — home orders + subscription */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HomeOrdersCard  overview={overview} loading={loadingOverview} />
        <SubscriptionCard sub={subscription} loading={loadingSubscription} />
      </div>

      {/* Two-col analytics */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <MonthlyTrend
          monthly={monthly}
          loading={loadingMonthly}
          error={errMonthly}
          onRetry={fetchMonthly}
        />
        <TopDoctors
          doctors={doctors}
          loading={loadingDoctors}
          error={errDoctors}
          onRetry={fetchDoctors}
        />
      </div>
    </div>
  );
}
