"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  FaBell,
} from "react-icons/fa";
import { medicApi, Medic, formatPrice, VerificationStatus } from "@/lib/api";
import { subscribeWebPush, unsubscribeWebPush } from "@/lib/webPush";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [tgChatId, setTgChatId] = useState("");
  const [tgConnected, setTgConnected] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }

    let active = true;
    setLoading(true);
    setError("");
    medicApi.auth.me()
      .then((data) => {
        if (!active) return;
        if (!data) throw new Error("Сервер вернул пустой ответ");
        setMedic(data);
        try { localStorage.setItem("medic", JSON.stringify(data)); } catch { /* ignore */ }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error && err.message ? err.message : "Ошибка загрузки профиля");
      })
      .finally(() => { if (active) setLoading(false); });

    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
    const saved = localStorage.getItem("tg_chat_id");
    if (saved) { setTgChatId(saved); setTgConnected(true); }
    const chatIdFromBot = searchParams.get("chatid");
    if (chatIdFromBot) {
      localStorage.setItem("tg_chat_id", chatIdFromBot);
      setTgChatId(chatIdFromBot);
      setTgConnected(true);
      // Сохраняем chatId на бэкенде чтобы уведомления работали на любом устройстве
      medicApi.telegram.saveChatId(chatIdFromBot).catch(() => {});
      router.replace("/profile");
    }

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await medicApi.auth.me();
      if (!data) throw new Error("Сервер вернул пустой ответ");
      setMedic(data);
      try { localStorage.setItem("medic", JSON.stringify(data)); } catch { /* ignore */ }
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Ошибка загрузки профиля");
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

  async function handleDocumentUpload() {
    if (!faceFile || !licenseFile) return;
    setUploading(true);
    setUploadError("");
    try {
      await medicApi.documents.upload(faceFile, licenseFile);
      setUploadSuccess(true);
      setFaceFile(null);
      setLicenseFile(null);
      await loadProfile();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  function disconnectTelegram() {
    localStorage.removeItem("tg_chat_id");
    setTgChatId("");
    setTgConnected(false);
  }

  async function handleNotifToggle() {
    if (notifPermission === "denied") return;
    if (notifPermission === "granted") {
      await unsubscribeWebPush();
      setNotifPermission(Notification.permission);
    } else {
      // Запрашиваем разрешение сразу — до любых await, иначе Chrome блокирует диалог
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        await subscribeWebPush();
      }
    }
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
                  {medic.rating != null ? Number(medic.rating).toFixed(1) : "—"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Рейтинг</p>
            </div>
            <div style={{ textAlign: "center", padding: "4px 0", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{medic.reviewCount ?? 0}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>Отзывов</p>
            </div>
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{medic.experienceYears ?? 0}</p>
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
                {formatPrice(Number(medic.balance) || 0)} <span style={{ fontSize: 15 }}>UZS</span>
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

        {/* Верификация */}
        <VerificationCard
          status={medic.verificationStatus ?? "PENDING"}
          rejectedReason={medic.verificationRejectedReason}
          faceFile={faceFile}
          licenseFile={licenseFile}
          uploading={uploading}
          uploadError={uploadError}
          uploadSuccess={uploadSuccess}
          onFaceChange={setFaceFile}
          onLicenseChange={setLicenseFile}
          onSubmit={handleDocumentUpload}
        />

        {/* Уведомления */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Уведомления</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FaBell size={14} color="#0d9488" />
              </div>
              <div>
                {notifPermission === "granted" && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>Уведомления включены</p>
                )}
                {notifPermission === "denied" && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#ef4444" }}>Уведомления заблокированы в настройках браузера</p>
                )}
                {notifPermission === "default" && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Уведомления выключены</p>
                )}
              </div>
            </div>
            {notifPermission !== "denied" && (
              <button
                onClick={handleNotifToggle}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
                {notifPermission === "granted"
                  ? <FaToggleOn size={36} color="#0d9488" />
                  : <FaToggleOff size={36} color="#cbd5e1" />}
              </button>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={sectionLabel}>Telegram уведомления</p>
          {tgConnected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>Telegram подключён</p>
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>ID: {tgChatId}</p>
                </div>
              </div>
              <button onClick={disconnectTelegram} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                Отключить
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
                Получайте мгновенные уведомления в Telegram когда поступает новый заказ.
              </p>
              <a
                href="https://t.me/hamshirago_medic_bot?start=connect"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "#229ED9", color: "#fff", borderRadius: 12,
                  padding: "13px 20px", fontSize: 15, fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 18 }}>✈️</span>
                Подключить через Telegram
              </a>
            </div>
          )}
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc" }} />}>
      <ProfileContent />
    </Suspense>
  );
}

