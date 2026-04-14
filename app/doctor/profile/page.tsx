"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi } from "@/lib/api";
import { useDoctor } from "@/context/DoctorContext";
import { User, Edit2, Check, X, Stethoscope } from "lucide-react";

export default function DoctorProfilePage() {
  const { doctor, setDoctor } = useDoctor();
  const [loading, setLoading] = useState(!doctor);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [price, setPrice] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setSpecialization(doctor.specialization ?? "");
      setPrice(doctor.pricePerConsultation != null ? String(doctor.pricePerConsultation) : "");
      setBio(doctor.bio ?? "");
      setLoading(false);
      return;
    }
    doctorApi.auth.me().then((d) => {
      setDoctor(d);
      setName(d.name);
      setSpecialization(d.specialization ?? "");
      setPrice(d.pricePerConsultation != null ? String(d.pricePerConsultation) : "");
      setBio(d.bio ?? "");
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form fields when context doctor changes (e.g. after initial load)
  useEffect(() => {
    if (doctor && !editing) {
      setName(doctor.name);
      setSpecialization(doctor.specialization ?? "");
      setPrice(doctor.pricePerConsultation != null ? String(doctor.pricePerConsultation) : "");
      setBio(doctor.bio ?? "");
    }
  }, [doctor, editing]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await doctorApi.auth.updateProfile({
        name: name.trim(),
        specialization: specialization.trim() || undefined,
        pricePerConsultation: price ? Math.round(Number(price)) : undefined,
        bio: bio.trim() || undefined,
      });
      setDoctor(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
    setSaving(false);
  }

  const verificationBadge = {
    PENDING:  { label: "На проверке", color: "#eab308", bg: "#fefce8" },
    APPROVED: { label: "Верифицирован", color: "#22c55e", bg: "#f0fdf4" },
    REJECTED: { label: "Отклонён", color: "#ef4444", bg: "#fef2f2" },
  };

  if (loading) {
    return <DashboardLayout><div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>Загрузка...</div></DashboardLayout>;
  }

  if (!doctor) {
    return <DashboardLayout><div style={{ textAlign: "center", padding: 80, color: "#ef4444" }}>Ошибка загрузки профиля</div></DashboardLayout>;
  }

  const badge = verificationBadge[doctor.verificationStatus];

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #0d9488, #0f766e)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <User size={22} color="#fff" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Профиль</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Личные данные</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "#64748b",
              }}>
                <Edit2 size={13} /> Изменить
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  background: "#0d9488", color: "#fff", border: "none", borderRadius: 8,
                  padding: "6px 12px", cursor: "pointer", fontSize: 13,
                }}>
                  <Check size={13} />
                </button>
                <button onClick={() => { setEditing(false); setError(""); }} style={{
                  background: "#f1f5f9", border: "none", borderRadius: 8,
                  padding: "6px 12px", cursor: "pointer",
                }}>
                  <X size={13} color="#64748b" />
                </button>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {doctor.profilePhotoUrl ? (
              <img src={doctor.profilePhotoUrl} alt={doctor.name}
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center",
                border: "3px solid #ccfbf1",
              }}>
                <Stethoscope size={28} color="#0d9488" />
              </div>
            )}
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>{doctor.name}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                {doctor.specialization ?? "Врач"} · {doctor.experienceYears} лет опыта
              </p>
            </div>
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>ИМЯ</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%", height: 42, borderRadius: 8, border: "1.5px solid #e2e8f0",
                    padding: "0 12px", fontSize: 14, boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>СПЕЦИАЛИЗАЦИЯ</label>
                <input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Терапевт, педиатр..."
                  style={{
                    width: "100%", height: 42, borderRadius: 8, border: "1.5px solid #e2e8f0",
                    padding: "0 12px", fontSize: 14, boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>ЦЕНА ЗА КОНСУЛЬТАЦИЮ (сум)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="например: 150000"
                  style={{
                    width: "100%", height: 42, borderRadius: 8, border: "1.5px solid #e2e8f0",
                    padding: "0 12px", fontSize: 14, boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>О СЕБЕ</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Краткая биография, опыт, достижения..."
                  rows={3}
                  style={{
                    width: "100%", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    padding: "10px 12px", fontSize: 14, boxSizing: "border-box", outline: "none",
                    resize: "vertical", fontFamily: "inherit",
                  }}
                />
              </div>
              {error && <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([
                ["Телефон", doctor.phone],
                ["Специализация", doctor.specialization ?? "—"],
                ["Опыт", `${doctor.experienceYears} лет`],
                ["Цена консультации", doctor.pricePerConsultation != null ? `${doctor.pricePerConsultation.toLocaleString("ru-RU")} сум` : "—"],
                ["Рейтинг", `★ ${Number(doctor.rating ?? 0).toFixed(1)} (${doctor.reviewCount} отзывов)`],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 14, color: "#0f172a", margin: 0, fontWeight: 500 }}>{value}</p>
                </div>
              ))}
              {doctor.bio && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>О СЕБЕ</p>
                  <p style={{ fontSize: 14, color: "#0f172a", margin: 0, fontWeight: 400, lineHeight: 1.5 }}>{doctor.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Статус аккаунта</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: badge.bg, display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: badge.color }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: 0 }}>Верификация</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: badge.color, margin: 0 }}>{badge.label}</p>
              </div>
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#f8fafc" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 2px" }}>Статус онлайн</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: doctor.isOnline ? "#22c55e" : "#94a3b8" }}>
                {doctor.isOnline ? "Онлайн" : "Офлайн"}
              </p>
            </div>

            {doctor.isBlocked && (
              <div style={{ padding: "14px 16px", borderRadius: 10, background: "#fef2f2" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", margin: 0 }}>
                  Аккаунт заблокирован
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
                  Обратитесь в поддержку
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { display: flex !important; flex-direction: column !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
