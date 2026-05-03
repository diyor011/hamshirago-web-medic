"use client";

import { useEffect, useState } from "react";
import {
  Award, BarChart3, RefreshCw, TrendingUp, TrendingDown,
  Minus, Users, Star, AlertCircle, Info, Clock,
} from "lucide-react";
import { clinicApi, type ComparisonData } from "@/lib/clinicApi";
import PageHero, { HeroButton } from "@/components/clinic/PageHero";
import "@/i18n";

// ── Helpers ───────────────────────────────────────────────────────────────

function pct(v: number | undefined) {
  if (v == null) return "—";
  return `${Math.round(v)}%`;
}

function score(v: number | undefined) {
  if (v == null) return "—";
  return Math.round(v).toString();
}

function trend(v: number | undefined) {
  if (v == null) return null;
  const rounded = Math.round(v * 10) / 10;
  if (rounded > 0) return { label: `+${rounded}`, color: "#16a34a", Icon: TrendingUp };
  if (rounded < 0) return { label: `${rounded}`, color: "#ef4444", Icon: TrendingDown };
  return { label: "0", color: "#64748b", Icon: Minus };
}

// ── Score ring ────────────────────────────────────────────────────────────

function ScoreRing({ value }: { value: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * (value / 100);
  const color = value >= 70 ? "#0d9488" : value >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={64} cy={64} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={64} cy={64} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dasharray 800ms ease" }}
      />
      <text x={64} y={58} textAnchor="middle" fontSize={28} fontWeight={800} fill="#0f172a">{value}</text>
      <text x={64} y={76} textAnchor="middle" fontSize={11} fill="#94a3b8">/100</text>
    </svg>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────

const METRIC_META: Record<string, { label: string; format: (v: number) => string; hint: string }> = {
  fillRate:      { label: "Заполненность", format: (v) => `${Math.round(v)}%`, hint: "% слотов занято" },
  noShowRate:    { label: "Неявки",        format: (v) => `${Math.round(v)}%`, hint: "% пациентов не пришло" },
  repeatRate:    { label: "Повторность",   format: (v) => `${Math.round(v)}%`, hint: "% повторных визитов" },
  avgRating:     { label: "Рейтинг",       format: (v) => v.toFixed(1),        hint: "Средняя оценка" },
  responseTime:  { label: "Время ответа",  format: (v) => `${Math.round(v)} ч`, hint: "Среднее время до ответа" },
  revenueGrowth: { label: "Рост выручки",  format: (v) => `${v > 0 ? "+" : ""}${Math.round(v)}%`, hint: "30-дневный тренд" },
};

function MetricRow({
  metricKey, value, peerMedian,
}: {
  metricKey: string;
  value: number;
  peerMedian?: number;
}) {
  const meta = METRIC_META[metricKey];
  if (!meta) return null;

  const isGoodHigh = metricKey !== "noShowRate" && metricKey !== "responseTime";
  const vsMedian = peerMedian != null ? value - peerMedian : null;
  const isGood = vsMedian == null ? null : isGoodHigh ? vsMedian >= 0 : vsMedian <= 0;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-700">{meta.label}</p>
        <p className="text-[11px] text-slate-400">{meta.hint}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[15px] font-bold text-slate-900">{meta.format(value)}</p>
        {peerMedian != null && (
          <p className={`text-[11px] font-semibold ${isGood ? "text-emerald-600" : "text-red-500"}`}>
            медиана: {meta.format(peerMedian)}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function RatingsPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    clinicApi.comparison.get()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try { await clinicApi.comparison.get().then(setData); }
    catch { /* ignore, use cached */ }
    finally { setRefreshing(false); }
  }

  const trendInfo = trend(data?.trend30d);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <AlertCircle className="text-red-400" size={36} />
        <p className="text-[15px] font-semibold text-slate-700">{error}</p>
        <button
          onClick={load}
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!data?.ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 text-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Clock size={28} className="text-amber-500" />
        </div>
        <div>
          <p className="text-[16px] font-bold text-slate-800">Данные формируются</p>
          <p className="mt-1.5 text-[13px] text-slate-500 max-w-sm">
            {data?.message ?? "Рейтинговый снапшот вычисляется ежедневно в 04:17. Данные появятся после первого запуска."}
          </p>
        </div>
      </div>
    );
  }

  const metrics = data.metrics ?? {};
  const metricEntries = Object.entries(metrics).filter(([, v]) => v != null) as [string, number][];

  return (
    <div className="space-y-5">

      {/* Hero */}
      <PageHero
        title="Рейтинг клиники"
        subtitle="Комплексный балл и сравнение с когортой клиник"
        badge={<><Award size={12} /> Clinic OS</>}
        accent="violet"
        actions={
          <HeroButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Обновить
          </HeroButton>
        }
      />

      {/* ── Score hero ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <ScoreRing value={data.compositeScore ?? 0} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-teal-200 mb-1">Комплексный балл</p>
            <div className="flex items-center gap-2 mb-3">
              <Award size={18} className="text-yellow-300" />
              <span className="text-[22px] font-black">
                {data.rank != null ? `#${data.rank}` : "—"} из {data.cohortSize ?? "?"}
              </span>
            </div>
            {data.percentile != null && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-[12px] font-bold mb-3">
                <BarChart3 size={13} />
                Топ {Math.round(100 - data.percentile)}% клиник
              </div>
            )}
            {trendInfo && (
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                <trendInfo.Icon size={14} style={{ color: trendInfo.color === "#16a34a" ? "#86efac" : trendInfo.color === "#ef4444" ? "#fca5a5" : "#cbd5e1" }} />
                <span style={{ color: trendInfo.color === "#16a34a" ? "#86efac" : trendInfo.color === "#ef4444" ? "#fca5a5" : "#cbd5e1" }}>
                  {trendInfo.label} за 30 дней
                </span>
              </div>
            )}
          </div>
        </div>
        {data.peerMedian != null && (
          <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 flex items-center gap-3">
            <Users size={15} className="text-teal-200 shrink-0" />
            <div>
              <p className="text-[11px] text-teal-200">Медиана по когорте</p>
              <p className="text-[15px] font-bold">{Math.round(data.peerMedian)} / 100</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      {metricEntries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <BarChart3 size={16} className="text-teal-600" />
            <h2 className="text-[14px] font-bold text-slate-800">Метрики</h2>
          </div>
          <div className="px-5 divide-y divide-slate-100">
            {metricEntries.map(([key, value]) => {
              const weakSpot = data.weakSpots?.find((w) => w.metric === key);
              return (
                <MetricRow
                  key={key}
                  metricKey={key}
                  value={value}
                  peerMedian={weakSpot?.peerMedian}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weak spots ──────────────────────────────────────────────────── */}
      {data.weakSpots && data.weakSpots.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-4">
            <AlertCircle size={16} className="text-amber-500" />
            <h2 className="text-[14px] font-bold text-slate-800">Зоны роста</h2>
          </div>
          <div className="p-5 space-y-3">
            {data.weakSpots.map((ws) => {
              const meta = METRIC_META[ws.metric];
              return (
                <div key={ws.metric} className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-200 flex items-center justify-center">
                    <Info size={11} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">
                      {meta?.label ?? ws.metric}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      Ваш показатель: <b>{meta ? meta.format(ws.value) : ws.value}</b> · Медиана: <b>{meta ? meta.format(ws.peerMedian) : ws.peerMedian}</b>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Info ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-100 px-4 py-3 flex items-start gap-3">
        <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Рейтинг обновляется ежедневно в 04:17 по UTC. Когорта — клиники схожего размера в вашем регионе. Данные анонимизированы.
        </p>
      </div>

    </div>
  );
}
