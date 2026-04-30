"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, UserX, Users, Pencil, Check, X } from "lucide-react";
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

                {/* Inline edit form */}
                {editingId === member.id && (
                  <div className="mt-4 flex flex-col gap-3.5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">Имя *</label>
                      <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">Специализация</label>
                      <input className={inputCls} value={editForm.specialization} onChange={(e) => setEditForm((f) => ({ ...f, specialization: e.target.value }))} placeholder="Терапевт, хирург..." />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">Фото URL</label>
                      <input className={inputCls} value={editForm.photoUrl} onChange={(e) => setEditForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdate} disabled={updating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-70">
                        <Check size={14} /> {updating ? "..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-200">
                        <X size={14} /> Отмена
                      </button>
                    </div>
                  </div>
                )}

                {member.isActive && editingId !== member.id && (
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(member)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Pencil size={13} /> Изменить
                    </button>
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
