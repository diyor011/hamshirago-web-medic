"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi, Consultation, ConsultationStatus } from "@/lib/api";
import { ClipboardList, Clock, CheckCircle, XCircle, ChevronRight, RefreshCw } from "lucide-react";

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  PENDING: "Ожидает",
  ACTIVE: "Активна",
  COMPLETED: "Завершена",
  CANCELED: "Отменена",
};

const STATUS_COLOR: Record<ConsultationStatus, { text: string; bg: string }> = {
  PENDING:   { text: "#eab308", bg: "#fefce8" },
  ACTIVE:    { text: "#0d9488", bg: "#f0fdfa" },
  COMPLETED: { text: "#22c55e", bg: "#f0fdf4" },
  CANCELED:  { text: "#ef4444", bg: "#fef2f2" },
};

type Tab = "pending" | "all";

export default function DoctorConsultationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<Consultation[]>([]);
  const [all, setAll] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        doctorApi.consultations.pending(),
        doctorApi.consultations.my(1, 50).then((r) => r.data),
      ]);
      setPending(pendingRes);
      setAll(allRes);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAccept(id: string) {
    setActionId(id);
    try {
      await doctorApi.consultations.accept(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
    setActionId(null);
  }

  async function handleDecline(id: string) {
    if (!confirm("Отклонить консультацию?")) return;
    setActionId(id);
    try {
      await doctorApi.consultations.decline(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
    setActionId(null);
  }

  const displayed = tab === "pending" ? pending : all;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #0d9488, #0f766e)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Консультации</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {pending.length > 0 ? `${pending.length} ожидают ответа` : "Нет новых консультаций"}
            </p>
          </div>
        </div>
        <button onClick={load} style={{
          background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b",
        }}>
          <RefreshCw size={14} />
          Обновить
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {([["pending", "Ожидают"], ["all", "Все"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
            background: tab === key ? "#fff" : "transparent",
            color: tab === key ? "#0d9488" : "#94a3b8",
            boxShadow: tab === key ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>
            {label}
            {key === "pending" && pending.length > 0 && (
              <span style={{
                marginLeft: 6, background: "#ef4444", color: "#fff",
                borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 6px",
              }}>{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Загрузка...</div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "#fff",
          borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          <Clock size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", margin: 0 }}>
            {tab === "pending" ? "Нет ожидающих консультаций" : "Консультаций пока нет"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayed.map((c) => {
            const sc = STATUS_COLOR[c.status];
            const isActing = actionId === c.id;
            return (
              <div key={c.id} style={{
                background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
                padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                      color: sc.text, background: sc.bg,
                    }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {new Date(c.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, color: "#0f172a", fontWeight: 600, marginBottom: 4 }}>
                    {c.client?.name ?? "Клиент"} · {c.client?.phone ?? ""}
                  </p>

                  {c.suggestedSpecialization && (
                    <p style={{ fontSize: 13, color: "#0d9488", marginBottom: 4 }}>
                      Специализация: {c.suggestedSpecialization}
                    </p>
                  )}

                  <p style={{
                    fontSize: 13, color: "#475569",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 500,
                  }}>
                    {c.symptoms}
                  </p>

                  {c.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => handleAccept(c.id)}
                        disabled={isActing}
                        style={{
                          background: "linear-gradient(135deg, #0d9488, #0f766e)",
                          color: "#fff", border: "none", borderRadius: 8,
                          padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: isActing ? "not-allowed" : "pointer",
                          opacity: isActing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <CheckCircle size={14} />
                        {isActing ? "..." : "Принять"}
                      </button>
                      <button
                        onClick={() => handleDecline(c.id)}
                        disabled={isActing}
                        style={{
                          background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                          borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700,
                          cursor: isActing ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <XCircle size={14} />
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/doctor/consultation/${c.id}`)}
                  style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "8px 12px", cursor: "pointer", color: "#64748b",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  Детали <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
