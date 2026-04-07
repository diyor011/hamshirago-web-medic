"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Wallet,
  User,
  ShieldCheck,
  LogOut,
  Stethoscope,
  Star,
} from "lucide-react";
import { medicApi, Medic } from "@/lib/api";
import { unsubscribeWebPush } from "@/lib/webPush";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/orders", label: "Мои заказы", icon: ClipboardList },
  { href: "/work-zone", label: "Зона работы", icon: MapPin },
  { href: "/wallet", label: "Кошелёк", icon: Wallet },
  { href: "/profile", label: "Профиль", icon: User },
  { href: "/verification", label: "Верификация", icon: ShieldCheck },
  { href: "/reviews", label: "Отзывы", icon: Star },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [medic, setMedic] = useState<Medic | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("medic");
    if (cached) { try { setMedic(JSON.parse(cached)); } catch {} }
    medicApi.auth.me().then(setMedic).catch(() => {});
  }, []);

  async function handleLogout() {
    await unsubscribeWebPush().catch(() => {});
    localStorage.removeItem("medic_token");
    localStorage.removeItem("medic");
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
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Stethoscope size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>HamshiraGo</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>Медицинский портал</p>
          </div>
        </div>
      </div>

      {/* Medic info */}
      {medic && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {medic.profilePhotoUrl || medic.facePhotoUrl ? (
              <img
                src={medic.profilePhotoUrl ?? medic.facePhotoUrl!}
                alt={medic.name}
                style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
              />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={18} color="#94a3b8" />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {medic.name}
              </p>
              <p style={{ fontSize: 11, color: "#64748b" }}>
                ★ {Number(medic.rating ?? 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
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
