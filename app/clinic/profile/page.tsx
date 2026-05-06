"use client";

import { useEffect, useState } from "react";
import { clinicApi, getClinicRole } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";
import CloudinaryUpload from "@/components/clinic/CloudinaryUpload";
import { Save, Phone, User, Shield, Camera } from "lucide-react";
import "@/i18n";

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  CEO:       { label: "Direktor (CEO)", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  RECEPTION: { label: "Resepshn",       color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"   },
  DOCTOR:    { label: "Shifokor",       color: "text-teal-700",   bg: "bg-teal-50 border-teal-200"   },
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
}

export default function ProfilePage() {
  const { toasts, toast, closeToast } = useToast();

  const [userId, setUserId]   = useState<string | null>(null);
  const [name, setName]       = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [phone, setPhone]     = useState("");
  const [role, setRole]       = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [mounted, setMounted] = useState(false);
  const [changed, setChanged] = useState(false);
  const [origName, setOrigName] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("clinic_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUserId(u.id ?? u.staffId ?? null);
        setName(u.name ?? "");
        setOrigName(u.name ?? "");
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
      // photoUrl excluded until DEMO-BE-7 is done (UpdateStaffDto lacks the field)
      const updated = await clinicApi.staff.update(userId, {
        name: name.trim(),
      });
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
      setOrigName(updated.name);
      setChanged(false);
      toast.success("Profil saqlandi ✓");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xatolik";
      if (msg.includes("403") || msg.includes("Forbidden") || msg.includes("INSUFFICIENT")) {
        toast.error("CEO ruxsat berishi kerak — DEMO-BE-10 task");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const roleMeta = role ? (ROLE_META[role] ?? null) : null;

  return (
    <div className="min-h-full">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Page wrapper — centered on desktop, full-width on mobile */}
      <div className="mx-auto max-w-2xl space-y-0">

        {/* ── Hero banner ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-6 pb-16 pt-8">
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 left-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />

          <div className="relative flex flex-col items-center gap-3 text-center">
            {/* Avatar */}
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl sm:h-28 sm:w-28"
                />
              ) : (
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl ring-4 ring-white/20 sm:h-28 sm:w-28">
                  {getInitials(name)}
                </div>
              )}
            </div>

            {/* Name + role */}
            <div>
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">
                {name || "—"}
              </h1>
              {roleMeta && (
                <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${roleMeta.bg} ${roleMeta.color}`}>
                  <Shield size={10} />
                  {roleMeta.label}
                </span>
              )}
            </div>

            {/* Phone */}
            {phone && (
              <p className="flex items-center gap-1.5 text-[13px] text-slate-400">
                <Phone size={12} /> {phone}
              </p>
            )}
          </div>
        </div>

        {/* ── Edit card — overlaps hero ────────────────────────────── */}
        <div className="relative -mt-6 rounded-3xl bg-white shadow-xl ring-1 ring-slate-100 px-5 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 space-y-6">

          {/* Photo upload */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Camera size={11} /> Profil rasmi
              </p>
              <CloudinaryUpload
                currentUrl={photoUrl || null}
                onUploaded={(url) => { setPhotoUrl(url); setChanged(true); }}
                size="md"
              />
              <p className="text-[10px] text-slate-300 text-center">
                JPG · PNG · WebP<br />max 5 MB
              </p>
            </div>

            {/* Divider on mobile, vertical on desktop */}
            <div className="hidden sm:block w-px bg-slate-100 self-stretch" />
            <div className="sm:hidden h-px w-full bg-slate-100" />

            {/* Fields */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <User size={11} /> Ism *
                </label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setChanged(true); }}
                  placeholder="To'liq ismingiz"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Phone size={11} /> Telefon
                </label>
                <input
                  value={phone}
                  readOnly
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-400 outline-none cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-300">Telefon raqamni o'zgartirib bo'lmaydi</p>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !changed}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold transition-all ${
                changed && !saving
                  ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-200"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              } disabled:opacity-60`}
            >
              <Save size={15} />
              {saving ? "Saqlanmoqda..." : changed ? "Saqlash" : "O'zgarish yo'q"}
            </button>

            {changed && (
              <button
                onClick={() => { setName(origName); setChanged(false); }}
                className="mt-2 w-full rounded-2xl py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                Bekor qilish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
