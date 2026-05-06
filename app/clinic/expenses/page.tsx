"use client";

import { useEffect, useState, useCallback } from "react";
import { clinicApi, ExpenseItem, ExpenseRecord, ExpenseSummary } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import PageHero from "@/components/clinic/PageHero";
import { TrendingDown, Plus, Trash2, ChevronLeft, ChevronRight, Package } from "lucide-react";
import "@/i18n";

const CATEGORY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  medications: { label: "Dorilar",       color: "bg-blue-50 text-blue-700",    emoji: "💊" },
  tools:       { label: "Jihozlar",      color: "bg-violet-50 text-violet-700",emoji: "🔧" },
  salary:      { label: "Maosh",         color: "bg-amber-50 text-amber-700",  emoji: "👤" },
  rent:        { label: "Ijara",         color: "bg-orange-50 text-orange-700",emoji: "🏢" },
  other:       { label: "Boshqa",        color: "bg-slate-100 text-slate-600", emoji: "📦" },
};

const UNITS = ["шт", "уп", "мл", "кг", "ч", "мес", "other"];

const inputCls = "w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all";

function fmt(n: number) {
  return n.toLocaleString("ru-RU") + " so'm";
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpensesPage() {
  const { toasts, toast, closeToast } = useToast();

  // ── Summary state
  const [period, setPeriod]     = useState<"month" | "quarter" | "year">("month");
  const [dateParam, setDateParam] = useState(thisMonth());
  const [summary, setSummary]   = useState<ExpenseSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Records state
  const [records, setRecords]   = useState<ExpenseRecord[]>([]);
  const [recTotal, setRecTotal] = useState(0);
  const [recPage, setRecPage]   = useState(1);
  const [recLoading, setRecLoading] = useState(true);

  // ── Items (catalog) state
  const [items, setItems]       = useState<ExpenseItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // ── Tabs
  const [tab, setTab] = useState<"records" | "items">("records");

  // ── Add record form
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recForm, setRecForm] = useState({
    itemId: "", itemName: "", category: "other", unit: "шт",
    priceAtTime: "", quantity: "1", note: "", date: new Date().toISOString().slice(0, 10),
  });
  const [recSaving, setRecSaving] = useState(false);

  // ── Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", unit: "шт", category: "other", currentPrice: "" });
  const [itemSaving, setItemSaving] = useState(false);

  const REC_LIMIT = 20;

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    try {
      const data = await clinicApi.expenses.getSummary(period, dateParam || undefined);
      setSummary(data);
      setPageError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xatolik";
      setSummary(null);
      if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("500")) {
        setPageError("⚠️ Migration 029 Railway da apply qilinmagan. Abubakar bajarishi kerak.");
      } else {
        setPageError(msg);
      }
    }
    finally { setSumLoading(false); }
  }, [period, dateParam]);

  const loadRecords = useCallback(async (p = 1) => {
    setRecLoading(true);
    try {
      const data = await clinicApi.expenses.listRecords({ page: p, limit: REC_LIMIT });
      setRecords(data.data);
      setRecTotal(data.total);
      setRecPage(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yozuvlar yuklanmadi");
    }
    finally { setRecLoading(false); }
  }, [toast]);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try { setItems(await clinicApi.expenses.listItems()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Katalog yuklanmadi"); }
    finally { setItemsLoading(false); }
  }, [toast]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { loadItems(); }, [loadItems]);

  // When selecting catalog item — autofill form
  function handleSelectItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) {
      setRecForm((f) => ({
        ...f, itemId: id, itemName: item.name,
        category: item.category, unit: item.unit,
        priceAtTime: String(item.currentPrice),
      }));
    } else {
      setRecForm((f) => ({ ...f, itemId: "", itemName: "", priceAtTime: "" }));
    }
  }

  async function handleAddRecord() {
    if (!recForm.date) { toast.error("Sanani kiriting"); return; }
    const qty = parseFloat(recForm.quantity);
    if (!qty || qty <= 0) { toast.error("Miqdorni kiriting"); return; }
    if (!recForm.itemId && !recForm.itemName.trim()) { toast.error("Xarajat nomini kiriting"); return; }
    if (!recForm.itemId && (!recForm.priceAtTime || Number(recForm.priceAtTime) <= 0)) {
      toast.error("Narxni kiriting"); return;
    }
    setRecSaving(true);
    try {
      await clinicApi.expenses.createRecord({
        ...(recForm.itemId ? { itemId: recForm.itemId } : {
          itemName: recForm.itemName.trim(),
          category: recForm.category,
          unit: recForm.unit,
          priceAtTime: Number(recForm.priceAtTime),
        }),
        quantity: recForm.quantity,
        note: recForm.note || undefined,
        date: recForm.date,
      });
      toast.success("Xarajat qo'shildi");
      setShowAddRecord(false);
      setRecForm({ itemId: "", itemName: "", category: "other", unit: "шт", priceAtTime: "", quantity: "1", note: "", date: new Date().toISOString().slice(0, 10) });
      await Promise.all([loadRecords(), loadSummary()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally { setRecSaving(false); }
  }

  async function handleDeleteRecord(id: string) {
    try {
      await clinicApi.expenses.deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("O'chirildi");
      loadSummary();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Xatolik"); }
  }

  async function handleAddItem() {
    if (!itemForm.name.trim()) { toast.error("Nomini kiriting"); return; }
    if (!itemForm.currentPrice || Number(itemForm.currentPrice) <= 0) { toast.error("Narxni kiriting"); return; }
    setItemSaving(true);
    try {
      const created = await clinicApi.expenses.createItem({
        name: itemForm.name.trim(),
        unit: itemForm.unit,
        category: itemForm.category,
        currentPrice: Number(itemForm.currentPrice),
      });
      setItems((prev) => [...prev, created]);
      toast.success("Katalogga qo'shildi");
      setShowAddItem(false);
      setItemForm({ name: "", unit: "шт", category: "other", currentPrice: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Xatolik"); }
    finally { setItemSaving(false); }
  }

  async function handleDeleteItem(id: string) {
    try {
      await clinicApi.expenses.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Katalogdan o'chirildi");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Xatolik"); }
  }

  const totalPages = Math.ceil(recTotal / REC_LIMIT);

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <PageHero
        title="Xarajatlar"
        subtitle="Klinika xarajatlarini boshqarish va tahlil"
        badge={<><TrendingDown size={12} /> Moliya</>}
        accent="teal"
      />

      {/* Error banner */}
      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
          {pageError}
        </div>
      )}

      {/* Period selector + Summary */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {(["month", "quarter", "year"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-xs font-bold transition ${period === p ? "bg-teal-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {p === "month" ? "Oy" : p === "quarter" ? "Chorak" : "Yil"}
              </button>
            ))}
          </div>
          <input
            type={period === "year" ? "number" : "month"}
            value={dateParam}
            onChange={(e) => setDateParam(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          />
        </div>

        {sumLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ) : summary ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Jami xarajat</span>
              <span className="text-2xl font-extrabold text-rose-600">{fmt(summary.total)}</span>
            </div>
            {summary.byCategory.length > 0 && (
              <div className="space-y-2">
                {summary.byCategory.map((row) => {
                  const meta = CATEGORY_LABELS[row.category] ?? CATEGORY_LABELS.other;
                  const pct = summary.total > 0 ? Math.round((row.total / summary.total) * 100) : 0;
                  return (
                    <div key={row.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {meta.emoji} {meta.label}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{fmt(row.total)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {([["records", "📋 Xarajatlar"], ["items", "📦 Katalog"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Records tab */}
      {tab === "records" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Jami: {recTotal} ta yozuv</span>
            <button onClick={() => setShowAddRecord(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-600 transition">
              <Plus size={15} /> Qo'shish
            </button>
          </div>

          {/* Add record form */}
          {showAddRecord && (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">Yangi xarajat</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Katalogdan tanlang (ixtiyoriy)</label>
                  <select className={inputCls} value={recForm.itemId} onChange={(e) => handleSelectItem(e.target.value)}>
                    <option value="">— Katalogdan tanlang —</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.currentPrice.toLocaleString()} so'm/{i.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nomi *</label>
                  <input className={inputCls} value={recForm.itemName} onChange={(e) => setRecForm((f) => ({ ...f, itemName: e.target.value, itemId: "" }))}
                    placeholder="Qo'lda kiriting..." />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Kategoriya</label>
                  <select className={inputCls} value={recForm.category} onChange={(e) => setRecForm((f) => ({ ...f, category: e.target.value }))}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">O'lchov birligi</label>
                  <select className={inputCls} value={recForm.unit} onChange={(e) => setRecForm((f) => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Narx (so'm) *</label>
                  <input type="number" className={inputCls} value={recForm.priceAtTime}
                    onChange={(e) => setRecForm((f) => ({ ...f, priceAtTime: e.target.value }))} placeholder="50000" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Miqdor *</label>
                  <input type="number" className={inputCls} value={recForm.quantity} min="0.001" step="0.001"
                    onChange={(e) => setRecForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Sana *</label>
                  <input type="date" className={inputCls} value={recForm.date}
                    onChange={(e) => setRecForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Izoh</label>
                  <input className={inputCls} value={recForm.note}
                    onChange={(e) => setRecForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ixtiyoriy..." />
                </div>
              </div>
              {recForm.priceAtTime && recForm.quantity && (
                <p className="text-sm font-bold text-rose-600">
                  Jami: {Math.round(Number(recForm.priceAtTime) * Number(recForm.quantity)).toLocaleString()} so'm
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={handleAddRecord} disabled={recSaving}
                  className="flex-1 rounded-xl bg-teal-500 py-2 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-60 transition">
                  {recSaving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                <button onClick={() => setShowAddRecord(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 transition">
                  Bekor
                </button>
              </div>
            </div>
          )}

          {/* Records table */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            {recLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Package size={32} className="text-slate-200" />
                <p className="text-sm text-slate-400">Xarajatlar yo'q</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 text-left">Sana</th>
                      <th className="px-4 py-3 text-left">Nom</th>
                      <th className="px-4 py-3 text-left">Kategoriya</th>
                      <th className="px-4 py-3 text-right">Miqdor</th>
                      <th className="px-4 py-3 text-right">Jami</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const meta = CATEGORY_LABELS[r.category] ?? CATEGORY_LABELS.other;
                      return (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{r.itemName}</p>
                            {r.note && <p className="text-xs text-slate-400">{r.note}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}>
                              {meta.emoji} {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {r.quantity} {r.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                            {r.total.toLocaleString()} so'm
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteRecord(r.id)}
                              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-50 px-5 py-3">
                <span className="text-[12px] text-slate-400">{recPage} / {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => loadRecords(recPage - 1)} disabled={recPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => loadRecords(recPage + 1)} disabled={recPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items (catalog) tab */}
      {tab === "items" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Katalog ({items.length} ta)</span>
            <button onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-600 transition">
              <Plus size={15} /> Qo'shish
            </button>
          </div>

          {showAddItem && (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">Yangi katalog elementi</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nomi *</label>
                  <input className={inputCls} value={itemForm.name}
                    onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="Masalan: Qo'lqop" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Kategoriya</label>
                  <select className={inputCls} value={itemForm.category} onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Birlik</label>
                  <select className={inputCls} value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">Joriy narx (so'm) *</label>
                  <input type="number" className={inputCls} value={itemForm.currentPrice}
                    onChange={(e) => setItemForm((f) => ({ ...f, currentPrice: e.target.value }))} placeholder="5000" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddItem} disabled={itemSaving}
                  className="flex-1 rounded-xl bg-teal-500 py-2 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-60 transition">
                  {itemSaving ? "..." : "Saqlash"}
                </button>
                <button onClick={() => setShowAddItem(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 transition">
                  Bekor
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            {itemsLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Package size={32} className="text-slate-200" />
                <p className="text-sm text-slate-400">Katalog bo'sh</p>
                <p className="text-xs text-slate-300">Tez-tez takrorlanadigan xarajatlarni katalogga qo'shing</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {items.map((item) => {
                  const meta = CATEGORY_LABELS[item.category] ?? CATEGORY_LABELS.other;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${meta.color}`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{meta.label} · {item.currentPrice.toLocaleString()} so'm/{item.unit}</p>
                      </div>
                      <button onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
