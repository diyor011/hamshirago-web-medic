"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaUserNurse,
  FaStar,
  FaBriefcaseMedical,
  FaWallet,
  FaPhone,
  FaToggleOn,
  FaToggleOff,
  FaSignOutAlt,
} from "react-icons/fa";
import { medicApi, Medic, formatPrice } from "@/lib/api";
import { unsubscribeWebPush } from "@/lib/webPush";

export default function ProfilePage() {
  const router = useRouter();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await medicApi.auth.me();
      setMedic(data);
      localStorage.setItem("medic", JSON.stringify(data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    unsubscribeWebPush();
    localStorage.removeItem("medic_token");
    localStorage.removeItem("medic");
    router.push("/auth");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#64748b" }}>Загружаем профиль...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !medic) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <p style={{ fontSize: 15, color: "#ef4444", marginBottom: 16 }}>{error || "Не удалось загрузить профиль"}</p>
        <button onClick={loadProfile} style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Повторить
        </button>
      </div>
    );
  }

  const expLabel = medic.experienceYears === 1
    ? "год"
    : medic.experienceYears < 5
      ? "года"
      : "лет";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Шапка */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <FaArrowLeft size={15} />
          </button>
          <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Мой профиль</p>
          <button
            onClick={handleLogout}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <FaSignOutAlt size={15} />
          </button>
        </div>

        {/* Аватар + имя */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <FaUserNurse size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{medic.name}</h1>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: medic.isOnline ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.15)",
            borderRadius: 20, padding: "4px 14px",
          }}>
            {medic.isOnline
              ? <FaToggleOn size={14} color="#22c55e" />
              : <FaToggleOff size={14} color="rgba(255,255,255,0.6)" />}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {medic.isOnline ? "Онлайн" : "Оффлайн"}
            </span>
          </div>
        </div>
      </div>
      </div>

      <div style={{ maxWidth: 720, margin: "-20px auto 0", padding: "0 24px 80px" }}>
        {/* Статистика */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                <FaStar size={14} color="#eab308" />
                <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  {medic.rating !== null ? Number(medic.rating).toFixed(1) : "—"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Рейтинг</p>
            </div>
            <div style={{ textAlign: "center", padding: "4px 0", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{medic.reviewCount}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Отзывов</p>
            </div>
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{medic.experienceYears}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Лет опыта</p>
            </div>
          </div>
        </div>

        {/* Баланс */}
        <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaWallet size={20} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600, marginBottom: 2 }}>Мой баланс</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                {formatPrice(medic.balance)} <span style={{ fontSize: 15 }}>UZS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Телефон */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Контакты</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaPhone size={14} color="#0d9488" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>Телефон</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{medic.phone}</p>
            </div>
          </div>
        </div>

        {/* Опыт */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Опыт работы</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaBriefcaseMedical size={14} color="#0d9488" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {medic.experienceYears} {expLabel} в медицине
            </p>
          </div>
        </div>

        {/* Выход */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", background: "transparent",
            color: "#ef4444", border: "1.5px solid #ef4444",
            borderRadius: 14, padding: "14px 16px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <FaSignOutAlt size={14} />
          Выйти из аккаунта
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 12,
};
