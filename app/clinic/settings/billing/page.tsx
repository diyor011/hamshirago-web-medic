"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, Hash, Landmark, CheckCircle, ArrowLeft } from "lucide-react";
import { clinicApi } from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

export default function BillingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [legalName, setLegalName] = useState("");
  const [inn, setInn] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clinicApi.company.get()
      .then((c) => {
        setLegalName(c.legalName ?? "");
        setInn(c.inn ?? "");
        setBankAccount(c.bankAccount ?? "");
        setBankName(c.bankName ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await clinicApi.company.update({ legalName, inn, bankAccount, bankName });
      setSaved(true);
      localStorage.setItem("clinic-onboarding-complete", "1");
      setTimeout(() => router.replace("/clinic/dashboard"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("clinic.common.error"));
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = legalName.trim().length > 0 && inn.trim().length > 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-8">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft size={16} />
        {t("clinic.common.back")}
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          <CreditCard size={12} />
          {t("clinic.dashboard.onboarding.step")} 4
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          {t("clinic.dashboard.onboarding.billing")}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {t("clinic.billing.subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-sm space-y-5"
      >
        {/* Legal Name */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Building2 size={15} className="text-slate-400" />
            {t("clinic.billing.legalName")}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={t("clinic.billing.legalNamePlaceholder")}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* INN */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Hash size={15} className="text-slate-400" />
            {t("clinic.billing.inn")}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={inn}
            onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 9))}
            placeholder="123456789"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
          <p className="mt-1 text-xs text-slate-400">{t("clinic.billing.innHint")}</p>
        </div>

        {/* Bank Account */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CreditCard size={15} className="text-slate-400" />
            {t("clinic.billing.bankAccount")}
          </label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="20208000000000000000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Bank Name */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Landmark size={15} className="text-slate-400" />
            {t("clinic.billing.bankName")}
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder={t("clinic.billing.bankNamePlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle size={16} />
            {t("clinic.billing.saved")}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t("clinic.common.saving") : t("clinic.billing.save")}
        </button>

        {/* Skip */}
        <button
          type="button"
          onClick={() => router.replace("/clinic/dashboard")}
          className="w-full text-center text-sm text-slate-400 transition hover:text-slate-600"
        >
          {t("clinic.dashboard.onboarding.skip")}
        </button>
      </form>
    </div>
  );
}
