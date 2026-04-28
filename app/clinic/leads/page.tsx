"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, MessageSquare, Phone, CalendarPlus } from "lucide-react";
import { clinicApi, Lead, LeadStatus, LeadStats } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import BookingModal from "@/components/clinic/BookingModal";

type UiLeadStatus = "NEW" | "IN_PROGRESS" | "DONE" | "CANCELED";

const STATUS_LABELS: Record<UiLeadStatus, string> = {
  NEW:         "Новый",
  IN_PROGRESS: "В работе",
  DONE:        "Завершён",
  CANCELED:    "Отменён",
};

const STATUS_BADGE: Record<UiLeadStatus, string> = {
  NEW:         "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  DONE:        "bg-emerald-50 text-emerald-700",
  CANCELED:    "bg-red-50 text-red-500",
};

const STATUS_NEXT: Record<UiLeadStatus, UiLeadStatus | null> = {
  NEW: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null,
  CANCELED: null,
};

const STATUS_NEXT_LABELS: Record<UiLeadStatus, string> = {
  NEW:         "Взять в работу",
  IN_PROGRESS: "Завершить",
  DONE:        "",
  CANCELED:    "",
};

const KPI_COLORS = [
  { bg: "bg-slate-50",   text: "text-slate-600" },
  { bg: "bg-blue-50",    text: "text-blue-600" },
  { bg: "bg-amber-50",   text: "text-amber-600" },
  { bg: "bg-emerald-50", text: "text-emerald-700" },
  { bg: "bg-red-50",     text: "text-red-500" },
];

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="text-sm text-red-500">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <RefreshCw size={13} /> Повторить
      </button>
    </div>
  );
}

const ALL_STATUSES: Array<UiLeadStatus | "ALL"> = ["ALL", "NEW", "IN_PROGRESS", "DONE", "CANCELED"];
const FILTER_LABELS: Record<UiLeadStatus | "ALL", string> = {
  ALL: "Все", ...STATUS_LABELS,
};

export default function LeadsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<UiLeadStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errStats, setErrStats] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);
  const { toasts, toast, closeToast } = useToast();

  const loadStats = useCallback(async () => {
    setLoadingStats(true); setErrStats(null);
    try { setStats(await clinicApi.leads.stats()); }
    catch (e) { setErrStats(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingStats(false); }
  }, []);

  const loadLeads = useCallback(async (f: UiLeadStatus | "ALL", p: number) => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({
        ...(f !== "ALL" ? { status: f as LeadStatus } : {}),
        page: p,
        limit: LIMIT,
      });
      setLeads(res.data);
      setTotal(res.total);
    } catch (e) {
      setErrLeads(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLeads(filter, page); }, [filter, page, loadLeads]);

  function changeFilter(f: UiLeadStatus | "ALL") {
    setFilter(f);
    setPage(1);
  }

  async function handleUpdateStatus(lead: Lead, newStatus: LeadStatus) {
    setUpdating(lead.id);
    try {
      await clinicApi.leads.updateStatus(lead.id, newStatus);
      await Promise.all([loadStats(), loadLeads(filter, page)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  const kpiItems = stats
    ? [
        { label: "Всего",     value: stats.total },
        { label: "Новых",     value: stats.new },
        { label: "В работе",  value: stats.inProgress },
        { label: "Завершено", value: stats.done },
        { label: "Отменено",  value: stats.canceled },
      ]
    : [];

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Лиды — Salomat AI</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Пациенты, обратившиеся через голосового ассистента</p>
        </div>
      </section>

      {/* KPI */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {loadingStats ? (
          [1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[82px] animate-pulse rounded-2xl bg-slate-100" />)
        ) : errStats ? (
          <div className="col-span-full"><ErrorBanner message={errStats} onRetry={loadStats} /></div>
        ) : stats ? (
          kpiItems.map(({ label, value }, idx) => {
            const c = KPI_COLORS[idx];
            return (
              <div key={label} className={`rounded-2xl border border-slate-100 px-5 py-4 shadow-sm ${c.bg}`}>
                <div className={`text-3xl font-extrabold leading-none ${c.text}`}>{value}</div>
                <div className={`mt-1 text-xs font-semibold opacity-75 ${c.text}`}>{label}</div>
              </div>
            );
          })
        ) : null}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => changeFilter(s)}
            className={[
              "rounded-xl border-[1.5px] px-4 py-2 text-sm font-semibold transition",
              filter === s
                ? "border-teal-500 bg-teal-50 text-teal-600"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
            ].join(" ")}
          >
            {FILTER_LABELS[s]}
          </button>
        ))}
      </div>

      {errLeads && <ErrorBanner message={errLeads} onRetry={() => loadLeads(filter, page)} />}

      {/* Leads list */}
      {loadingLeads ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-16 text-center shadow-sm">
          <MessageSquare size={40} className="mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">Нет лидов</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map((lead) => {
            const st = lead.status as UiLeadStatus;
            const next = STATUS_NEXT[st];
            return (
              <div key={lead.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-950">{lead.name ?? "Без имени"}</span>
                      <span className="text-sm text-slate-500">{lead.phone}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[st]}`}>
                        {STATUS_LABELS[st]}
                      </span>
                    </div>
                    {lead.notes && (
                      <p className="mb-1.5 text-sm leading-relaxed text-slate-500">{lead.notes}</p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      {new Date(lead.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 no-underline"
                    >
                      <Phone size={12} /> Позвонить
                    </a>

                    {(st === "NEW" || st === "IN_PROGRESS") && (
                      <button
                        onClick={() => setBookingLead(lead)}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600"
                      >
                        <CalendarPlus size={12} /> Записать
                      </button>
                    )}

                    {next && (
                      <button
                        onClick={() => handleUpdateStatus(lead, next)}
                        disabled={updating === lead.id}
                        className="whitespace-nowrap rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {updating === lead.id ? "..." : STATUS_NEXT_LABELS[st]}
                      </button>
                    )}
                    {st !== "CANCELED" && st !== "DONE" && (
                      <button
                        onClick={() => handleUpdateStatus(lead, "CANCELED")}
                        disabled={updating === lead.id}
                        className="whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 disabled:opacity-60"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 disabled:text-slate-300"
          >
            Назад
          </button>
          <span className="px-4 py-2 text-sm font-semibold text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 disabled:text-slate-300"
          >
            Вперёд
          </button>
        </div>
      )}

      {bookingLead && (
        <BookingModal
          open={!!bookingLead}
          onClose={() => setBookingLead(null)}
          onSuccess={() => { setBookingLead(null); loadLeads(filter, page); }}
        />
      )}
    </div>
  );
}
