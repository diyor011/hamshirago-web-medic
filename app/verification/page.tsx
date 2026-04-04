"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaIdCard, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import { medicApi, Medic, VerificationStatus } from "@/lib/api";

const STATUS_CONFIG: Record<VerificationStatus, { icon: JSX.Element; label: string; desc: string; bg: string; border: string; color: string }> = {
  APPROVED: {
    icon: <FaCheckCircle size={28} color="#16a34a" />,
    label: "Верификация пройдена",
    desc: "Ваш профиль подтверждён. Вы можете принимать заказы.",
    bg: "#f0fdf4", border: "#86efac", color: "#16a34a",
  },
  PENDING: {
    icon: <FaClock size={28} color="#d97706" />,
    label: "На рассмотрении",
    desc: "Ваши документы проверяются. Это обычно занимает 1–2 рабочих дня.",
    bg: "#fefce8", border: "#fde047", color: "#854d0e",
  },
  REJECTED: {
    icon: <FaTimesCircle size={28} color="#dc2626" />,
    label: "Отклонено",
    desc: "Документы не прошли проверку. Загрузите новые.",
    bg: "#fef2f2", border: "#fca5a5", color: "#dc2626",
  },
};

export default function VerificationPage() {
  const router = useRouter();
  const [medic, setMedic] = useState<Medic | null>(null);
  const [loading, setLoading] = useState(true);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
    try {
      const data = await medicApi.auth.me();
      setMedic(data);
    } catch {}
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!faceFile || !licenseFile) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);
    try {
      await medicApi.documents.upload(faceFile, licenseFile);
      setUploadSuccess(true);
      setFaceFile(null);
      setLicenseFile(null);
      await load();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const status = medic?.verificationStatus ?? "PENDING";
  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => router.push("/profile")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <FaArrowLeft size={15} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Верификация</p>
            <div style={{ width: 36 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "-20px auto 0", padding: "0 16px 80px" }}>

        {/* Status card */}
        <div style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 16, padding: 20, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 16 }}>
          {cfg.icon}
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>{cfg.label}</p>
            <p style={{ fontSize: 13, color: cfg.color, opacity: 0.8, lineHeight: 1.5 }}>{cfg.desc}</p>
            {status === "REJECTED" && medic?.verificationRejectedReason && (
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 8, fontWeight: 600 }}>
                Причина: {medic.verificationRejectedReason}
              </p>
            )}
          </div>
        </div>

        {/* Upload form */}
        {status !== "APPROVED" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <FaIdCard color="#0d9488" /> Загрузить документы
            </p>

            {/* Face photo */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Фото лица</p>
              <label style={{ display: "block", cursor: "pointer" }}>
                <div style={{
                  border: `2px dashed ${faceFile ? "#0d9488" : "#e2e8f0"}`,
                  borderRadius: 12, padding: "16px", textAlign: "center",
                  background: faceFile ? "#f0fdf9" : "#f8fafc",
                }}>
                  {faceFile ? (
                    <p style={{ fontSize: 13, color: "#0d9488", fontWeight: 600 }}>✓ {faceFile.name}</p>
                  ) : (
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>Нажмите чтобы выбрать фото</p>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFaceFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* License photo */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Лицензия / диплом</p>
              <label style={{ display: "block", cursor: "pointer" }}>
                <div style={{
                  border: `2px dashed ${licenseFile ? "#0d9488" : "#e2e8f0"}`,
                  borderRadius: 12, padding: "16px", textAlign: "center",
                  background: licenseFile ? "#f0fdf9" : "#f8fafc",
                }}>
                  {licenseFile ? (
                    <p style={{ fontSize: 13, color: "#0d9488", fontWeight: 600 }}>✓ {licenseFile.name}</p>
                  ) : (
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>Нажмите чтобы выбрать документ</p>
                  )}
                </div>
                <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {uploadError && (
              <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>{uploadError}</p>
            )}
            {uploadSuccess && (
              <p style={{ fontSize: 13, color: "#16a34a", background: "#f0fdf4", padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>
                ✓ Документы отправлены на проверку
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!faceFile || !licenseFile || uploading}
              style={{
                width: "100%", background: "#0d9488", color: "#fff", border: "none",
                borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer",
                opacity: (!faceFile || !licenseFile || uploading) ? 0.5 : 1,
              }}
            >
              {uploading ? "Отправляем..." : "Отправить на проверку"}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
