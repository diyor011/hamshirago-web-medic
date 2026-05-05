"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, History, WifiOff, RefreshCw } from "lucide-react";
import { clinicApi, Appointment } from "@/lib/clinicApi";
import { reportClientError } from "@/lib/api";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import PageHero from "@/components/clinic/PageHero";
import { useTranslation } from "react-i18next";
import "@/i18n";

const PT_BADGE: Record<string, { label: string; cls: string }> = {
  CASH:     { label: "💵 Naqd",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CARD:     { label: "💳 Karta",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ONLINE:   { label: "📱 Online", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  INSURANCE:{ label: "🏥 Sug'urta", cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

export default function HistoryPage() {
  const { t } = useTranslation();
  const { toasts, toast, closeToast } = useToast();

  const [data, setData]         = useState<Appointment[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");

  const LIMIT = 20;

  const load = useCallback(async (p: number, q: string, f: string, t2: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await clinicApi.appointments.history({
        page: p, limit: LIMIT,
        ...(q ? { q } : {}),
        ...(f ? { from: f } : {}),
        ...(t2 ? { to: t2 } : {}),
      });
      setData(res.data);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Noma'lum xatolik";
      setFetchError(msg);
      reportClientError(`[history] ${msg}`, e instanceof Error ? e.stack : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search, from, to); }, [page, search, from, to, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <PageHero
        title="Qabullar tarixi"
        subtitle="Barcha yakunlangan qabullar ro'yxati"
        badge={<><History size={12} /> Clinic OS</>}
        accent="teal"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Search size={15} className="text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ism yoki telefon..."
            className="flex-1 text-sm outline-none"
          />
          <button type="submit" className="rounded-lg bg-teal-500 px-3 py-1 text-xs font-bold text-white hover:bg-teal-600">Qidirish</button>
        </form>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none" />
        {(search || from || to) && (
          <button onClick={() => { setSearch(""); setSearchInput(""); setFrom(""); setTo(""); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm hover:bg-slate-50">
            Tozalash
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3">
          <span className="text-[13px] font-semibold text-slate-700">Jami: {total} ta qabul</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" /></div>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <WifiOff size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Texnik ishlar olib borilmoqda</p>
              <p className="mt-1 text-xs text-slate-400">Ma'lumotlar hozircha yuklanmadi. Bir ozdan keyin urinib ko'ring.</p>
            </div>
            <button
              onClick={() => load(page, search, from, to)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-600 transition-colors"
            >
              <RefreshCw size={14} /> Qayta urinish
            </button>
          </div>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Qabullar topilmadi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 text-left">Sana / Vaqt</th>
                  <th className="px-4 py-3 text-left">Bemor</th>
                  <th className="px-4 py-3 text-left">Xizmat</th>
                  <th className="px-4 py-3 text-left">Shifokor</th>
                  <th className="px-4 py-3 text-right">Summa</th>
                  <th className="px-4 py-3 text-center">To'lov</th>
                  {data.some((a) => a.debtAmount) && <th className="px-4 py-3 text-right">Qarz</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((a) => {
                  const pt = a.paymentType ?? "CASH";
                  const badge = PT_BADGE[pt] ?? PT_BADGE.CASH;
                  const hasDebt = data.some((x) => x.debtAmount);
                  return (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{a.date}<br /><span className="text-teal-600 font-semibold">{a.time}</span></td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{a.patientName ?? a.patientPhone}</div>
                        {a.patientName && <div className="text-slate-400">{a.patientPhone}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.serviceTitle ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{a.doctorId ? "—" : "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {a.finalPrice != null ? `${a.finalPrice.toLocaleString()} сум` :
                         a.priceMin != null ? `${a.priceMin.toLocaleString()}+ сум` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      {hasDebt && (
                        <td className="px-4 py-3 text-right">
                          {a.debtAmount ? (
                            <span className="font-bold text-rose-600">{a.debtAmount.toLocaleString()} сум</span>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-50 px-5 py-3">
            <span className="text-[12px] text-slate-400">{page} / {totalPages} sahifa</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
