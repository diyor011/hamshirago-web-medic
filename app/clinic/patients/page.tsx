"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Phone, Calendar, User, Clock,
  AlertCircle, Loader2, BookUser, RefreshCw,
  Users, ChevronRight, Activity, TrendingUp,
} from "lucide-react";
import { clinicApi, PatientSearchResult, Appointment } from "@/lib/clinicApi";
import PageHero, { HeroStat } from "@/components/clinic/PageHero";
import { useTranslation } from "react-i18next";
import "@/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale = "ru-RU") {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SCHEDULED:   { bg: "bg-blue-50",    text: "text-blue-600" },
  CHECKED_IN:  { bg: "bg-yellow-50",  text: "text-yellow-700" },
  IN_PROGRESS: { bg: "bg-orange-50",  text: "text-orange-600" },
  DONE:        { bg: "bg-emerald-50", text: "text-emerald-700" },
  CANCELLED:   { bg: "bg-red-50",     text: "text-red-500" },
  CANCELED:    { bg: "bg-red-50",     text: "text-red-500" },
  NO_SHOW:     { bg: "bg-slate-100",  text: "text-slate-500" },
};

// ─── Visit row ────────────────────────────────────────────────────────────────

function VisitRow({ appt, locale }: { appt: Appointment; locale: string }) {
  const { t } = useTranslation();
  const sc = STATUS_COLORS[appt.status] ?? { bg: "bg-slate-100", text: "text-slate-500" };
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="shrink-0 w-[90px]">
        <p className="text-xs font-bold text-slate-700">{fmtDate(appt.date, locale)}</p>
        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
          <Clock size={9} /> {appt.time ?? "—"}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        {appt.serviceTitle
          ? <p className="text-sm font-semibold text-slate-800 truncate">{appt.serviceTitle}</p>
          : <p className="text-sm text-slate-400 italic">Услуга не указана</p>}
        {appt.notes && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">💬 {appt.notes}</p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
        {t(`clinic.patients.statusLabels.${appt.status}`, { defaultValue: appt.status })}
      </span>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function PatientDetail({ patient, onClose }: { patient: PatientSearchResult; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "uz" ? "uz-Latn-UZ" : "ru-RU";
  const [visits, setVisits] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initials = getInitials(patient.name);

  useEffect(() => {
    if (!patient.id) { setLoading(false); return; }
    setLoading(true); setError("");
    clinicApi.patients.getHistory(patient.id)
      .then((res) => setVisits(res.visits))
      .catch((e) => setError(e instanceof Error ? e.message : t("clinic.patients.errorLoad")))
      .finally(() => setLoading(false));
  }, [patient.id, t]);

  const done    = visits.filter((v) => v.status === "DONE").length;
  const noShow  = visits.filter((v) => v.status === "NO_SHOW").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Patient hero */}
      <div className="relative overflow-hidden shrink-0 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 px-6 pt-6 pb-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-teal-500/20 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-20 w-40 rounded-full bg-cyan-400/10 blur-xl" />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center text-xl font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black text-white truncate leading-tight">
              {patient.name || t("clinic.patients.noName")}
            </p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <Phone size={11} /> {patient.phone}
            </p>
            {patient.allergies && (
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30">
                <AlertCircle size={9} /> {t("clinic.patients.allergy")}: {patient.allergies}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Mini stats */}
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Визитов", value: visits.length, icon: Activity },
            { label: "Выполнено", value: done, icon: TrendingUp },
            { label: "Не пришёл", value: noShow, icon: AlertCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center">
              <p className="text-base font-black text-white">{loading ? "—" : value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Visit list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            История визитов {!loading && `(${visits.length})`}
          </p>
          {patient.lastVisit && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar size={10} /> {fmtDate(patient.lastVisit, locale)}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 size={24} className="animate-spin text-teal-400" />
            <p className="text-sm text-slate-400">{t("clinic.patients.loading")}</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Calendar size={20} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">{t("clinic.patients.noVisits")}</p>
          </div>
        ) : (
          <div>
            {visits
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((v) => <VisitRow key={v.id} appt={v} locale={locale} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Patient card ─────────────────────────────────────────────────────────────

function PatientCard({
  patient, active, locale, onClick,
}: {
  patient: PatientSearchResult;
  active: boolean;
  locale: string;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const initials = getInitials(patient.name);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 text-left transition-all cursor-pointer ${
        active ? "bg-teal-50" : "bg-white hover:bg-slate-50"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors ${
        active ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"
      }`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-slate-900 truncate">
            {patient.name || t("clinic.patients.noName")}
          </span>
          {patient.allergies && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-200">
              <AlertCircle size={8} />
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <Phone size={9} /> {patient.phone}
        </p>
        {patient.lastVisit && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar size={9} /> {fmtDate(patient.lastVisit, locale)}
          </p>
        )}
      </div>
      <ChevronRight size={14} className={`shrink-0 transition-colors ${active ? "text-teal-500" : "text-slate-300"}`} />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "uz" ? "uz-Latn-UZ" : "ru-RU";

  const [allPatients, setAllPatients]   = useState<PatientSearchResult[]>([]);
  const [filtered, setFiltered]         = useState<PatientSearchResult[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searching, setSearching]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [query, setQuery]               = useState("");
  const [selected, setSelected]         = useState<PatientSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await clinicApi.patients.search("") ?? [];
      setAllPatients(res);
      setFiltered(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки пациентов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Когда пользователь пишет — вызываем API напрямую (не только клиентский фильтр)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setFiltered(allPatients); return; }
    // Сначала быстрый клиентский фильтр
    const ql = q.toLowerCase();
    setFiltered(allPatients.filter((p) =>
      p.name.toLowerCase().includes(ql) || p.phone.includes(q)
    ));
    // Затем запрос к API для точного поиска
    if (q.length >= 2) {
      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await clinicApi.patients.search(q) ?? [];
          setFiltered(res);
        } catch { /* оставляем клиентский результат */ }
        finally { setSearching(false); }
      }, 350);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, allPatients]);

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Hero */}
      <PageHero
        title={t("clinic.patients.title")}
        subtitle={t("clinic.patients.subtitle")}
        badge={<><BookUser size={12} /> Clinic OS</>}
        accent="teal"
        actions={
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        }
        stats={
          <HeroStat label="Всего пациентов" value={loading ? "—" : allPatients.length} />
        }
      />

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: list */}
        <div className="flex flex-col w-full md:w-[340px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Search */}
          <div className="px-3 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 focus-within:bg-white transition-all">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
                placeholder="Имя или телефон…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query
                ? <button onClick={() => setQuery("")}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 border-0 cursor-pointer shrink-0">
                    <X size={10} />
                  </button>
                : null}
            </div>
          </div>

          {/* Count */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {loading ? "Загрузка…" : `${filtered.length} пациент${filtered.length === 1 ? "" : filtered.length < 5 ? "а" : "ов"}`}
            </p>
            {selected && (
              <button onClick={() => setSelected(null)} className="text-[11px] text-teal-600 font-semibold hover:underline">
                Снять выбор
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {error && !loading && (
              <div className="flex items-center gap-2 mx-3 mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 break-all">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 size={24} className="animate-spin text-teal-400" />
                <p className="text-sm text-slate-400">{t("clinic.patients.loading")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Users size={20} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">
                  {query ? `Пациент «${query}» не найден` : t("clinic.patients.notFound", { query: "" })}
                </p>
              </div>
            ) : (
              filtered.map((p) => (
                <PatientCard
                  key={p.id || p.phone}
                  patient={p}
                  active={selected?.id === p.id}
                  locale={locale}
                  onClick={() => setSelected(p)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        {selected ? (
          <>
            {/* Desktop */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden md:flex md:flex-col">
              <PatientDetail patient={selected} onClose={() => setSelected(null)} />
            </div>
            {/* Mobile overlay */}
            <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
              <PatientDetail patient={selected} onClose={() => setSelected(null)} />
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <User size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Выберите пациента</p>
              <p className="text-xs text-slate-300">Нажмите на карточку слева</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
