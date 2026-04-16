"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi, Consultation } from "@/lib/api";
import {
  ArrowLeft, Video, CheckCircle, FileText, User, Clock, AlertCircle, Bot,
  PlusCircle, Send, CalendarPlus, History, Pill, Download,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/clinic/Toast";

interface PrescriptionItem {
  drug: string;
  dose: string;
  frequency: string;
  days: string;
}

export default function DoctorConsultationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Prescription form state
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [prescForm, setPrescForm] = useState<PrescriptionItem>({ drug: "", dose: "", frequency: "", days: "" });
  const [showPrescForm, setShowPrescForm] = useState(false);
  const { toasts, toast, closeToast } = useToast();

  const load = useCallback(async () => {
    try {
      const c = await doctorApi.consultations.get(id);
      setConsultation(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleComplete() {
    if (!notes.trim()) { toast.warn("Введите заметки врача"); return; }
    setCompleting(true);
    try {
      await doctorApi.consultations.complete(id, { doctorNotes: notes });
      await load();
      setShowComplete(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setCompleting(false);
  }

  function addPrescriptionItem() {
    if (!prescForm.drug.trim()) return;
    setPrescriptionItems((prev) => [...prev, { ...prescForm }]);
    setPrescForm({ drug: "", dose: "", frequency: "", days: "" });
    setShowPrescForm(false);
  }

  function removePrescriptionItem(idx: number) {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSendPrescription() {
    if (prescriptionItems.length === 0) {
      toast.warn("Добавьте хотя бы один препарат");
      return;
    }
    const cons = consultation;
    sessionStorage.setItem("print_prescription", JSON.stringify({
      drugs: prescriptionItems,
      patientName: cons?.client?.name ?? "—",
      patientPhone: cons?.client?.phone ?? "—",
      doctorName: cons?.doctor?.name ?? "—",
      doctorSpec: cons?.doctor?.specialization ?? "",
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
    }));
    window.open("/doctor/prescription/print", "_blank");
  }

  function handleScheduleNextVisit() {
    toast.info("Функция будет доступна в ближайшее время");
  }

  async function handleJoinCall() {
    try {
      const { token, roomName } = await doctorApi.consultations.joinCall(id);
      // Open LiveKit room in new tab (or use embedded LiveKit component)
      window.open(`https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "")}&token=${token}`, "_blank");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось подключиться к звонку");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>Загрузка...</div>
      </DashboardLayout>
    );
  }

  if (error || !consultation) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", padding: 60 }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
          <p style={{ color: "#ef4444" }}>{error || "Консультация не найдена"}</p>
          <button onClick={() => router.back()} style={{
            marginTop: 16, background: "#f1f5f9", border: "none", borderRadius: 8,
            padding: "10px 20px", cursor: "pointer", fontSize: 14, color: "#64748b",
          }}>Назад</button>
        </div>
      </DashboardLayout>
    );
  }

  const c = consultation;
  const isActive = c.status === "ACTIVE";

  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{
          background: "#f1f5f9", border: "none", borderRadius: 8,
          padding: "8px 12px", cursor: "pointer", color: "#64748b",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={16} /> Назад
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Консультация
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            {new Date(c.createdAt).toLocaleString("ru-RU")}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Left — main info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Client card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              Пациент
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={20} color="#94a3b8" />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>{c.client?.name ?? "—"}</p>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{c.client?.phone ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Симптомы
            </h3>
            {c.suggestedSpecialization && (
              <span style={{
                display: "inline-block", marginBottom: 10,
                padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                color: "#0d9488", background: "#f0fdfa", border: "1px solid #ccfbf1",
              }}>
                {c.suggestedSpecialization}
              </span>
            )}
            <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: 0 }}>{c.symptoms}</p>
          </div>

          {/* Salomat AI summary */}
          {c.salomatSummary && (
            <div style={{ background: "linear-gradient(135deg, #f0fdfa, #e0f2fe)", borderRadius: 14, border: "1.5px solid #5eead4", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: "linear-gradient(135deg, #0d9488, #0f766e)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Bot size={15} color="#fff" />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
                  Salomat AI — Краткое резюме
                </h3>
              </div>
              <p style={{ fontSize: 14, color: "#134e4a", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                {c.salomatSummary}
              </p>
            </div>
          )}

          {/* Doctor notes (if completed) */}
          {c.doctorNotes && (
            <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Заметки врача
              </h3>
              <p style={{ fontSize: 14, color: "#166534", lineHeight: 1.6, margin: 0 }}>{c.doctorNotes}</p>
            </div>
          )}

          {/* Visit history placeholder */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <History size={16} color="#64748b" />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
                История визитов пациента
              </h3>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                История предыдущих визитов будет доступна после интеграции с медкартой пациента.
              </p>
            </div>
          </div>

          {/* Prescription form */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Pill size={16} color="#9333ea" />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
                  Рецепт
                </h3>
              </div>
              <button
                onClick={() => setShowPrescForm(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: "#faf5ff", color: "#9333ea", border: "1px solid #e9d5ff",
                  cursor: "pointer",
                }}
              >
                <PlusCircle size={13} /> Добавить
              </button>
            </div>

            {prescriptionItems.length === 0 && !showPrescForm && (
              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                Нет препаратов. Нажмите «Добавить».
              </p>
            )}

            {prescriptionItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {prescriptionItems.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 10, background: "#faf5ff", border: "1px solid #e9d5ff",
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#3b0764", margin: "0 0 2px" }}>{item.drug}</p>
                      {item.dose && <p style={{ fontSize: 12, color: "#7c3aed", margin: "0 0 1px" }}>Доза: {item.dose}</p>}
                      {item.frequency && <p style={{ fontSize: 12, color: "#7c3aed", margin: "0 0 1px" }}>Приём: {item.frequency}</p>}
                      {item.days && <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{item.days} дней</p>}
                    </div>
                    <button
                      onClick={() => removePrescriptionItem(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: 4 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {showPrescForm && (
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                {[
                  { key: "drug" as const, label: "Препарат *", placeholder: "Ибупрофен" },
                  { key: "dose" as const, label: "Доза", placeholder: "400 мг" },
                  { key: "frequency" as const, label: "Кратность", placeholder: "3 раза в день" },
                  { key: "days" as const, label: "Дней", placeholder: "5" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a",
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                      }}
                      value={prescForm[key]}
                      onChange={(e) => setPrescForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={addPrescriptionItem}
                    style={{
                      background: "#9333ea", color: "#fff", border: "none", borderRadius: 8,
                      padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => setShowPrescForm(false)}
                    style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#64748b" }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {prescriptionItems.length > 0 && (
              <button
                onClick={handleSendPrescription}
                style={{
                  width: "100%", background: "linear-gradient(135deg, #9333ea, #7c3aed)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "11px 0",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Send size={15} /> Сформировать рецепт (PDF)
              </button>
            )}
          </div>

          {/* Complete form */}
          {isActive && showComplete && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                Завершить консультацию
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Диагноз и рекомендации..."
                rows={5}
                style={{
                  width: "100%", borderRadius: 10, border: "1.5px solid #e2e8f0",
                  padding: 12, fontSize: 14, color: "#0f172a", resize: "vertical",
                  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  style={{
                    background: "linear-gradient(135deg, #0d9488, #0f766e)",
                    color: "#fff", border: "none", borderRadius: 8,
                    padding: "10px 20px", fontSize: 14, fontWeight: 700,
                    cursor: completing ? "not-allowed" : "pointer", opacity: completing ? 0.7 : 1,
                  }}
                >
                  {completing ? "Сохранение..." : "Завершить"}
                </button>
                <button
                  onClick={() => setShowComplete(false)}
                  style={{
                    background: "#f1f5f9", border: "none", borderRadius: 8,
                    padding: "10px 20px", fontSize: 14, cursor: "pointer", color: "#64748b",
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Status */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20 }}>
            <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>СТАТУС</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color="#0d9488" />
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {{ PENDING: "Ожидает", ACTIVE: "Активна", COMPLETED: "Завершена", CANCELED: "Отменена" }[c.status]}
              </span>
            </div>
          </div>

          {/* Video call */}
          {isActive && (
            <button
              onClick={handleJoinCall}
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff", border: "none", borderRadius: 14,
                padding: "16px 20px", cursor: "pointer", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <Video size={18} />
              Видеозвонок
            </button>
          )}

          {/* Complete consultation */}
          {isActive && !showComplete && (
            <button
              onClick={() => setShowComplete(true)}
              style={{
                background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                borderRadius: 14, padding: "14px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <CheckCircle size={16} />
              Завершить консультацию
            </button>
          )}

          {/* Download PDF — only when completed and has doctor notes */}
          {c.status === "COMPLETED" && c.doctorNotes && (
            <button
              onClick={() => window.open(`/doctor/consultation/${id}/print`, "_blank")}
              style={{
                background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1",
                borderRadius: 14, padding: "14px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Download size={16} />
              Скачать заключение (PDF)
            </button>
          )}

          {/* Schedule next visit */}
          <button
            onClick={handleScheduleNextVisit}
            style={{
              background: "#f0fdfa", color: "#0d9488", border: "1px solid #ccfbf1",
              borderRadius: 14, padding: "14px 20px", cursor: "pointer",
              fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <CalendarPlus size={16} />
            Назначить следующий визит
          </button>

          {/* Prescription badge */}
          {c.prescription && (
            <div style={{
              background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a",
              padding: 16, display: "flex", alignItems: "center", gap: 10,
            }}>
              <FileText size={18} color="#d97706" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: 0 }}>Рецепт выписан</p>
                <p style={{ fontSize: 12, color: "#b45309", margin: 0 }}>{c.prescription.serviceTitle}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] { display: flex !important; flex-direction: column !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
