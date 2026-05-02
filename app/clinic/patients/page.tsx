"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Phone, Calendar, User, Clock,
  ChevronRight, Loader2, BookUser, AlertCircle,
} from "lucide-react";
import { clinicApi, PatientSearchResult, Appointment } from "@/lib/clinicApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function fmtTime(t: string | null | undefined) {
  return t ?? "—";
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:   "Запись",
  CHECKED_IN:  "Прибыл",
  IN_PROGRESS: "На приёме",
  DONE:        "Готово",
  CANCELLED:   "Отменён",
  CANCELED:    "Отменён",
  NO_SHOW:     "Не явился",
};

const STATUS_CLS: Record<string, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-600",
  CHECKED_IN:  "bg-yellow-50 text-yellow-600",
  IN_PROGRESS: "bg-orange-50 text-orange-600",
  DONE:        "bg-emerald-50 text-emerald-700",
  CANCELLED:   "bg-red-50 text-red-500",
  CANCELED:    "bg-red-50 text-red-500",
  NO_SHOW:     "bg-slate-100 text-slate-500",
};

// ─── Visit card ───────────────────────────────────────────────────────────────

function VisitCard({ appt }: { appt: Appointment }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-4">
      <div className="shrink-0 flex flex-col items-center gap-0.5 min-w-[52px]">
        <span className="text-sm font-bold text-slate-700">{fmtDate(appt.date)}</span>
        <span className="text-xs text-slate-400 flex items-center gap-0.5">
          <Clock size={10} />{fmtTime(appt.time)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {appt.serviceTitle && (
          <p className="text-sm font-semibold text-slate-800 truncate">{appt.serviceTitle}</p>
        )}
        {appt.notes && (
          <p className="text-xs text-slate-500 mt-0.5 truncate italic">"{appt.notes}"</p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[appt.status] ?? "bg-slate-100 text-slate-500"}`}>
        {STATUS_LABEL[appt.status] ?? appt.status}
      </span>
    </div>
  );
}

// ─── Patient detail panel ─────────────────────────────────────────────────────

function PatientPanel({
  patient,
  onClose,
}: {
  patient: PatientSearchResult;
  onClose: () => void;
}) {
  const [visits, setVisits] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    clinicApi.patients.getHistory(patient.id)
      .then((res) => setVisits(res.visits))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [patient.id]);

  const initials = patient.name
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-extrabold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-800 truncate">{patient.name || "Без имени"}</p>
          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
            <Phone size={11} />{patient.phone}
          </p>
          {patient.allergies && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
              <AlertCircle size={9} /> Аллергия: {patient.allergies}
            </span>
          )}
          {patient.lastVisit && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={10} /> Последний визит: {fmtDate(patient.lastVisit)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 border-0 cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Visits */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          История визитов ({visits.length})
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <Loader2 size={14} className="animate-spin text-teal-500" /> Загрузка…
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Визитов не найдено</p>
        ) : (
          visits.map((v) => <VisitCard key={v.id} appt={v} />)
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<PatientSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await clinicApi.patients.search(q.trim());
        setResults(res ?? []);
        setSearched(true);
      } catch { setResults([]); setSearched(true); }
      finally { setSearching(false); }
    }, 350);
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  function handleSelect(p: PatientSearchResult) {
    setSelected(p);
  }

  function clearSearch() {
    setQuery(""); setResults([]); setSearched(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <BookUser size={22} className="text-teal-600 shrink-0" />
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 leading-tight">База пациентов</h1>
          <p className="text-xs text-slate-400 mt-0.5">Поиск по имени или номеру телефона</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-3 h-12 px-4 rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          {searching
            ? <Loader2 size={18} className="text-teal-400 animate-spin shrink-0" />
            : <Search size={18} className="text-slate-400 shrink-0" />}
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
            placeholder="Введите имя или телефон (минимум 2 символа)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={clearSearch}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 border-0 cursor-pointer shrink-0">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Results list */}
        <div className="flex flex-col gap-2 w-full md:w-[340px] shrink-0">
          {!searched && !searching && query.length < 2 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <User size={40} className="text-slate-200" />
              <p className="text-sm text-slate-400">Начните вводить имя или номер телефона</p>
            </div>
          )}

          {searched && results.length === 0 && !searching && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Search size={40} className="text-slate-200" />
              <p className="text-sm text-slate-400">Пациент не найден по «{query}»</p>
            </div>
          )}

          {results.map((p) => {
            const initials = p.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
            const isActive = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-50 border-teal-300 shadow-sm"
                    : "bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${
                  isActive ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"
                }`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{p.name || "Без имени"}</span>
                    {p.allergies && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-red-50 text-red-500 border border-red-200 shrink-0">
                        <AlertCircle size={8} /> Аллергия
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone size={9} />{p.phone}
                  </p>
                  {p.lastVisit && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={9} /> {fmtDate(p.lastVisit)}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className={`shrink-0 ${isActive ? "text-teal-500" : "text-slate-300"}`} />
              </button>
            );
          })}
        </div>

        {/* Patient detail */}
        {selected && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden md:flex md:flex-col">
            <PatientPanel patient={selected} onClose={() => setSelected(null)} />
          </div>
        )}

        {/* Mobile detail overlay */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
            <PatientPanel patient={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
