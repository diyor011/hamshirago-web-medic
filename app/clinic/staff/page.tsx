"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, UserX, UserCheck, Users, Pencil, Check, X, CalendarDays } from "lucide-react";
import { clinicApi, ClinicStaff, ClinicRole } from "@/lib/clinicApi";
import { useToast, ToastContainer, ConfirmDialog } from "@/components/clinic/Toast";
import PageHero, { HeroButton } from "@/components/clinic/PageHero";
import { useTranslation } from "react-i18next";
import "@/i18n";

const ROLE_BADGE: Record<ClinicRole, string> = {
  CEO:       "bg-purple-50 text-purple-600",
  RECEPTION: "bg-blue-50 text-blue-600",
  DOCTOR:    "bg-teal-50 text-teal-600",
};

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-green-50 text-green-600",
  "bg-orange-50 text-orange-600",
  "bg-pink-50 text-pink-600",
];

const inputCls = "w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all";

function Skeleton() {
  return <div className="h-[100px] animate-pulse rounded-2xl bg-slate-100" />;
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

interface CreateForm {
  name: string;
  phone: string;
  password: string;
  role: ClinicRole;
  specialization: string;
  photoUrl: string;
}

const EMPTY_FORM: CreateForm = {
  name: "", phone: "", password: "", role: "DOCTOR", specialization: "", photoUrl: "",
};

export default function StaffPage() {
  const { t } = useTranslation();

  const ROLE_LABELS: Record<ClinicRole, string> = {
    CEO:       t("clinic.staff.role.ceo"),
    RECEPTION: t("clinic.staff.role.reception"),
    DOCTOR:    t("clinic.staff.role.doctor"),
  };

  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [scheduleStaff, setScheduleStaff] = useState<ClinicStaff | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ workDays: [] as number[], startTime: "09:00", endTime: "18:00", breakStart: "", breakEnd: "" });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", specialization: "", photoUrl: "" });
  const [updating, setUpdating] = useState(false);

  const { toasts, toast, closeToast } = useToast();

  const loadStaff = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStaff(await clinicApi.staff.list()); }
    catch (e) { setError(e instanceof Error ? e.message : t("clinic.staff.errorLoad")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError(t("clinic.staff.errorName")); return; }
    if (!form.phone.trim()) { setCreateError(t("clinic.staff.errorPhone")); return; }
    if (!form.password.trim()) { setCreateError(t("clinic.staff.errorPassword")); return; }
    // QA-WM-20: min 8 chars + 1 digit
    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setCreateError(t("clinic.staff.errorPasswordWeak")); return;
    }
    // QA-WM-19: Cloudinary-only photo URL
    if (form.photoUrl && !form.photoUrl.startsWith("https://res.cloudinary.com/")) {
      setCreateError(t("clinic.staff.errorPhotoUrl")); return;
    }
    setCreating(true); setCreateError("");
    try {
      await clinicApi.staff.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        ...(form.specialization ? { specialization: form.specialization } : {}),
        ...(form.photoUrl ? { photoUrl: form.photoUrl } : {}),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadStaff();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t("clinic.staff.errorCreate"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(member: ClinicStaff) {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      specialization: member.specialization ?? "",
      photoUrl: member.photoUrl ?? "",
    });
  }

  async function handleUpdate() {
    if (!editingId) return;
    if (!editForm.name.trim()) { toast.error(t("clinic.staff.errorName")); return; }
    setUpdating(true);
    try {
      await clinicApi.staff.update(editingId, {
        name: editForm.name.trim(),
        ...(editForm.specialization ? { specialization: editForm.specialization } : {}),
        ...(editForm.photoUrl ? { photoUrl: editForm.photoUrl } : {}),
      });
      setEditingId(null);
      toast.success(t("clinic.common.saved"));
      await loadStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.staff.errorCreate"));
    } finally {
      setUpdating(false);
    }
  }

  async function openSchedule(member: ClinicStaff) {
    setScheduleStaff(member);
    setScheduleLoading(true);
    try {
      const s = await clinicApi.staff.getSchedule(member.id);
      if (s) setScheduleForm({ workDays: s.workDays, startTime: s.startTime, endTime: s.endTime, breakStart: s.breakStart ?? "", breakEnd: s.breakEnd ?? "" });
      else setScheduleForm({ workDays: [1,2,3,4,5], startTime: "09:00", endTime: "18:00", breakStart: "", breakEnd: "" });
    } catch { setScheduleForm({ workDays: [1,2,3,4,5], startTime: "09:00", endTime: "18:00", breakStart: "", breakEnd: "" }); }
    finally { setScheduleLoading(false); }
  }

  async function handleSaveSchedule() {
    if (!scheduleStaff) return;
    setScheduleLoading(true);
    try {
      await clinicApi.staff.setSchedule(scheduleStaff.id, {
        workDays: scheduleForm.workDays,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        ...(scheduleForm.breakStart && scheduleForm.breakEnd ? { breakStart: scheduleForm.breakStart, breakEnd: scheduleForm.breakEnd } : {}),
      });
      toast.success("Jadval saqlandi");
      setScheduleStaff(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Xatolik"); }
    finally { setScheduleLoading(false); }
  }

  async function handleDeactivate(id: string) {
    setDeactivating(id); setConfirmId(null);
    try {
      await clinicApi.staff.deactivate(id);
      toast.success(t("clinic.staff.deactivated"));
      await loadStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.staff.errorDeactivate"));
    } finally {
      setDeactivating(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {confirmId && (
        <ConfirmDialog
          message={t("clinic.staff.confirmDeactivate")}
          onConfirm={() => handleDeactivate(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Schedule modal */}
      {scheduleStaff && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm" onClick={() => setScheduleStaff(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-950">Ish jadvali</h3>
                <p className="text-[12px] text-slate-400">{scheduleStaff.name}</p>
              </div>
              <button onClick={() => setScheduleStaff(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X size={16} /></button>
            </div>
            {scheduleLoading ? (
              <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" /></div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Days */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">Ish kunlari</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[["Du",1],["Se",2],["Ch",3],["Pa",4],["Ju",5],["Sha",6],["Ya",0]].map(([label, day]) => (
                      <button key={day}
                        onClick={() => setScheduleForm((f) => ({
                          ...f,
                          workDays: f.workDays.includes(Number(day))
                            ? f.workDays.filter((d) => d !== Number(day))
                            : [...f.workDays, Number(day)],
                        }))}
                        className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${scheduleForm.workDays.includes(Number(day)) ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Boshlanish</label>
                    <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Tugash</label>
                    <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Tanaffus boshlanish</label>
                    <input type="time" value={scheduleForm.breakStart} onChange={(e) => setScheduleForm((f) => ({ ...f, breakStart: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Tanaffus tugash</label>
                    <input type="time" value={scheduleForm.breakEnd} onChange={(e) => setScheduleForm((f) => ({ ...f, breakEnd: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
                  </div>
                </div>
                <button onClick={handleSaveSchedule} disabled={scheduleLoading || scheduleForm.workDays.length === 0}
                  className="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-40">
                  Saqlash
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <PageHero
        title={t("clinic.staff.title")}
        subtitle={t("clinic.staff.subtitle")}
        badge={<><Users size={12} /> Clinic OS</>}
        actions={
          <>
            <HeroButton onClick={loadStaff}>
              <RefreshCw size={14} /> {t("clinic.common.refresh")}
            </HeroButton>
            <HeroButton onClick={() => setShowCreate((v) => !v)}>
              <Plus size={14} /> {t("clinic.staff.addStaff")}
            </HeroButton>
          </>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <p className="text-sm font-bold text-slate-700">{t("clinic.staff.newStaff")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.name")} *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.phone")} *</label>
              <input
                className={inputCls}
                value={form.phone}
                type="tel"
                placeholder="+998"
                onFocus={() => { if (!form.phone) setForm((f) => ({ ...f, phone: "+998" })); }}
                onBlur={() => { if (form.phone === "+998") setForm((f) => ({ ...f, phone: "" })); }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw.startsWith("+998")) { setForm((f) => ({ ...f, phone: "+998" })); return; }
                  const digits = raw.slice(4).replace(/\D/g, "").slice(0, 9);
                  setForm((f) => ({ ...f, phone: "+998" + digits }));
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.password")} *</label>
              <input className={inputCls} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.roleLabel")}</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ClinicRole }))}>
                {(Object.keys(ROLE_LABELS) as ClinicRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.specialization")}</label>
              <input className={inputCls} value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} placeholder={t("clinic.staff.specializationPlaceholder")} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.editPhotoUrl")}</label>
              <input className={inputCls} value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-70">
              <Check size={14} /> {creating ? "..." : t("clinic.staff.create")}
            </button>
            <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200">
              <X size={14} /> {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <ErrorBanner message={error} onRetry={loadStaff} />}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <Users size={32} className="text-slate-300" />
          <p className="text-sm text-slate-400">{t("clinic.staff.empty")}</p>
        </div>
      ) : (
        <>
        {/* CEO section — separate from regular staff */}
        {staff.some((m) => m.role === "CEO") && (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-purple-400">{t("clinic.staff.role.ceo")}</p>
            <div className="flex flex-col gap-2">
              {staff.filter((m) => m.role === "CEO").map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-extrabold text-purple-600">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.phone}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    {t("clinic.staff.role.ceo")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.filter((m) => m.role !== "CEO").map((member, idx) => (
            <div key={member.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* ── Top: avatar + info ────────────────────────── */}
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 truncate">{member.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_BADGE[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                    {!member.isActive && (
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                        {t("clinic.staff.inactive")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{member.phone}</p>
                  {/* specialization — всегда одна строка, пустая если нет */}
                  <p className="text-xs text-slate-500 mt-0.5 truncate min-h-[16px]">
                    {member.specialization ?? ""}
                  </p>
                </div>
              </div>

              {/* ── Inline edit form ──────────────────────────── */}
              {editingId === member.id && (
                <div className="mt-4 flex flex-col gap-3.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.editName")}</label>
                    <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.specialization")}</label>
                    <input className={inputCls} value={editForm.specialization} onChange={(e) => setEditForm((f) => ({ ...f, specialization: e.target.value }))} placeholder={t("clinic.staff.specializationPlaceholder")} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">{t("clinic.staff.editPhotoUrl")}</label>
                    <input className={inputCls} value={editForm.photoUrl} onChange={(e) => setEditForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} disabled={updating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-70">
                      <Check size={14} /> {updating ? "..." : t("clinic.staff.saveBtn")}
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-200">
                      <X size={14} /> {t("clinic.common.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Actions — всегда внизу, всегда одинаковая высота ── */}
              {editingId !== member.id && (
                <div className="mt-auto pt-4 flex justify-end gap-2">
                  {member.isActive ? (
                    <>
                      <button
                        onClick={() => startEdit(member)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Pencil size={13} /> {t("clinic.staff.change")}
                      </button>
                      {member.role === "DOCTOR" && (
                        <button
                          onClick={() => openSchedule(member)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-600 transition hover:bg-teal-100"
                        >
                          <CalendarDays size={13} /> Jadval
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmId(member.id)}
                        disabled={deactivating === member.id}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <UserX size={13} />
                        {deactivating === member.id ? "..." : t("clinic.staff.deactivate")}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmId(member.id)}
                      disabled={deactivating === member.id}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <UserCheck size={13} />
                      {deactivating === member.id ? "..." : t("clinic.staff.activate")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
