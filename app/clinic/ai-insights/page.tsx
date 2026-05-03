"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, AlertTriangle, TrendingUp, Users, Star,
  RefreshCw, Clock, Send, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Info, Crown,
} from "lucide-react";
import {
  clinicApi,
  type NoShowRiskItem,
  type DemandForecastItem,
  type ChurnPatient,
  type LtvPatient,
  type ServiceMixRecommendation,
  type ClinicSubscription,
} from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import PageHero, { HeroButton } from "@/components/clinic/PageHero";
import "@/i18n";

type Tab = "no-show" | "demand" | "churn" | "ltv" | "service-mix";

const TABS: { key: Tab; label: string; icon: React.FC<{ size: number; className?: string }> }[] = [
  { key: "no-show",      label: "Неявки",        icon: AlertTriangle },
  { key: "demand",       label: "Спрос",         icon: TrendingUp },
  { key: "churn",        label: "Отток",         icon: Users },
  { key: "ltv",          label: "LTV",           icon: Star },
  { key: "service-mix",  label: "Рекомендации",  icon: Sparkles },
];

const RISK_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  high: { label: "Высокий",  bg: "#fef2f2",   text: "#b91c1c", border: "#fca5a5" },
  med:  { label: "Средний",  bg: "#fffbeb",   text: "#92400e", border: "#fcd34d" },
  low:  { label: "Низкий",   bg: "#f0fdf4",   text: "#166534", border: "#86efac" },
};

const SEG_META: Record<string, { label: string; bg: string; text: string }> = {
  vip:    { label: "VIP",    bg: "#faf5ff", text: "#7c3aed" },
  high:   { label: "High",   bg: "#eff6ff", text: "#1d4ed8" },
  medium: { label: "Medium", bg: "#f0fdfa", text: "#0f766e" },
};

const SEV_META: Record<string, { bg: string; text: string; border: string; icon: React.FC<{ size: number }> }> = {
  opportunity: { bg: "#f0fdf4", text: "#166534", border: "#86efac", icon: TrendingUp },
  warning:     { bg: "#fffbeb", text: "#92400e", border: "#fcd34d", icon: AlertTriangle },
  info:        { bg: "#eff6ff", text: "#1e3a8a", border: "#bfdbfe", icon: Info },
};

function fmt(n: number) { return n.toLocaleString("ru-RU"); }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function NotReady({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
        <Clock size={24} className="text-amber-500" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-slate-800">Данные формируются</p>
        <p className="mt-1.5 text-[13px] text-slate-500 max-w-xs">
          {message ?? "AI-инсайты обновляются ежедневно в 04:17 UTC. Данные появятся после первого запуска."}
        </p>
      </div>
    </div>
  );
}

// ── No-show risk ─────────────────────────────────────────────────────────

