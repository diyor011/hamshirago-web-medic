"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, UserX, Users } from "lucide-react";
import { clinicApi, ClinicStaff, ClinicRole } from "@/lib/clinicApi";
import { useToast, ToastContainer, ConfirmDialog } from "@/components/clinic/Toast";
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
    setCreating(true); setCreateError("");
    try {
      await clinicApi.staff.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
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

  async function doDeactivate(id: string) {
    setConfirmId(null);
    setDeactivating(id);
    try {
      await clinicApi.staff.deactivate(id);
      toast.success(t("clinic.staff.deactivated"));
      await loadStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("clinic.common.error"));
    } finally {
      setDeactivating(null);
    }
  }

  const inputCls = "w-full rounded-xl border-[1.5px] border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500";

  return (
    <div className="min-h-full">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {confirmId && (
        <ConfirmDialog
          message={t("clinic.staff.deactivateConfirm")}
          confirmLabel={t("clinic.staff.deactivate")}
          onConfirm={() => doDeactivate(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-950">{t("clinic.staff.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("clinic.staff.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
        >
          <Plus size={16} /> {t("clinic.staff.addStaff")}
        </button>
      </div>

      {error && <div className="mb-5"><ErrorBanner message={error} onRetry={loadStaff} /></div>}

      {showCreate && (
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-950">{t("clinic.staff.newStaff")}</h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.staff.name")}</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("clinic.staff.namePlaceholder")} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.staff.phone")}</label>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t("clinic.staff.phonePlaceholder")} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.staff.password")}</label>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={t("clinic.staff.passwordPlaceholder")} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.staff.roleLabel")}</label>
              <select className={`${inputCls} bg-white`} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ClinicRole }))}>
                <option value="DOCTOR">{t("clinic.staff.role.doctor")}</option>
                <option value="RECEPTION">{t("clinic.staff.role.reception")}</option>
                <option value="CEO">{t("clinic.staff.role.ceo")}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t("clinic.staff.photoUrl")}</label>
              <input className={inputCls} value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder={t("clinic.staff.photoUrlPlaceholder")} />
            </div>
          </div>

          {createError && <p className="mb-3 text-sm text-red-500">{createError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70"
            >
              {creating ? t("clinic.staff.saving") : t("clinic.common.create")}
            </button>
            <button
              onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }}
              className="rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-200"
            >
              {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-16 text-center shadow-sm">
          <Users size={40} className="mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">{t("clinic.staff.noStaff")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((member, idx) => {
            const avatarCls = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <div
                key={member.id}
                className={`relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition ${!member.isActive ? "opacity-55" : ""}`}
              >
                {!member.isActive && (
                  <span className="absolute right-3 top-3 rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">
                    {t("clinic.staff.inactive")}
                  </span>
                )}
                <div className="flex items-start gap-3.5">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${avatarCls}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-950">{member.name}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${ROLE_BADGE[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{member.phone}</p>
                    {member.specialization && (
                      <p className="text-xs font-semibold text-teal-600">{member.specialization}</p>
                    )}
                  </div>
                </div>
                {member.isActive && (
                  <div className="mt-3.5 flex justify-end">
                    <button
                      onClick={() => setConfirmId(member.id)}
                      disabled={deactivating === member.id}
                      className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      <UserX size={13} />
                      {deactivating === member.id ? "..." : t("clinic.staff.deactivate")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
