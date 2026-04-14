"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { getClinicToken, getClinicRole, clearClinicSession } from "@/lib/clinicApi";
import type { ClinicRole } from "@/lib/clinicApi";

interface NavItem {
  href: string;
  label: string;
  icon: React.FC<{ size: number; strokeWidth?: number }>;
  roles: ClinicRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/clinic/dashboard",  label: "Дашборд",    icon: LayoutDashboard, roles: ["CEO"] },
  { href: "/clinic/reception",  label: "Ресепшн",    icon: CalendarDays,    roles: ["CEO", "RECEPTION"] },
  { href: "/clinic/leads",      label: "Лиды",       icon: Users,           roles: ["CEO", "RECEPTION"] },
  { href: "/clinic/rooms",      label: "Кабинеты",   icon: DoorOpen,        roles: ["CEO"] },
  { href: "/clinic/staff",      label: "Сотрудники", icon: UserCog,         roles: ["CEO"] },
  { href: "/clinic/finance",    label: "Финансы",    icon: TrendingUp,      roles: ["CEO"] },
  { href: "/clinic/settings",   label: "Настройки",  icon: Settings,        roles: ["CEO"] },
];

function SidebarInner({ role, pathname, onLogout }: { role: ClinicRole; pathname: string; onLogout: () => void }) {
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "#fff",
      borderRight: "1px solid #e2e8f0", display: "flex",
      flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0d9488, #0f766e)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Building2 size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>HamshiraGo</p>
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
          {role === "CEO" ? "CEO" : role === "RECEPTION" ? "Ресепшн" : role}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <a
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
              {label}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 12px", borderTop: "1px solid #f1f5f9" }}>
        <button
          onClick={onLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "transparent", color: "#ef4444", fontSize: 14, fontWeight: 500,
          }}
        >
          <LogOut size={17} />
          Выйти
        </button>
      </div>
    </aside>
  );
}

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/clinic/auth";

  // Initialise synchronously: auth page is always GUEST, others check localStorage
  const [role, setRole] = useState<ClinicRole | null>(() => {
    if (isAuthPage) return "GUEST" as ClinicRole;
    if (typeof window === "undefined") return null;
    try {
      const token = getClinicToken();
      if (!token) return null;
      return getClinicRole();
    } catch { return null; }
  });

  useEffect(() => {
    if (isAuthPage) {
      setRole("GUEST" as ClinicRole);
      return;
    }
    const token = getClinicToken();
    if (!token) { router.replace("/clinic/auth"); return; }
    const r = getClinicRole();
    if (!r) { router.replace("/clinic/auth"); return; }
    setRole(r);
  }, [router, pathname, isAuthPage]);

  function handleLogout() {
    clearClinicSession();
    router.replace("/clinic/auth");
  }

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
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <div className="clinic-sidebar">
        <SidebarInner role={role} pathname={pathname} onLogout={handleLogout} />
      </div>

      <main style={{ flex: 1, minHeight: "100vh" }} className="clinic-main">
        <div className="clinic-inner">
          {children}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .clinic-sidebar { display: block; }
        .clinic-main { margin-left: 240px; }
        .clinic-inner { max-width: 1200px; margin: 0 auto; padding: 32px 28px 60px; }
        @media (max-width: 768px) {
          .clinic-sidebar { display: none !important; }
          .clinic-main { margin-left: 0 !important; }
          .clinic-inner { padding: 16px 16px 40px !important; }
        }
      `}</style>
    </div>
  );
}
