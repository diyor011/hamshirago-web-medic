"use client";

import { useEffect, useState } from "react";
import { clinicApi, ClinicSubscription } from "@/lib/clinicApi";
import { CheckCircle2, Lock, Zap, Crown, AlertCircle, RefreshCw } from "lucide-react";

// ─── Feature catalog ────────────────────────────────────────────────────────

const FEATURES: { key: string; label: string; desc: string; maxOnly: boolean }[] = [
  { key: "patient_search",        label: "Умный поиск пациентов",     desc: "Автодополнение по имени/телефону в форме записи",    maxOnly: false },
  { key: "sms_reminders",         label: "SMS-напоминания",            desc: "Автоматическое напоминание за 1 ч до приёма",        maxOnly: false },
  { key: "online_payment",        label: "Онлайн-оплата",             desc: "Приём оплаты через Payme/Click",                     maxOnly: false },
  { key: "waitlist",              label: "Лист ожидания",             desc: "Очередь на занятые слоты с авто-уведомлением",       maxOnly: false },
  { key: "crm_followups",         label: "CRM-напоминания",           desc: "Автоматический обзвон пациентов через 90 дней",      maxOnly: true  },
  { key: "multi_branch",          label: "Несколько филиалов",        desc: "Управление несколькими точками клиники",             maxOnly: true  },
  { key: "digital_prescriptions", label: "Цифровые рецепты",          desc: "Выписка и отправка рецептов пациенту",               maxOnly: true  },
];

const PLAN_COLORS = {
  PRO:    { badge: "bg-blue-100 text-blue-700",    border: "border-blue-200",   ring: "ring-blue-400"   },
  MAX:    { badge: "bg-violet-100 text-violet-700", border: "border-violet-200", ring: "ring-violet-400" },
  CUSTOM: { badge: "bg-amber-100 text-amber-700",  border: "border-amber-200",  ring: "ring-amber-400"  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function isExpired(sub: ClinicSubscription) {
  return sub.expiresAt && new Date(sub.expiresAt) < new Date();
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const [sub, setSub] = useState<ClinicSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  async function loadSub() {
    setLoading(true);
    setError(null);
    try {
      setSub(await clinicApi.subscription.get());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSub(); }, []);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const updated = await clinicApi.subscription.upgrade("MAX");
      setSub(updated);
      setConfirmModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setUpgrading(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-slate-200 border-t-teal-600 animate-spin" />
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-slate-500 text-sm">{error ?? "Не удалось загрузить план"}</p>
        <button
          onClick={loadSub}
          className="flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 cursor-pointer bg-transparent border-none"
        >
          <RefreshCw size={14} /> Повторить
        </button>
      </div>
    );
  }

  const colors = PLAN_COLORS[sub.plan] ?? PLAN_COLORS.PRO;
  const expired = isExpired(sub);
  const isMax = sub.plan === "MAX";

  return (
    <div className="space-y-5">

      {/* Confirm upgrade modal */}
      {confirmModal && (
        <div
          onClick={() => !upgrading && setConfirmModal(false)}
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Crown size={20} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">Обновить до MAX?</h3>
                <p className="text-xs text-slate-500">$35 / месяц</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Вы получите доступ к CRM-напоминаниям, управлению филиалами и цифровым рецептам.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {upgrading ? "Обновляем..." : "Подтвердить"}
              </button>
              <button
                onClick={() => setConfirmModal(false)}
                disabled={upgrading}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Тарифный план</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Управление подпиской и функциями клиники</p>
          </div>
          {!isMax && (
            <button
              onClick={() => setConfirmModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              <Crown size={15} /> Обновить до MAX
            </button>
          )}
        </div>
      </section>

      {/* Current plan card */}
      <div className={`bg-white rounded-2xl border ${colors.border} p-6 shadow-sm`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>
                {sub.plan}
              </span>
              {expired && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-600">
                  Истёк
                </span>
              )}
              {!expired && sub.expiresAt && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-600">
                  До {fmtDate(sub.expiresAt)}
                </span>
              )}
            </div>
            <div className="text-3xl font-black text-slate-900">
              ${sub.priceUsd}<span className="text-base font-semibold text-slate-400"> / мес</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Активен с {fmtDate(sub.startedAt)}</p>
          </div>

          {isMax && (
            <div className="flex items-center gap-2 text-violet-600 text-sm font-bold">
              <Crown size={16} /> Максимальный план
            </div>
          )}
        </div>
      </div>

      {/* MAX upgrade banner — only for PRO/CUSTOM */}
      {!isMax && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-violet-600" />
            <span className="text-sm font-extrabold text-violet-700">MAX план — $35/мес</span>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Разблокирует CRM-напоминания, несколько филиалов и цифровые рецепты.
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.filter((f) => f.maxOnly).map((f) => (
              <span key={f.key} className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Features list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-900">Функции</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {FEATURES.map((f) => {
            const enabled = sub.features?.[f.key] === true;
            return (
              <div key={f.key} className="flex items-center gap-4 px-6 py-4">
                <div className="shrink-0">
                  {enabled ? (
                    <CheckCircle2 size={20} className="text-teal-500" />
                  ) : (
                    <Lock size={20} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${enabled ? "text-slate-900" : "text-slate-400"}`}>
                      {f.label}
                    </span>
                    {f.maxOnly && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                        MAX
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${enabled ? "text-slate-500" : "text-slate-300"}`}>
                    {f.desc}
                  </p>
                </div>
                <div className="shrink-0">
                  {enabled ? (
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                      Активно
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      Недоступно
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
