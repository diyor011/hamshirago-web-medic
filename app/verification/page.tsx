"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock, XCircle, Upload, FileText, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { medicApi, Medic, VerificationStatus } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";

const STATUS_CONFIG: Record<VerificationStatus, { icon: React.ReactNode; label: string; desc: string; bg: string; border: string; color: string; badgeBg: string }> = {
  APPROVED: {
    icon: <CheckCircle size={24} color="#16a34a" />,
    label: "Верификация пройдена",
    desc: "Ваш профиль подтверждён. Вы можете принимать заказы.",
    bg: "#f0fdf4", border: "#86efac", color: "#16a34a", badgeBg: "#dcfce7",
  },
  PENDING: {
    icon: <Clock size={24} color="#d97706" />,
    label: "На рассмотрении",
    desc: "Ваши документы проверяются. Обычно это занимает 1–2 рабочих дня.",
    bg: "#fefce8", border: "#fde047", color: "#854d0e", badgeBg: "#fef9c3",
  },
  REJECTED: {
    icon: <XCircle size={24} color="#dc2626" />,
    label: "Отклонено",
    desc: "Документы не прошли проверку. Загрузите новые.",
    bg: "#fef2f2", border: "#fca5a5", color: "#dc2626", badgeBg: "#fee2e2",
  },
};

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function FileUploadBox({ label, icon, file, onChange, accept }: {
  label: string; icon: React.ReactNode; file: File | null;
  onChange: (f: File | null) => void; accept: string;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{label}</p>
      <label style={{ display: "block", cursor: "pointer" }}>
        <div style={{
          border: `2px dashed ${file ? "#0d9488" : "#e2e8f0"}`,
          borderRadius: 12, padding: "20px 16px", textAlign: "center",
          background: file ? "#f0fdfa" : "#f8fafc", transition: "all 0.15s",
        }}>
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#0d9488" }}>
              <CheckCircle size={16} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#94a3b8" }}>
              {icon}
              <span style={{ fontSize: 13 }}>Нажмите чтобы выбрать файл</span>
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>JPG, PNG или PDF</span>
            </div>
          )}
        </div>
        <input type="file" accept={accept} style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

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

  return (
    <DashboardLayout>
      {loading ? <Spinner /> : (() => {
        const status = medic?.verificationStatus ?? "PENDING";
        const cfg = STATUS_CONFIG[status];
        return (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Аккаунт</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Верификация</h1>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }} className="verification-grid">
              {/* Status + checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Status card */}
                <div style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 16, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {cfg.icon}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: cfg.badgeBg, color: cfg.color, padding: "3px 8px", borderRadius: 20 }}>
                        {status === "APPROVED" ? "ПОДТВЕРЖДЕНО" : status === "PENDING" ? "НА ПРОВЕРКЕ" : "ОТКЛОНЕНО"}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: cfg.color, marginBottom: 6 }}>{cfg.label}</p>
                  <p style={{ fontSize: 13, color: cfg.color, opacity: 0.8, lineHeight: 1.6 }}>{cfg.desc}</p>
                  {status === "REJECTED" && medic?.verificationRejectedReason && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef2f2", borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                        Причина: {medic.verificationRejectedReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Checklist */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Требования</p>
                  {[
                    { label: "Фото лица (анфас, без головного убора)", done: !!(medic?.facePhotoUrl) },
                    { label: "Медицинский диплом или лицензия", done: !!(medic?.licensePhotoUrl) },
                  ].map(({ label, done }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#dcfce7" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {done ? <CheckCircle size={12} color="#16a34a" /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1" }} />}
                      </div>
                      <span style={{ fontSize: 13, color: done ? "#16a34a" : "#64748b", fontWeight: done ? 600 : 400 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload form */}
              {status !== "APPROVED" && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <Upload size={18} color="#0d9488" />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Загрузить документы</h2>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                    <FileUploadBox
                      label="Фото лица"
                      icon={<Camera size={24} />}
                      file={faceFile}
                      onChange={setFaceFile}
                      accept="image/*"
                    />
                    <FileUploadBox
                      label="Лицензия / диплом"
                      icon={<FileText size={24} />}
                      file={licenseFile}
                      onChange={setLicenseFile}
                      accept="image/*,.pdf"
                    />
                  </div>

                  {uploadError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", padding: "12px 14px", borderRadius: 10, marginBottom: 14, color: "#ef4444", fontSize: 13 }}>
                      <AlertCircle size={14} />
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", padding: "12px 14px", borderRadius: 10, marginBottom: 14, color: "#16a34a", fontSize: 13 }}>
                      <CheckCircle size={14} />
                      Документы отправлены на проверку
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!faceFile || !licenseFile || uploading}
                    style={{
                      width: "100%", background: "linear-gradient(135deg, #0d9488, #0f766e)",
                      color: "#fff", border: "none", borderRadius: 10, padding: "13px",
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                      opacity: (!faceFile || !licenseFile || uploading) ? 0.5 : 1,
                    }}
                  >
                    {uploading ? "Отправляем..." : "Отправить на проверку"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .verification-grid { grid-template-columns: 1fr 1fr; }
        @media(max-width:768px){ .verification-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </DashboardLayout>
  );
}
