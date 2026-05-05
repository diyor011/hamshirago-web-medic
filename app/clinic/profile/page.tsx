"use client";

import { useEffect, useState } from "react";
import { clinicApi, getClinicRole } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import CloudinaryUpload from "@/components/clinic/CloudinaryUpload";
import PageHero from "@/components/clinic/PageHero";
import { UserCircle, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/i18n";

const ROLE_LABELS: Record<string, string> = {
  CEO:       "Direktor (CEO)",
  RECEPTION: "Resepshn",
  DOCTOR:    "Shifokor",
};

export default function ProfilePage() {
  const { toasts, toast, closeToast } = useToast();
  const { t } = useTranslation();

  const [userId, setUserId]     = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [phone, setPhone]       = useState("");
  const [role, setRole]         = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("clinic_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserId(u.id ?? u.staffId ?? null);
        setName(u.name ?? "");
        setPhotoUrl(u.profilePhotoUrl ?? u.photoUrl ?? "");
        setPhone(u.phone ?? "");
      }
      setRole(getClinicRole());
    } catch { /* ignore */ }
  }, []);

  async function handleSave() {
    if (!userId) { toast.error("Foydalanuvchi ID topilmadi"); return; }
    if (!name.trim()) { toast.error("Ism bo'sh bo'lmasin"); return; }
    setSaving(true);
    try {
      const updated = await clinicApi.staff.update(userId, {
        name: name.trim(),
        ...(photoUrl ? { photoUrl } : {}),
      });
      // Update localStorage with new values
      const raw = localStorage.getItem("clinic_user");
      if (raw) {
        const u = JSON.parse(raw);
        localStorage.setItem("clinic_user", JSON.stringify({
          ...u,
          name: updated.name,
          profilePhotoUrl: updated.photoUrl ?? u.profilePhotoUrl,
          photoUrl: updated.photoUrl,
        }));
      }
      toast.success("Profil saqlandi");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xatolik";
      if (msg.includes("403") || msg.includes("Forbidden")) {
        toast.error("Profilingizni tahrirlash uchun CEO ga murojaat qiling (endpoint qo'shilishi kerak)");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const inputCls = "w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <PageHero
        title="Mening profilim"
        subtitle="Ismingiz va rasmingizni tahrirlang"
        badge={<><UserCircle size={12} /> Profil</>}
        accent="teal"
      />

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2">
          <CloudinaryUpload
            currentUrl={photoUrl || null}
            onUploaded={(url) => setPhotoUrl(url)}
            size="md"
          />
          <p className="text-[11px] text-slate-400 text-center">
            JPG, PNG yoki WebP · max 5MB
          </p>
        </div>

        {/* Role badge */}
        {role && (
          <div className="flex justify-center">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
              Ism *
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ismingiz"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
              Telefon (o'zgartirib bo'lmaydi)
            </label>
            <input
              className={inputCls + " opacity-50 cursor-not-allowed"}
              value={phone}
              readOnly
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}
