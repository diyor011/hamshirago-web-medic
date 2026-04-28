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
  CreditCard,
  ChevronRight,
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
  { href: "/clinic/dashboard", labelKey: "clinic.nav.dashboard", icon: LayoutDashboard, roles: ["CEO"] },
  { href: "/clinic/reception", labelKey: "clinic.nav.reception", icon: CalendarDays, roles: ["CEO", "RECEPTION", "DOCTOR"] },
  { href: "/clinic/leads", labelKey: "clinic.nav.leads", icon: Users, roles: ["CEO", "RECEPTION", "DOCTOR"] },
  { href: "/clinic/rooms", labelKey: "clinic.nav.rooms", icon: DoorOpen, roles: ["CEO"] },
  { href: "/clinic/services", labelKey: "clinic.nav.services", icon: Stethoscope, roles: ["CEO"] },
  { href: "/clinic/staff", labelKey: "clinic.nav.staff", icon: UserCog, roles: ["CEO"] },
  { href: "/clinic/home-orders", labelKey: "clinic.nav.homeOrders", icon: Users, roles: ["CEO", "RECEPTION"] },
  { href: "/clinic/finance", labelKey: "clinic.nav.finance", icon: TrendingUp, roles: ["CEO"] },
  { href: "/clinic/settings", labelKey: "clinic.nav.settings", icon: Settings, roles: ["CEO"] },
  { href: "/clinic/subscription", labelKey: "clinic.nav.subscription", icon: CreditCard, roles: ["CEO"] },
];

function SidebarContent({
  role,
  pathname,
  onLogout,
  onNavClick,
}: {
  role: ClinicRole;
  pathname: string;
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const { clinic } = useClinic();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const roleLabel =
    role === "CEO"
      ? t("clinic.staff.role.ceo")
      : role === "RECEPTION"
        ? t("clinic.staff.role.reception")
        : t("clinic.staff.role.doctor");

  const roleBadgeColor =
    role === "CEO"
      ? "bg-violet-100 text-violet-700"
      : role === "RECEPTION"
        ? "bg-sky-100 text-sky-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="shrink-0 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          {clinic?.logoUrl ? (
            <img
              src={clinic.logoUrl}
              alt={clinic.name}
              className="h-11 w-11 shrink-0 rounded-2xl border-2 border-slate-100 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm">
              <Building2 size={20} color="#fff" strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-tight text-slate-800">
              {clinic?.name ?? "HamshiraGo"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Clinic Portal</p>
          </div>
        </div>

        <div className="mt-4">
          <span
            className={[
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
              roleBadgeColor,
            ].join(" ")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        {visible.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium no-underline transition-all duration-150",
                active
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              ].join(" ")}
            >
              <span
                className={[
                  "shrink-0 transition-colors duration-150",
                  active ? "text-white" : "text-slate-400 group-hover:text-teal-500",
                ].join(" ")}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className="flex-1 truncate">{t(labelKey)}</span>
              {active ? <ChevronRight size={14} className="shrink-0 text-teal-200" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 px-3 pb-4 pt-2">
        <div className="mx-1 mb-3 border-t border-slate-100" />

        <div className="mb-2 flex gap-1.5 px-1">
          {(["ru", "uz"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={[
                "flex-1 rounded-lg py-2 text-[11px] font-bold tracking-wide transition-all duration-150",
                language === lang
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200",
              ].join(" ")}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 py-2.5 text-[13px] font-medium text-red-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} className="shrink-0" />
          {t("clinic.nav.logout")}
        </button>
      </div>
    </div>
  );
}

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/clinic/auth" || pathname === "/clinic/register";

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<ClinicRole | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isAuthPage) {
      setRole(null);
      return;
    }

    const token = getClinicToken();
    if (!token) {
      router.replace("/auth");
      return;
    }

    const nextRole = getClinicRole();
    if (!nextRole) {
      router.replace("/auth");
      return;
    }

    setRole(nextRole);

    const ceoOnly = [
      "/clinic/dashboard",
      "/clinic/rooms",
      "/clinic/services",
      "/clinic/staff",
      "/clinic/finance",
      "/clinic/settings",
      "/clinic/subscription",
    ];

    const doctorBlocked = [...ceoOnly, "/clinic/home-orders"];

    if (
      nextRole === "DOCTOR" &&
      doctorBlocked.some((path) => pathname.startsWith(path))
    ) {
      router.replace("/clinic/reception");
    } else if (
      nextRole === "RECEPTION" &&
      ceoOnly.some((path) => pathname.startsWith(path))
    ) {
      router.replace("/clinic/reception");
    }
  }, [router, pathname, isAuthPage]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearClinicSession();
    router.replace("/auth");
  }

  // До монтирования на клиенте рендерим ничего — сервер не знает о localStorage/role,
  // и любое серверное состояние вызовет hydration mismatch (браузерные расширения
  // вроде Tailwind class sorter переупорядочивают className до React-гидрации).
  if (!mounted && !isAuthPage) return null;

  if (!role && !isAuthPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (isAuthPage) return <>{children}</>;

  return (
    <ContextErrorBoundary zone="Clinic">
      <ClinicProvider>
        <div className="min-h-screen bg-slate-100 md:grid md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="sticky top-0 hidden h-screen border-r border-slate-200/80 bg-white/95 shadow-[1px_0_0_0_#f1f5f9] backdrop-blur md:flex md:flex-col">
            <SidebarContent role={role!} pathname={pathname} onLogout={handleLogout} />
          </aside>

          <main className="min-w-0">
            <div className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
              <button
                onClick={() => setDrawerOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                {drawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700">
                  <Building2 size={13} color="#fff" />
                </div>
                <span className="text-[15px] font-bold text-slate-800">HamshiraGo</span>
              </div>
            </div>

            <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1380px] flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8 md:min-h-screen">
              {children}
            </div>
          </main>
        </div>

        {drawerOpen ? (
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-[2px] md:hidden"
          />
        ) : null}

        <div
          className={[
            "fixed inset-y-0 left-0 z-[100] w-[280px] shadow-2xl transition-transform duration-200 ease-out md:hidden",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <SidebarContent
            role={role!}
            pathname={pathname}
            onLogout={() => {
              setDrawerOpen(false);
              handleLogout();
            }}
            onNavClick={() => setDrawerOpen(false)}
          />
        </div>
      </ClinicProvider>
    </ContextErrorBoundary>
  );
}
