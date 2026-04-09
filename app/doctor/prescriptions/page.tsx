"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi, Consultation } from "@/lib/api";
import { FileText, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DoctorPrescriptionsPage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorApi.consultations.my(1, 100);
      // Show completed consultations with notes as "prescriptions"
      setConsultations(res.data.filter((c) => c.status === "COMPLETED" && c.doctorNotes));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #0d9488, #0f766e)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileText size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Рецепты</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Завершённые консультации с назначениями</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Загрузка...</div>
      ) : consultations.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "#fff",
          borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          <FileText size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", margin: 0 }}>Рецептов пока нет</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {consultations.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
                cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s",
              }}
              onClick={() => router.push(`/doctor/consultation/${c.id}`)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <FileText size={18} color="#16a34a" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 2 }}>
                  {c.client?.name ?? "Пациент"}
                </p>
                <p style={{
                  fontSize: 13, color: "#64748b", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.doctorNotes}
                </p>
                {c.prescription && (
                  <span style={{
                    display: "inline-block", marginTop: 4,
                    padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a",
                  }}>
                    {c.prescription.serviceTitle}
                  </span>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, marginBottom: 4 }}>
                  {new Date(c.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </p>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
