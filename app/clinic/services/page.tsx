"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Check, X, Trash2, RefreshCw, Stethoscope, LayoutList, Users } from "lucide-react";
import { clinicApi, ClinicService, ClinicStaff } from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { useToast, ToastContainer, ConfirmDialog } from "@/components/clinic/Toast";

type ServiceCategory = "ALL" | "CONSULTATION" | "LAB" | "DIAGNOSTIC" | "PROCEDURE";
type ViewMode = "all" | "by-doctor";

interface ServiceForm {
  name: string;
  price: string;
  durationMinutes: string;
  category: Exclude<ServiceCategory, "ALL">;
  isRangePrice: boolean;
  priceMin: string;
  priceMax: string;
  doctorId: string | null;
}

const EMPTY_FORM: ServiceForm = {
  name: "", price: "", durationMinutes: "", category: "CONSULTATION",
  isRangePrice: false, priceMin: "", priceMax: "", doctorId: null,
};

function Skeleton() {
  return (
    <div className="grid gap-3 border-b border-slate-50 py-3.5" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 80px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-4 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
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

const inputCls = "h-9 w-full rounded-lg border-[1.5px] border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-teal-500";

interface ServiceTableProps {
  services: ClinicService[];
  editingId: string | null;
  editForm: ServiceForm;
  updating: boolean;
  deactivating: string | null;
  activating: string | null;
  catMeta: (cat: string) => { value: ServiceCategory; label: string; color: string; bg: string };
  onEdit: (svc: ClinicService) => void;
  onUpdate: (id: string) => void;
  onCancelEdit: () => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onEditFormChange: (f: ServiceForm) => void;
  t: (key: string) => string;
}

function ServiceTable({
  services, editingId, editForm, updating, deactivating, activating, catMeta,
  onEdit, onUpdate, onCancelEdit, onDeactivate, onActivate, onEditFormChange, t,
}: ServiceTableProps) {
  if (services.length === 0) {
    return (
      <div className="py-8 text-center">
        <Stethoscope size={28} className="mx-auto mb-2.5 text-slate-200" />
        <p className="text-sm text-slate-400">{t("clinic.services.noServices")}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-3 text-left font-semibold text-slate-500">{t("clinic.services.name")}</th>
            <th className="px-3 pb-3 text-left font-semibold text-slate-500">{t("clinic.services.category")}</th>
            <th className="px-3 pb-3 text-right font-semibold text-slate-500">{t("clinic.services.price")}</th>
            <th className="px-3 pb-3 text-right font-semibold text-slate-500">{t("clinic.services.duration")}</th>
            <th className="px-3 pb-3 text-center font-semibold text-slate-500">{t("clinic.services.status")}</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {services.map((svc) => {
            const isEditing = editingId === svc.id;
            const cm = catMeta(svc.category ?? "CONSULTATION");
            return (
              <tr key={svc.id} className={`border-b border-slate-50 last:border-0 ${!svc.isActive ? "opacity-50" : ""}`}>
                <td className="py-3">
                  {isEditing ? (
                    <input className={`${inputCls} w-[90%]`} value={editForm.name} onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })} />
                  ) : (
                    <span className="font-semibold text-slate-950">{svc.name}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold" style={{ background: cm.bg, color: cm.color }}>
                    {cm.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {isEditing ? (
                    <input type="number" min={0} className={`${inputCls} w-[110px] text-right`} value={editForm.price} onChange={(e) => onEditFormChange({ ...editForm, price: e.target.value })} />
                  ) : (
                    <span className="font-semibold text-slate-700">
                      {svc.priceMin != null && svc.priceMax != null
                        ? `${svc.priceMin.toLocaleString("ru-RU")} – ${svc.priceMax.toLocaleString("ru-RU")}`
                        : svc.price.toLocaleString("ru-RU")} {t("common.sum")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {isEditing ? (
                    <input type="number" min={1} className={`${inputCls} w-20 text-right`} value={editForm.durationMinutes} onChange={(e) => onEditFormChange({ ...editForm, durationMinutes: e.target.value })} />
                  ) : (
                    <span className="text-slate-700">{svc.durationMinutes} {t("clinic.services.durationMin")}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${svc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {svc.isActive ? t("clinic.services.active") : t("clinic.services.inactive")}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex justify-end gap-1">
                    {isEditing ? (
                      <>
                        {/* FUNC-1: увеличен hit-area кнопки сохранения */}
                        <button onClick={() => onUpdate(svc.id)} disabled={updating} className="min-h-[32px] min-w-[32px] rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50">
                          <Check size={13} />
                        </button>
                        <button onClick={onCancelEdit} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-slate-100">
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEdit(svc)} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-slate-100">
                          <Pencil size={13} />
                        </button>
                        {/* FUNC-2: кнопка активации для неактивных; FUNC-3: confirm перед деактивацией */}
                        {svc.isActive ? (
                          <button
                            onClick={() => onDeactivate(svc.id)}
                            disabled={deactivating === svc.id}
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onActivate(svc.id)}
                            disabled={activating === svc.id}
                            title={t("clinic.services.activate")}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ServicesPage() {
  const { t } = useTranslation();

  const CATEGORIES: { value: ServiceCategory; label: string; color: string; bg: string }[] = [
    { value: "ALL",          label: t("clinic.services.categories.all"),         color: "#475569", bg: "#f1f5f9" },
    { value: "CONSULTATION", label: t("clinic.services.categories.consultation"), color: "#0d9488", bg: "#f0fdfa" },
    { value: "LAB",          label: t("clinic.services.categories.lab"),          color: "#2563eb", bg: "#eff6ff" },
    { value: "DIAGNOSTIC",   label: t("clinic.services.categories.diagnostic"),   color: "#9333ea", bg: "#faf5ff" },
    { value: "PROCEDURE",    label: t("clinic.services.categories.procedure"),    color: "#ea580c", bg: "#fff7ed" },
  ];

  const [services, setServices] = useState<ClinicService[]>([]);
  const [doctors, setDoctors]   = useState<ClinicStaff[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<ServiceCategory>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const [showCreate, setShowCreate]         = useState(false);
  const [presetDoctorId, setPresetDoctorId] = useState<string | null>(null);
  const [form, setForm]                     = useState<ServiceForm>(EMPTY_FORM);
  const [creating, setCreating]             = useState(false);
  const [createError, setCreateError]       = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<ServiceForm>(EMPTY_FORM);
  const [updating, setUpdating]   = useState(false);
  const [deactivating, setDeactivating]   = useState<string | null>(null);
  const [activating, setActivating]       = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const { toasts, toast, closeToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [svcs, staff] = await Promise.all([
        clinicApi.services.list(),
        clinicApi.staff.list(),
      ]);
      setServices(svcs);
      setDoctors(staff.filter((s) => s.role === "DOCTOR" && s.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.services.errorLoad"));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ALL" ? services : services.filter((s) => s.category === filter);

  const stats = {
    total:    services.filter((s) => s.isActive).length,
    inactive: services.filter((s) => !s.isActive).length,
  };

  function openCreate(doctorId: string | null = null) {
    setPresetDoctorId(doctorId);
    setForm({ ...EMPTY_FORM, doctorId });
    setCreateError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.durationMinutes) { setCreateError(t("clinic.services.errorFillAll")); return; }
    if (form.isRangePrice) {
      if (!form.priceMin || !form.priceMax) { setCreateError(t("clinic.services.errorFillAll")); return; }
    } else {
      if (!form.price) { setCreateError(t("clinic.services.errorFillAll")); return; }
    }
    setCreating(true); setCreateError("");
    try {
      await clinicApi.services.create({
        name: form.name.trim(),
        price: form.isRangePrice ? Number(form.priceMin) : Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        category: form.category,
        doctorId: form.doctorId || null,
        ...(form.isRangePrice ? { priceMin: Number(form.priceMin), priceMax: Number(form.priceMax) } : {}),
      });
      setShowCreate(false); setForm(EMPTY_FORM);
      await load();
    } catch (e) { setCreateError(e instanceof Error ? e.message : t("clinic.services.errorCreate")); }
    finally { setCreating(false); }
  }

  async function handleUpdate(id: string) {
    if (!editForm.name.trim()) return;
    setUpdating(true);
    try {
      await clinicApi.services.update(id, {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        durationMinutes: Number(editForm.durationMinutes),
      });
      setEditingId(null); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка обновления"); }
    finally { setUpdating(false); }
  }

  async function handleDeactivate(id: string) {
    setDeactivating(id);
    try { await clinicApi.services.deactivate(id); toast.success(t("clinic.services.deactivated")); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("clinic.services.errorDeactivate")); }
    finally { setDeactivating(null); }
  }

  async function handleActivate(id: string) {
    setActivating(id);
    try { await clinicApi.services.activate(id); toast.success(t("clinic.services.activated")); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка активации"); }
    finally { setActivating(null); }
  }

  function startEdit(svc: ClinicService) {
    setEditingId(svc.id);
    const hasRange = svc.priceMin != null && svc.priceMax != null;
    setEditForm({
      name: svc.name, price: String(svc.price), durationMinutes: String(svc.durationMinutes ?? ""),
      category: (svc.category as Exclude<ServiceCategory, "ALL">) ?? "CONSULTATION",
      isRangePrice: hasRange, priceMin: hasRange ? String(svc.priceMin) : "", priceMax: hasRange ? String(svc.priceMax) : "",
      doctorId: svc.doctorId ?? null,
    });
  }

  const catMeta = (cat: string) => CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[1];
  const doctorName = (id: string | null | undefined) => {
    if (!id) return "Общие для клиники";
    return doctors.find((d) => d.id === id)?.name ?? id.slice(0, 8);
  };

  const tableProps = {
    editingId, editForm, updating, deactivating, activating, catMeta,
    onEdit: startEdit, onUpdate: handleUpdate, onCancelEdit: () => setEditingId(null),
    onDeactivate: (id: string) => setConfirmDeactivate(id),
    onActivate: handleActivate,
    onEditFormChange: setEditForm, t,
  };

  const groups: { doctorId: string | null; name: string; items: ClinicService[] }[] = [];
  if (viewMode === "by-doctor") {
    const map = new Map<string | null, ClinicService[]>();
    map.set(null, []);
    for (const d of doctors) map.set(d.id, []);
    for (const svc of filtered) {
      const key = svc.doctorId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(svc);
    }
    for (const [id, items] of map.entries()) {
      groups.push({ doctorId: id, name: doctorName(id), items });
    }
    groups.sort((a, b) => {
      if (a.doctorId === null) return -1;
      if (b.doctorId === null) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  const cardCls = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

  return (
    <div className="min-h-full space-y-5">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {confirmDeactivate && (
        <ConfirmDialog
          message={t("clinic.services.confirmDeactivate")}
          confirmLabel={t("clinic.services.deactivateBtn")}
          onConfirm={() => { handleDeactivate(confirmDeactivate); setConfirmDeactivate(null); }}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
              <Stethoscope size={12} />
              Clinic OS
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t("clinic.services.title")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{t("clinic.services.subtitle")}</p>
          </div>
          <button
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50"
          >
            <Plus size={15} /> {t("clinic.services.addService")}
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[
          { label: t("clinic.services.activeCount"),   value: stats.total,    cls: "text-teal-600 bg-teal-50" },
          { label: t("clinic.services.inactiveCount"), value: stats.inactive, cls: "text-slate-400 bg-slate-50" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`${cardCls} py-4`}>
            <div className={`text-2xl font-extrabold ${cls.split(" ")[0]}`}>{value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={cardCls}>
          <h3 className="mb-3.5 text-sm font-bold text-slate-950">{t("clinic.services.newService")}</h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.services.name")}</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("clinic.services.namePlaceholder")} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.services.category")}</label>
              <select className={`${inputCls} cursor-pointer`} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Exclude<ServiceCategory, "ALL"> }))}>
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.services.duration")}</label>
              <input type="number" min={1} className={inputCls} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder={t("clinic.services.durationPlaceholder")} />
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.services.doctor")}</label>
            <select className={`${inputCls} cursor-pointer`} value={form.doctorId ?? ""} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value || null }))}>
              <option value="">{t("clinic.services.forClinic")}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center gap-2.5">
              <label className="text-[11px] font-semibold text-slate-500">{t("clinic.services.price")} (UZS)</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
                <input type="checkbox" checked={form.isRangePrice} onChange={(e) => setForm((f) => ({ ...f, isRangePrice: e.target.checked }))} className="cursor-pointer" />
                {t("clinic.services.range")}
              </label>
            </div>
            {form.isRangePrice ? (
              <div className="flex items-center gap-2">
                <input type="number" min={0} className={`${inputCls} max-w-[160px]`} value={form.priceMin} onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))} placeholder="от 100000" />
                <span className="text-sm text-slate-500">—</span>
                <input type="number" min={0} className={`${inputCls} max-w-[160px]`} value={form.priceMax} onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))} placeholder="до 300000" />
              </div>
            ) : (
              <input type="number" min={0} className={`${inputCls} max-w-[200px]`} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder={t("clinic.services.pricePlaceholder")} />
            )}
          </div>
          {createError && <p className="mb-2.5 text-sm text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-70">
              {creating ? t("clinic.common.creating") : t("clinic.common.create")}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="rounded-xl bg-slate-100 px-5 py-2 text-sm text-slate-500 transition hover:bg-slate-200">
              {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* View mode toggle + category filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className="rounded-xl border-[1.5px] px-4 py-1.5 text-sm font-semibold transition"
              style={{
                borderColor: filter === c.value ? c.color : "#e2e8f0",
                background:  filter === c.value ? c.bg  : "#fff",
                color:       filter === c.value ? c.color : "#475569",
              }}
            >
              {c.label}
              {c.value !== "ALL" && (
                <span className="ml-1.5 text-[11px] font-bold">
                  {services.filter((s) => s.category === c.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 rounded-xl bg-slate-100 p-1">
          {([
            { mode: "all" as ViewMode,       icon: <LayoutList size={14} />, label: "Все" },
            { mode: "by-doctor" as ViewMode, icon: <Users size={14} />,      label: "По врачам" },
          ]).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
                viewMode === mode
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              ].join(" ")}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className={cardCls}>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)}</div>
      ) : viewMode === "all" ? (
        <div className={cardCls}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Stethoscope size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-400">
                {filter === "ALL" ? t("clinic.services.noServices") : t("clinic.services.noServicesInCategory")}
              </p>
            </div>
          ) : (
            <ServiceTable services={filtered} {...tableProps} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ doctorId, name, items }) => (
            <div key={doctorId ?? "clinic"} className={cardCls}>
              <div className={`flex items-center justify-between ${items.length > 0 ? "mb-4" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${doctorId ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-slate-100"}`}>
                    {doctorId
                      ? <span className="text-sm font-bold text-white">{name.charAt(0)}</span>
                      : <Stethoscope size={14} className="text-slate-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">{name}</p>
                    <p className="text-[11px] text-slate-400">{items.length} услуг{items.length === 1 ? "а" : items.length < 5 ? "и" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreate(doctorId)}
                  className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 transition hover:bg-teal-100"
                >
                  <Plus size={13} /> Добавить услугу
                </button>
              </div>

              {items.length > 0 && <ServiceTable services={items} {...tableProps} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
