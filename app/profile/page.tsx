"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User, Star, Briefcase, Wallet, Phone, Bell, Camera,
  Pen, Check, X, MessageCircle, CheckCircle, Globe,
} from "lucide-react";
import { medicApi, Medic, formatPrice } from "@/lib/api";
import { subscribeWebPush, unsubscribeWebPush } from "@/lib/webPush";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#0d9488" }}>{icon}</span>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [tgChatId, setTgChatId] = useState("");
  const [tgConnected, setTgConnected] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
    let active = true;
    setLoading(true);
    medicApi.auth.me()
      .then((data) => {
        if (!active) return;
        setMedic(data);
        try { localStorage.setItem("medic", JSON.stringify(data)); } catch {}
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : t("profile.loadProfileError"));
      })
      .finally(() => { if (active) setLoading(false); });

    medicApi.orders.my().then((orders) => {
      if (!active) return;
      setDoneCount(orders.filter((o) => o.status === "DONE").length);
    }).catch(() => {});

    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    const saved = localStorage.getItem("tg_chat_id");
    if (saved) { setTgChatId(saved); setTgConnected(true); }
    const chatIdFromBot = searchParams.get("chatid");
    if (chatIdFromBot) {
      localStorage.setItem("tg_chat_id", chatIdFromBot);
      setTgChatId(chatIdFromBot);
      setTgConnected(true);
      medicApi.telegram.saveChatId(chatIdFromBot).catch(() => {});
      router.replace("/profile");
    }
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveName() {
    if (!editName.trim()) return;
    setNameLoading(true);
    setNameError("");
    try {
      const updated = await medicApi.auth.updateProfile(editName.trim());
      const newMedic = { ...medic!, name: updated.name };
      setMedic(newMedic);
      try { localStorage.setItem("medic", JSON.stringify(newMedic)); } catch {}
      setEditingName(false);
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setNameLoading(false);
    }
  }

  async function handleNotifToggle() {
    if (notifPermission === "denied") return;
    if (notifPermission === "granted") {
      await unsubscribeWebPush();
      setNotifPermission(Notification.permission);
    } else {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") await subscribeWebPush();
    }
  }

  function disconnectTelegram() {
    localStorage.removeItem("tg_chat_id");
    setTgChatId("");
    setTgConnected(false);
  }

  return (
    <DashboardLayout>
      {loading ? <Spinner /> : error || !medic ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "#ef4444", marginBottom: 16 }}>{error || t("profile.loadProfileError")}</p>
          <button onClick={() => window.location.reload()} style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Аккаунт</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Профиль</h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }} className="profile-grid">

            {/* Left column — avatar + stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar card */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 20px", textAlign: "center" }}>
                {/* Avatar */}
                <label style={{ cursor: "pointer", display: "inline-block", position: "relative", marginBottom: 16 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdfa", border: "3px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto" }}>
                    {medic.profilePhotoUrl ? (
                      <img src={medic.profilePhotoUrl} alt={medic.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <User size={32} color="#0d9488" />
                    )}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                    {photoUploading
                      ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                      : <Camera size={12} color="#fff" />}
                  </div>
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={photoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setPhotoUploading(true);
                      try {
                        const updated = await medicApi.photo.upload(file);
                        setMedic(updated);
                        try { localStorage.setItem("medic", JSON.stringify(updated)); } catch {}
                      } catch {} finally { setPhotoUploading(false); }
                    }} />
                </label>

                {/* Name edit */}
                {editingName ? (
                  <div style={{ marginBottom: 8 }}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={async (e) => { if (e.key === "Enter") await handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameError(""); } }}
                      autoFocus maxLength={60}
                      style={{ border: "1.5px solid #0d9488", borderRadius: 8, padding: "6px 10px", fontSize: 16, fontWeight: 700, color: "#0f172a", outline: "none", width: "100%", textAlign: "center", boxSizing: "border-box" }} />
                    {nameError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{nameError}</p>}
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                      <button onClick={handleSaveName} disabled={nameLoading}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        <Check size={12} /> Сохранить
                      </button>
                      <button onClick={() => { setEditingName(false); setNameError(""); }}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        <X size={12} /> Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{medic.name}</p>
                    <button onClick={() => { setEditName(medic.name); setEditingName(true); setNameError(""); }}
                      style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Pen size={11} color="#64748b" />
                    </button>
                  </div>
                )}

                {/* Online badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: medic.isOnline ? "#dcfce7" : "#f1f5f9", borderRadius: 20, padding: "4px 12px", marginBottom: 16 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: medic.isOnline ? "#22c55e" : "#94a3b8" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: medic.isOnline ? "#16a34a" : "#64748b" }}>
                    {medic.isOnline ? t("profile.onlineStatus") : t("profile.offlineStatus")}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Рейтинг", value: medic.rating != null ? Number(medic.rating).toFixed(1) : "—", icon: <Star size={14} color="#eab308" />, color: "#0f172a" },
                    { label: "Отзывов", value: String(medic.reviewCount ?? 0), icon: <MessageCircle size={14} color="#0d9488" />, color: "#0f172a" },
                    { label: "Выполнено", value: doneCount !== null ? String(doneCount) : "—", icon: <CheckCircle size={14} color="#16a34a" />, color: "#16a34a" },
                    { label: "Опыт (лет)", value: String(medic.experienceYears ?? 0), icon: <Briefcase size={14} color="#8b5cf6" />, color: "#0f172a" },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{icon}</div>
                      <p style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance card */}
              <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", borderRadius: 16, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, opacity: 0.85 }}>
                  <Wallet size={15} color="#fff" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("profile.myBalance")}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {formatPrice(Number(medic.balance) || 0)} <span style={{ fontSize: 14, opacity: 0.8 }}>UZS</span>
                </p>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Contacts */}
              <SectionCard title={t("profile.contacts")} icon={<Phone size={16} />}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Phone size={15} color="#0d9488" />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{t("profile.phone")}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{medic.phone}</p>
                  </div>
                </div>
              </SectionCard>

              {/* Language */}
              <SectionCard title={t("language.title")} icon={<Globe size={16} />}>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ru", "uz"] as const).map((lang) => (
                    <button key={lang} onClick={() => setLanguage(lang)} style={{
                      padding: "8px 20px", borderRadius: 10, cursor: "pointer",
                      border: `1.5px solid ${language === lang ? "#0d9488" : "#e2e8f0"}`,
                      background: language === lang ? "#0d9488" : "#fff",
                      color: language === lang ? "#fff" : "#64748b",
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {lang === "ru" ? "Русский" : "O'zbek"}
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Notifications */}
              <SectionCard title={t("profile.notifications")} icon={<Bell size={16} />}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    {notifPermission === "granted" && <p style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>{t("profile.notificationsEnabled")}</p>}
                    {notifPermission === "denied" && <p style={{ fontSize: 14, fontWeight: 600, color: "#ef4444" }}>{t("profile.notificationsBlocked")}</p>}
                    {notifPermission === "default" && <p style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>{t("profile.notificationsDisabled")}</p>}
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Push-уведомления о новых заказах</p>
                  </div>
                  {notifPermission !== "denied" && (
                    <button onClick={handleNotifToggle} style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                      background: notifPermission === "granted" ? "#0d9488" : "#e2e8f0", transition: "background 0.2s",
                    }}>
                      <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: notifPermission === "granted" ? 23 : 3 }} />
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* Telegram */}
              <SectionCard title={t("profile.telegram")} icon={<MessageCircle size={16} />}>
                {tgConnected ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle size={16} color="#16a34a" />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{t("profile.telegramConnected")}</p>
                        <p style={{ fontSize: 12, color: "#94a3b8" }}>ID: {tgChatId}</p>
                      </div>
                    </div>
                    <button onClick={disconnectTelegram} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#94a3b8", cursor: "pointer", background: "#fff" }}>
                      {t("profile.telegramDisconnect")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>{t("profile.telegramHint")}</p>
                    <a href={`https://t.me/hamshirago_medic_bot?start=${medic.id}`} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#229ED9", color: "#fff", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                      <MessageCircle size={16} />
                      {t("profile.telegramConnect")}
                    </a>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .profile-grid { grid-template-columns: 300px 1fr; }
        @media(max-width:900px){ .profile-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc" }} />}><ProfileContent /></Suspense>;
}
