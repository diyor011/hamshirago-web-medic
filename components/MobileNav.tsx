"use client";

import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, MapPin, Wallet, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/orders", label: "Заказы", icon: ClipboardList },
  { href: "/work-zone", label: "Зона", icon: MapPin },
  { href: "/wallet", label: "Кошелёк", icon: Wallet },
  { href: "/profile", label: "Профиль", icon: User },
];

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e2e8f0",
      display: "flex", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "10px 4px", border: "none", background: "transparent",
              cursor: "pointer", color: active ? "#0d9488" : "#94a3b8",
              gap: 3,
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
