"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  ChevronRight,
  DoorOpen,
  Sparkles,
  Stethoscope,
  UserCog,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { clinicApi } from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface Step {
  key: string;
  titleKey: string;
  hintKey: string;
  icon: React.ReactNode;
  href: string;
  done: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [hasStaff, setHasStaff] = useState<boolean | null>(null);
  const [hasRooms, setHasRooms] = useState<boolean | null>(null);
  const [hasServices, setHasServices] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      clinicApi.staff.list().then((d) => d.length > 0),
      clinicApi.rooms.list().then((d) => d.length > 0),
      clinicApi.services.list().then((d) => d.length > 0),
    ])
      .then(([staff, rooms, services]) => {
        setHasStaff(staff);
        setHasRooms(rooms);
        setHasServices(services);

        if (staff && rooms && services) {
          router.replace("/clinic/dashboard");
        }
      })
      .catch(() => {
        setHasStaff(false);
        setHasRooms(false);
        setHasServices(false);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const steps: Step[] = [
    {
      key: "staff",
      titleKey: "clinic.dashboard.onboarding.addStaff",
      hintKey: "clinic.dashboard.onboarding.addStaffHint",
      icon: <UserCog size={22} />,
      href: "/clinic/staff",
      done: hasStaff === true,
    },
    {
      key: "rooms",
      titleKey: "clinic.dashboard.onboarding.createRoom",
      hintKey: "clinic.dashboard.onboarding.createRoomHint",
      icon: <DoorOpen size={22} />,
      href: "/clinic/rooms",
      done: hasRooms === true,
    },
    {
      key: "services",
      titleKey: "clinic.dashboard.onboarding.addService",
      hintKey: "clinic.dashboard.onboarding.addServiceHint",
      icon: <Stethoscope size={22} />,
      href: "/clinic/services",
      done: hasServices === true,
    },
    {
      key: "billing",
      titleKey: "clinic.dashboard.onboarding.billing",
      hintKey: "clinic.dashboard.onboarding.billingHint",
      icon: <CreditCard size={22} />,
      href: "/clinic/settings/billing",
      done: false,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const currentStep = steps.find((s) => !s.done) ?? steps[steps.length - 1];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            <Sparkles size={12} />
            {t("clinic.dashboard.onboarding.title")}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t("clinic.dashboard.onboarding.welcomeTitle")}
          </h1>
          <p className="mt-3 text-base text-slate-500">
            {t("clinic.dashboard.onboarding.subtitle")}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {t("clinic.dashboard.onboarding.progress")} {completed}/{steps.length}
            </span>
            <span className="text-sm font-bold text-teal-600">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = !step.done && step.key === currentStep.key;

            return (
              <div
                key={step.key}
                className={[
                  "relative rounded-2xl border p-5 transition-all",
                  step.done
                    ? "border-emerald-200 bg-emerald-50/60"
                    : isActive
                      ? "border-teal-300 bg-white shadow-md shadow-teal-100/60"
                      : "border-slate-200 bg-white/80",
                ].join(" ")}
              >
                <div className="flex items-center gap-4">
                  {/* Step number / check */}
                  <div
                    className={[
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                      step.done
                        ? "bg-emerald-100 text-emerald-600"
                        : isActive
                          ? "bg-teal-600 text-white shadow-lg shadow-teal-200"
                          : "bg-slate-100 text-slate-400",
                    ].join(" ")}
                  >
                    {step.done ? <CheckCircle size={22} /> : step.icon}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "text-[11px] font-bold uppercase tracking-wide",
                          step.done
                            ? "text-emerald-600"
                            : isActive
                              ? "text-teal-600"
                              : "text-slate-400",
                        ].join(" ")}
                      >
                        {t("clinic.dashboard.onboarding.step")} {index + 1}
                      </span>
                      {step.done && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {t("clinic.dashboard.onboarding.done")}
                        </span>
                      )}
                    </div>
                    <p
                      className={[
                        "mt-0.5 text-base font-bold",
                        step.done ? "text-emerald-800" : "text-slate-900",
                      ].join(" ")}
                    >
                      {t(step.titleKey)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{t(step.hintKey)}</p>
                  </div>

                  {/* Action */}
                  {!step.done && (
                    <Link
                      href={step.href}
                      className={[
                        "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                        isActive
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {t("clinic.dashboard.onboarding.go")}
                      {isActive ? (
                        <ArrowRight size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Skip link */}
        <div className="mt-6 text-center">
          <Link
            href="/clinic/dashboard"
            className="text-sm text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline"
          >
            {t("clinic.dashboard.onboarding.skip")}
          </Link>
        </div>
      </div>
    </div>
  );
}
