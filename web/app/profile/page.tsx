"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaUser, FaPhone, FaListAlt, FaSignOutAlt } from "react-icons/fa";
import { unsubscribeWebPush } from "@/lib/webPush";

interface UserInfo {
  id: string;
  phone: string;
  name: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored) as UserInfo);
      } else {
        // Fallback: decode JWT payload to get phone
        const payload = JSON.parse(atob(token.split(".")[1])) as { sub?: string; phone?: string };
        setUser({ id: payload.sub ?? "", phone: payload.phone ?? "", name: null });
      }
    } catch {
      router.push("/auth");
    }
  }, [router]);

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth");
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initials = user.name
    ? user.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.phone.slice(-2);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            >
              <FaArrowLeft size={14} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Мой профиль</p>
            <button
              onClick={handleLogout}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            >
              <FaSignOutAlt size={14} />
            </button>
          </div>

          {/* Аватар */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              border: "3px solid rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: 28, fontWeight: 800, color: "#fff",
            }}>
              {initials || <FaUser size={32} color="#fff" />}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              {user.name ?? "Пользователь"}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{user.phone}</p>
          </div>
        </div>
      </div>

      {/* Карточки */}
      <div style={{ maxWidth: 680, margin: "-20px auto 0", padding: "0 20px 80px" }}>

        {/* Данные */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <p style={sectionLabel}>Личные данные</p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
            <div style={iconWrap}><FaUser size={14} color="#0d9488" /></div>
            <div>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>Имя</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{user.name ?? "—"}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={iconWrap}><FaPhone size={14} color="#0d9488" /></div>
            <div>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>Телефон</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{user.phone}</p>
            </div>
          </div>
        </div>

        {/* Мои заказы */}
        <button
          onClick={() => router.push("/orders")}
          style={{
            width: "100%", background: "#fff", borderRadius: 16,
            padding: "16px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            border: "1px solid #f1f5f9",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 12, textAlign: "left",
          }}
        >
          <div style={iconWrap}><FaListAlt size={14} color="#0d9488" /></div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>История заказов</p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Ваши прошлые и активные заказы</p>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1l5 5-5 5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Выход */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", background: "transparent",
            color: "#ef4444", border: "1.5px solid #ef4444",
            borderRadius: 14, padding: "14px 16px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginTop: 8,
          }}
        >
          <FaSignOutAlt size={14} />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 12,
};

const iconWrap: React.CSSProperties = {
  width: 38, height: 38, borderRadius: "50%",
  background: "#f0fdf9",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