function VerificationCard({
  status, rejectedReason, faceFile, licenseFile,
  uploading, uploadError, uploadSuccess,
  onFaceChange, onLicenseChange, onSubmit,
}: {
  status: VerificationStatus;
  rejectedReason: string | null;
  faceFile: File | null;
  licenseFile: File | null;
  uploading: boolean;
  uploadError: string;
  uploadSuccess: boolean;
  onFaceChange: (f: File | null) => void;
  onLicenseChange: (f: File | null) => void;
  onSubmit: () => void;
}) {
  const statusConfig = ({
    APPROVED: { bg: "#f0fdf4", border: "#86efac", icon: "✅", text: "Аккаунт верифицирован", color: "#16a34a" },
    PENDING:  { bg: "#fefce8", border: "#fde047", icon: "⏳", text: "Ожидает верификации", color: "#854d0e" },
    REJECTED: { bg: "#fef2f2", border: "#fca5a5", icon: "❌", text: "Верификация отклонена", color: "#dc2626" },
  } as Record<string, { bg: string; border: string; icon: string; text: string; color: string }>)[status]
    ?? { bg: "#fefce8", border: "#fde047", icon: "⏳", text: "Ожидает верификации", color: "#854d0e" };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <p style={sectionLabel}>Верификация</p>

      {/* Статус */}
      <div style={{ background: statusConfig.bg, border: `1px solid ${statusConfig.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: status === "APPROVED" ? 0 : 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{statusConfig.icon}</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: statusConfig.color }}>{statusConfig.text}</p>
          {status === "REJECTED" && rejectedReason && (
            <p style={{ fontSize: 13, color: "#ef4444", marginTop: 2 }}>{rejectedReason}</p>
          )}
          {status === "PENDING" && (
            <p style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}>Загрузите документы ниже для проверки</p>
          )}
        </div>
      </div>

      {/* Форма загрузки документов (PENDING или REJECTED) */}
      {status !== "APPROVED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FileInput label="📸 Фото лица (селфи)" file={faceFile} onChange={onFaceChange} />
          <FileInput label="📄 Лицензия / диплом медика" file={licenseFile} onChange={onLicenseChange} />

          {uploadError && (
            <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p style={{ fontSize: 13, color: "#16a34a", background: "#f0fdf4", padding: "8px 12px", borderRadius: 8 }}>
              ✅ Документы отправлены на проверку
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={!faceFile || !licenseFile || uploading}
            style={{
              background: "#0d9488", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              opacity: (!faceFile || !licenseFile || uploading) ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {uploading ? "Отправляем..." : "Отправить на верификацию"}
          </button>
        </div>
      )}
    </div>
  );
}

function FileInput({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label style={{ display: "block", cursor: "pointer" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{label}</p>
      <div style={{
        border: `2px dashed ${file ? "#0d9488" : "#e2e8f0"}`,
        borderRadius: 10, padding: "14px 16px",
        background: file ? "#f0fdf9" : "#f8fafc",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>{file ? "✅" : "📎"}</span>
        <span style={{ fontSize: 13, color: file ? "#0d9488" : "#94a3b8", fontWeight: 600 }}>
          {file ? file.name : "Нажмите чтобы выбрать файл"}
        </span>
      </div>
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 12,
};
