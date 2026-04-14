"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  ClipboardList,
  Calendar,
  FileText,
  User,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { useDoctor } from "@/context/DoctorContext";

const NAV = [
  { href: "/doctor/consultations", label: "Консультации", icon: ClipboardList },
  { href: "/doctor/schedule", label: "Расписание", icon: Calendar },
  { href: "/doctor/prescriptions", label: "Рецепты", icon: FileText },
  { href: "/doctor/profile", label: "Профиль", icon: User },
];

export default function DoctorSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { doctor } = useDoctor();

  function handleLogout() {
    localStorage.removeItem("medic_token");
    localStorage.removeItem("doctor");
    localStorage.removeItem("user_role");
    router.push("/auth");
  }

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "#fff",
      borderRight: "1px solid #e2e8f0", display: "flex",
      flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="HamshiraGo" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>HamshiraGo</p>
            <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 600 }}>Врачебный портал</p>
          </div>
        </div>
      </div>

      {/* Doctor info */}
      {doctor && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {doctor.profilePhotoUrl ? (
              <img
                src={doctor.profilePhotoUrl}
                alt={doctor.name}
                style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
              />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #ccfbf1",
              }}>
                <Stethoscope size={18} color="#0d9488" />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doctor.name}
              </p>
              <p style={{ fontSize: 11, color: "#64748b" }}>
                {doctor.specialization ?? "Врач"} · ★ {Number(doctor.rating ?? 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                marginBottom: 2, textAlign: "left",
                background: active ? "#f0fdfa" : "transparent",
                color: active ? "#0d9488" : "#475569",
                fontWeight: active ? 700 : 500,
                fontSize: 14, transition: "all 0.15s",
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 12px", borderTop: "1px solid #f1f5f9" }}>
        <button
          onClick={handleLogout}
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
