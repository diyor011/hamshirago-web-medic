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
  { href: "/clinic/reception",  labelKey: "clinic.nav.reception", icon: CalendarDays,    roles: ["CEO", "RECEPTION"] },
  { href: "/clinic/leads",      labelKey: "clinic.nav.leads",     icon: Users,           roles: ["CEO", "RECEPTION"] },
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

  const receptionRoleLabel =
    role === "CEO" ? "CEO" : role === "RECEPTION" ? t("clinic.nav.reception") : role;

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "#fff",
      borderRight: "1px solid #e2e8f0", display: "flex",
      flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo / Clinic branding */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {clinic?.logoUrl ? (
            <img
              src={clinic.logoUrl}
              alt={clinic.name}
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #0d9488, #0f766e)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Building2 size={18} color="#fff" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {clinic?.name ?? "HamshiraGo"}
            </p>
            <p style={{ fontSize: 11, color: "#64748b" }}>Clinic Portal</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 600, color: "#0d9488",
          background: "#f0fdfa", borderRadius: 6, padding: "4px 10px",
        }}>
          {receptionRoleLabel}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {visible.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                textDecoration: "none", marginBottom: 2,
                background: active ? "#f0fdfa" : "transparent",
                color: active ? "#0d9488" : "#475569",
                fontWeight: active ? 700 : 500,
                fontSize: 14, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle + Logout */}
      <div style={{ padding: "12px 12px", borderTop: "1px solid #f1f5f9" }}>
        {/* Language switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, padding: "0 0" }}>
          {(["ru", "uz"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${language === lang ? "#0d9488" : "#e2e8f0"}`,
                background: language === lang ? "#f0fdfa" : "#fff",
                color: language === lang ? "#0d9488" : "#94a3b8",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "transparent", color: "#ef4444", fontSize: 14, fontWeight: 500,
          }}
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

  const [role, setRole] = useState<ClinicRole | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isAuthPage) {
      setRole(null);
      return;
    }
    const token = getClinicToken();
    if (!token) { router.replace("/clinic/auth"); return; }
    const r = getClinicRole();
    if (!r) { router.replace("/clinic/auth"); return; }
    setRole(r);

    // Role-based route guard
    const ceoOnly = ["/clinic/dashboard", "/clinic/rooms", "/clinic/services", "/clinic/staff", "/clinic/finance", "/clinic/settings"];
    if (r === "RECEPTION" && ceoOnly.some((p) => pathname.startsWith(p))) {
      router.replace("/clinic/reception");
      return;
    }
  }, [router, pathname, isAuthPage]);

  function handleLogout() {
    clearClinicSession();
    router.replace("/clinic/auth");
  }

  // Close mobile sidebar on route change
  // (useEffect on pathname would cause re-render loop — using inline is fine)

  // Only block non-auth pages while resolving auth
  if (!role && !isAuthPage) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid #0d9488", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ClinicProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
        {/* Desktop sidebar */}
        <div className="clinic-sidebar">
          <SidebarInner role={role!} pathname={pathname} onLogout={handleLogout} />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
              zIndex: 99, display: "none",
            }}
            className="clinic-overlay"
          />
        )}

        {/* Mobile drawer */}
        <div
          className="clinic-drawer"
          style={{
            position: "fixed", top: 0, left: 0, bottom: 0, width: 240, zIndex: 100,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
            display: "none",
          }}
        >
          <SidebarInner role={role!} pathname={pathname} onLogout={() => { setMobileOpen(false); handleLogout(); }} />
        </div>

        <main style={{ flex: 1, minHeight: "100vh" }} className="clinic-main">
          {/* Mobile top bar */}
          <div className="clinic-topbar" style={{ display: "none" }}>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 8, borderRadius: 8,
              }}
            >
              {mobileOpen ? <X size={22} color="#0f172a" /> : <Menu size={22} color="#0f172a" />}
            </button>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>HamshiraGo</span>
          </div>

          <div className="clinic-inner">
            {children}
          </div>
        </main>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .clinic-sidebar { display: block; }
          .clinic-main { margin-left: 240px; }
          .clinic-inner { max-width: 1200px; margin: 0 auto; padding: 32px 28px 60px; }
          .clinic-topbar { display: none; }
          @media (max-width: 768px) {
            .clinic-sidebar { display: none !important; }
            .clinic-main { margin-left: 0 !important; }
            .clinic-inner { padding: 60px 16px 40px !important; }
            .clinic-topbar {
              display: flex !important;
              align-items: center;
              gap: 12px;
              position: fixed;
              top: 0; left: 0; right: 0;
              height: 52px;
              background: #fff;
              border-bottom: 1px solid #e2e8f0;
              padding: 0 16px;
              z-index: 50;
            }
            .clinic-overlay { display: block !important; }
            .clinic-drawer { display: block !important; }
          }
        `}</style>
      </div>
    </ClinicProvider>
  );
}