function NoShowTab({ items }: { items: NoShowRiskItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle2 size={32} className="text-emerald-400" />
        <p className="text-[14px] font-semibold text-slate-600">Нет записей с высоким риском неявки</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-slate-500 pb-1">
        {items.length} записей в ближайшие 14 дней · сортировка по риску
      </p>
      {items.map((item) => {
        const meta = RISK_META[item.level] ?? RISK_META.low;
        const isOpen = expanded === item.appointmentId;
        return (
          <div
            key={item.appointmentId}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: meta.border, background: "#fff" }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : item.appointmentId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-black"
                style={{ background: meta.bg, color: meta.text }}
              >
                {item.risk}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{item.patientName}</p>
                <p className="text-[11px] text-slate-500">{formatDate(item.scheduledAt)} · {item.patientPhone}</p>
              </div>
              <div
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ background: meta.bg, color: meta.text }}
              >
                {meta.label}
              </div>
              {isOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
            </button>
            {isOpen && item.reasons.length > 0 && (
              <div className="border-t px-4 py-3" style={{ borderColor: meta.border, background: meta.bg }}>
                <p className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Причины</p>
                <div className="space-y-1">
                  {item.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] text-slate-700">
                      <div className="h-1.5 w-1.5 rounded-full bg-current shrink-0" style={{ color: meta.text }} />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Demand forecast ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  CONSULTATION: "Консультации",
  LAB: "Лаборатория",
  DIAGNOSTIC: "Диагностика",
  PROCEDURE: "Процедуры",
};

function DemandTab({ items }: { items: DemandForecastItem[] }) {
  const categories = Array.from(new Set(items.map((i) => i.category)));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <TrendingUp size={32} className="text-slate-300" />
        <p className="text-[14px] text-slate-500">Нет данных прогноза</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        return (
          <div key={cat} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[13px] font-bold text-slate-700">{CATEGORY_LABELS[cat] ?? cat}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {catItems.map((item) => {
                const confColor = item.confidence === "high" ? "text-emerald-600" : item.confidence === "med" ? "text-amber-600" : "text-slate-400";
                const maxVal = Math.max(item.median, item.recentAvg, 1);
                return (
                  <div key={item.week} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-semibold text-slate-700">{item.week}</p>
                      <span className={`text-[11px] font-bold ${confColor}`}>
                        {item.confidence === "high" ? "↑ высокая" : item.confidence === "med" ? "~ средняя" : "↓ низкая"} уверенность
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-[11px] text-slate-500 shrink-0">Медиана</span>
                        <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${(item.median / maxVal) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-[12px] font-bold text-slate-700 shrink-0">{item.median}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-[11px] text-slate-500 shrink-0">Факт (мес.)</span>
                        <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-slate-400" style={{ width: `${(item.recentAvg / maxVal) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-[12px] font-bold text-slate-700 shrink-0">{item.recentAvg}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Churn ─────────────────────────────────────────────────────────────────

function ChurnTab({ items }: { items: ChurnPatient[] }) {
  const { showToast } = useToast();
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  async function handleSend(patient: ChurnPatient) {
    if (sent.has(patient.patientPhone)) return;
    setSending(patient.patientPhone);
    try {
      await clinicApi.ai.sendChurnSms(patient.patientPhone);
      setSent((s) => new Set(s).add(patient.patientPhone));
      showToast(`SMS отправлено ${patient.patientName}`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка отправки SMS", "error");
    } finally {
      setSending(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 size={32} className="text-emerald-400" />
        <p className="text-[14px] font-semibold text-slate-600">Нет пациентов в зоне оттока</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-slate-500 pb-1">{items.length} пациентов · просрочены на &gt;30 дней</p>
      {items.map((p) => {
        const isSent = sent.has(p.patientPhone);
        const isSending = sending === p.patientPhone;
        return (
          <div key={p.patientId} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-800">{p.patientName}</p>
                <p className="text-[12px] text-slate-500">{p.patientPhone}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Последний визит: {new Date(p.lastVisit).toLocaleDateString("ru-RU")} ·{" "}
                  <span className="font-semibold text-orange-600">{p.daysSinceLastVisit} дней назад</span>
                </p>
              </div>
              <button
                onClick={() => handleSend(p)}
                disabled={isSent || isSending}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all disabled:opacity-50"
                style={{
                  background: isSent ? "#f0fdf4" : "#0d9488",
                  color: isSent ? "#16a34a" : "#fff",
                  border: isSent ? "1px solid #86efac" : "none",
                }}
              >
                {isSent
                  ? <><CheckCircle2 size={13} /> Отправлено</>
                  : isSending
                  ? <><RefreshCw size={13} className="animate-spin" /> Отправка...</>
                  : <><Send size={13} /> SMS</>
                }
              </button>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-100">
              <p className="text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wide">Текст SMS</p>
              <p className="text-[12px] text-slate-700 leading-relaxed">{p.smsText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LTV ───────────────────────────────────────────────────────────────────

function LtvTab({ items }: { items: LtvPatient[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Star size={32} className="text-slate-300" />
        <p className="text-[14px] text-slate-500">Нет данных LTV</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((p, idx) => {
        const seg = SEG_META[p.segment] ?? SEG_META.medium;
        return (
          <div key={p.patientId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="w-6 shrink-0 text-[13px] font-bold text-slate-400">#{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800 truncate">{p.patientName}</p>
              <p className="text-[11px] text-slate-500">{p.patientPhone} · {p.totalVisits} визитов · {fmt(p.totalSpent)} сум</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px] font-black text-teal-700">{fmt(p.predictedLtv)} сум</p>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5"
                style={{ background: seg.bg, color: seg.text }}
              >
                {seg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Service mix ───────────────────────────────────────────────────────────

function ServiceMixTab({ items }: { items: ServiceMixRecommendation[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Sparkles size={32} className="text-slate-300" />
        <p className="text-[14px] text-slate-500">Нет рекомендаций</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((rec, idx) => {
        const meta = SEV_META[rec.severity] ?? SEV_META.info;
        const Icon = meta.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border p-4"
            style={{ background: meta.bg, borderColor: meta.border }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <Icon size={16} style={{ color: meta.text }} />
              </div>
              <div>
                <p className="text-[14px] font-bold" style={{ color: meta.text }}>{rec.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: meta.text, opacity: 0.8 }}>{rec.body}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function AiInsightsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("no-show");
  const [refreshing, setRefreshing] = useState(false);

  const [noShow, setNoShow]   = useState<NoShowRiskItem[] | null>(null);
  const [demand, setDemand]   = useState<DemandForecastItem[] | null>(null);
  const [churn, setChurn]     = useState<ChurnPatient[] | null>(null);
  const [ltv, setLtv]         = useState<LtvPatient[] | null>(null);
  const [mix, setMix]         = useState<ServiceMixRecommendation[] | null>(null);
  const [notReady, setNotReady] = useState<{ ready: false; message?: string } | null>(null);

  const [sub, setSub] = useState<ClinicSubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clinicApi.subscription.get()
      .then(setSub)
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        clinicApi.ai.noShowRisk(),
        clinicApi.ai.demandForecast(),
        clinicApi.ai.churn(),
        clinicApi.ai.ltv(),
        clinicApi.ai.serviceMix(),
      ]);

      const firstNotReady = [r1, r2, r3, r4, r5].find(
        (r) => r.status === "fulfilled" && !r.value.ready
      );
      if (firstNotReady && firstNotReady.status === "fulfilled") {
        setNotReady({ ready: false, message: firstNotReady.value.message });
      } else {
        setNotReady(null);
      }

      if (r1.status === "fulfilled" && r1.value.ready) setNoShow(r1.value.data ?? []);
      if (r2.status === "fulfilled" && r2.value.ready) setDemand(r2.value.data ?? []);
      if (r3.status === "fulfilled" && r3.value.ready) setChurn(r3.value.data ?? []);
      if (r4.status === "fulfilled" && r4.value.ready) setLtv(r4.value.data ?? []);
      if (r5.status === "fulfilled" && r5.value.ready) setMix(r5.value.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await clinicApi.ai.refresh();
      showToast("Данные обновляются...", "success");
      await loadAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка обновления", "error");
    } finally {
      setRefreshing(false);
    }
  }

  // MAX-тариф guard
  if (!subLoading && sub && sub.plan !== "MAX" && sub.plan !== "CUSTOM") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 text-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
          <Crown size={28} className="text-violet-500" />
        </div>
        <div>
          <p className="text-[18px] font-black text-slate-800">Только для MAX</p>
          <p className="mt-2 text-[13px] text-slate-500 max-w-sm">
            AI-инсайты доступны на тарифе MAX. Upgrade откроет: прогнозирование неявок, прогноз спроса, управление оттоком, LTV-анализ и рекомендации по услугам.
          </p>
        </div>
        <a
          href="/clinic/subscription"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
        >
          <Crown size={15} /> Перейти на MAX
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-[15px] font-semibold text-slate-700">{error}</p>
        <button onClick={loadAll} className="rounded-xl bg-teal-600 px-6 py-2.5 text-[13px] font-bold text-white hover:opacity-90">
          Повторить
        </button>
      </div>
    );
  }

  if (notReady) {
    return <NotReady message={notReady.message} />;
  }

  return (
    <div className="space-y-5">
      <ToastContainer />

      {/* Hero */}
      <PageHero
        title="AI Инсайты"
        subtitle="Предиктивная аналитика на основе данных клиники · только MAX тариф"
        badge={<><Sparkles size={12} /> Clinic OS</>}
        accent="violet"
        actions={
          <HeroButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Обновляем..." : "Обновить"}
          </HeroButton>
        }
      />

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all",
              tab === key
                ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="min-h-[300px]">
        {tab === "no-show"     && <NoShowTab    items={noShow ?? []} />}
        {tab === "demand"      && <DemandTab    items={demand ?? []} />}
        {tab === "churn"       && <ChurnTab     items={churn ?? []} />}
        {tab === "ltv"         && <LtvTab       items={ltv ?? []} />}
        {tab === "service-mix" && <ServiceMixTab items={mix ?? []} />}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-100 px-4 py-3 flex items-start gap-3">
        <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-500 leading-relaxed">
          AI-инсайты обновляются ежедневно в 04:17 UTC. Для немедленного обновления используйте кнопку "Обновить". SMS-рассылка по ценам вашего SMS-провайдера.
        </p>
      </div>
    </div>
  );
}
