"use client";

import { ReactNode } from "react";

interface PageHeroProps {
  /** Main page title */
  title: string;
  /** Subtitle / description shown below the title */
  subtitle?: string;
  /** Optional small badge above the title (text + optional icon) */
  badge?: ReactNode;
  /** Right-side slot — action buttons, stat pills, etc. */
  actions?: ReactNode;
  /** Extra stat chips rendered below the title row */
  stats?: ReactNode;
  /** Accent blob colour set: "teal" (default) | "violet" | "amber" */
  accent?: "teal" | "violet" | "amber";
}

const BLOBS: Record<NonNullable<PageHeroProps["accent"]>, [string, string, string]> = {
  teal:   ["bg-teal-500/20",   "bg-cyan-400/10",    "bg-violet-500/10"],
  violet: ["bg-violet-500/20", "bg-fuchsia-400/10", "bg-teal-500/10"],
  amber:  ["bg-amber-500/20",  "bg-orange-400/10",  "bg-rose-500/10"],
};

export default function PageHero({
  title,
  subtitle,
  badge,
  actions,
  stats,
  accent = "teal",
}: PageHeroProps) {
  const [b1, b2, b3] = BLOBS[accent];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6 sm:py-7">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-16 top-0 h-48 w-48 rounded-full ${b1} blur-3xl`} />
        <div className={`absolute right-0 top-0 h-56 w-56 rounded-full ${b2} blur-3xl`} />
        <div className={`absolute bottom-0 right-1/4 h-32 w-32 rounded-full ${b3} blur-2xl`} />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          {badge && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
              {badge}
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
          )}
          {stats && <div className="mt-4 flex flex-wrap gap-2.5">{stats}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

/** Reusable ghost button styled for dark hero backgrounds */
export function HeroButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** A small stat chip inside the hero stats row */
export function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
