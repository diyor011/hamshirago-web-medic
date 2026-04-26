"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  DoorOpen,
  UserCog,
  Settings,
  TrendingUp,
  LogOut,
  Building2,
  Stethoscope,
  Menu,
  X,
} from "lucide-react";
import { getClinicToken, getClinicRole, clearClinicSession } from "@/lib/clinicApi";
import type { ClinicRole } from "@/lib/clinicApi";
import { ClinicProvider, useClinic } from "@/context/ClinicContext";
import ContextErrorBoundary from "@/components/ContextErrorBoundary";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import "@/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.FC<{ size: number; strokeWidth?: number }>;
  roles: ClinicRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/clinic/dashboard",  labelKey: "clinic.nav.dashboard", icon: LayoutDashboard, roles: ["CEO"] },
  { href: "/clinic/reception",  labelKey: "clinic.nav.reception", icon: CalendarDays,    roles: ["CEO", "RECEPTION", "DOCTOR"] },
  { href: "/clinic/leads",      labelKey: "clinic.nav.leads",     icon: Users,           roles: ["CEO", "RECEPTION", "DOCTOR"] },
  { href: "/clinic/rooms",      labelKey: "clinic.nav.rooms",     icon: DoorOpen,        roles: ["CEO"] },
  { href: "/clinic/services",   labelKey: "clinic.nav.services",  icon: Stethoscope,     roles: ["CEO"] },
  { href: "/clinic/staff",      labelKey: "clinic.nav.staff",     icon: UserCog,         roles: ["CEO"] },
  { href: "/clinic/finance",    labelKey: "clinic.nav.finance",   icon: TrendingUp,      roles: ["CEO"] },
  { href: "/clinic/settings",   labelKey: "clinic.nav.settings",  icon: Settings,        roles: ["CEO"] },
];

function SidebarInner({ role, pathname, onLogout }: { role: ClinicRole; pathname: string; onLogout: () => void }) {
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const { clinic } = useClinic();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const isCeo = role === "CEO";

  const receptionRoleLabel =
    role === "CEO" ? "CEO" : role === "RECEPTION" ? t("clinic.nav.reception") : role;

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-200 flex flex-col fixed top-0 left-0 z-50">
      {/* Logo / Clinic branding */}
      <div className="px-5 py-6 border-b border-slate-100 flex items-center gap-2.5">
        {clinic?.logoUrl ? (
          <img
            src={clinic.logoUrl}
            alt={clinic.name}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shrink-0">
            <Building2 size={18} color="#fff" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-slate-900 leading-tight truncate">
            {clinic?.name ?? "HamshiraGo"}
          </p>
          <p className="text-[11px] text-slate-500">Clinic Portal</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 rounded-md px-2.5 py-1">
          {receptionRoleLabel}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col">
        {visible.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center no-underline rounded-xl transition-all duration-150",
                isCeo ? "gap-3.5 px-3.5 py-3.5 text-base mb-1" : "gap-2.5 px-3 py-2.5 text-sm mb-0.5",
                active
                  ? "bg-teal-50 text-teal-600 font-bold border-l-[3px] border-teal-600"
                  : "text-slate-500 font-medium border-l-[3px] border-transparent hover:bg-slate-50",
              ].join(" ")}
            >
              <Icon size={isCeo ? 22 : 17} strokeWidth={active ? 2.5 : 2} />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle + Logout */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-1.5 mb-2">
          {(["ru", "uz"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={[
                "flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150",
                language === lang
                  ? "border-[1.5px] border-teal-600 bg-teal-50 text-teal-600"
                  : "border-[1.5px] border-slate-200 bg-white text-slate-400",
              ].join(" ")}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-0 cursor-pointer bg-transparent text-red-500 text-sm font-medium hover:bg-red-50 transition-colors duration-150"
        >
          <LogOut size={17} />
          {t("clinic.nav.logout")}
        </button>
      </div>
    </aside>
  );
}

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/clinic/auth" || pathname === "/clinic/register";

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<ClinicRole | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isAuthPage) {
      setRole(null);
      return;
    }
    const token = getClinicToken();
    if (!token) { router.replace("/auth"); return; }
    const r = getClinicRole();
    if (!r) { router.replace("/auth"); return; }
    setRole(r);

    const ceoOnly = ["/clinic/dashboard", "/clinic/rooms", "/clinic/services", "/clinic/staff", "/clinic/finance", "/clinic/settings"];
    if ((r === "RECEPTION" || r === "DOCTOR") && ceoOnly.some((p) => pathname.startsWith(p))) {
      router.replace("/clinic/reception");
      return;
    }
  }, [router, pathname, isAuthPage]);

  function handleLogout() {
    clearClinicSession();
    router.replace("/auth");
  }

  if (!mounted) return null;

  if (!role && !isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ContextErrorBoundary zone="Clinic">
      <ClinicProvider>
        <div className="flex min-h-screen bg-slate-50">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <SidebarInner role={role!} pathname={pathname} onLogout={handleLogout} />
          </div>

          {/* Mobile overlay */}
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-[99] md:hidden"
            />
          )}

          {/* Mobile drawer */}
          <div
            className={[
              "fixed top-0 left-0 bottom-0 w-60 z-[100] md:hidden transition-transform duration-200 ease-in-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <SidebarInner
              role={role!}
              pathname={pathname}
              onLogout={() => { setMobileOpen(false); handleLogout(); }}
            />
          </div>

          <main className="flex-1 min-h-screen md:ml-60">
            {/* Mobile top bar */}
            <div className="flex md:hidden items-center gap-3 fixed top-0 left-0 right-0 h-13 bg-white border-b border-slate-200 px-4 z-50">
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="bg-transparent border-0 cursor-pointer flex items-center justify-center p-2 rounded-lg"
              >
                {mobileOpen ? <X size={22} className="text-slate-900" /> : <Menu size={22} className="text-slate-900" />}
              </button>
              <span className="text-[15px] font-extrabold text-slate-900">HamshiraGo</span>
            </div>

            <div className="max-w-[1200px] mx-auto px-7 pt-8 pb-15 mt-13 md:mt-0">
              {children}
            </div>
          </main>
        </div>
      </ClinicProvider>
    </ContextErrorBoundary>
  );
}
