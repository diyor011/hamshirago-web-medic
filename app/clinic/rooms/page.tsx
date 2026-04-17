"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, UserPlus, RefreshCw, Building2, Clock } from "lucide-react";
import {
  clinicApi,
  ClinicRoom,
  ClinicStaff,
  RoomDoctorSchedule,
} from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

const DAY_LABELS: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
};

const UI_DAY_OPTIONS = [
  { value: 1, label: DAY_LABELS[1] },
  { value: 2, label: DAY_LABELS[2] },
  { value: 3, label: DAY_LABELS[3] },
  { value: 4, label: DAY_LABELS[4] },
  { value: 5, label: DAY_LABELS[5] },
  { value: 6, label: DAY_LABELS[6] },
  { value: 7, label: DAY_LABELS[7] },
];

function Skeleton({ height = 56, radius = 12 }: { height?: number; radius?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background: "#f1f5f9",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, color: "#ef4444" }}>{message}</span>
      <button onClick={onRetry} style={{
        display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
        color: "#ef4444", background: "none", border: "none", cursor: "pointer",
      }}>
        <RefreshCw size={13} /> {t("clinic.common.retry")}
      </button>
    </div>
  );
}

interface AssignDoctorForm {
  doctorId: string;
  days: number[];
  startTime: string;
  endTime: string;
}

interface RoomWithSchedule extends ClinicRoom {
  schedules?: RoomDoctorSchedule[];
  loadingSchedule?: boolean;
}

export default function RoomsPage() {
  const { t } = useTranslation();

  const [rooms, setRooms] = useState<RoomWithSchedule[]>([]);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create room form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createFloor, setCreateFloor] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Assign doctor modal
  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignDoctorForm>({
    doctorId: "",
    days: [],
    startTime: "09:00",
    endTime: "18:00",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const doctors = staff.filter((s) => s.role === "DOCTOR" && s.isActive);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomList, staffList] = await Promise.all([
        clinicApi.rooms.list(),
        clinicApi.staff.list(),
      ]);
      setStaff(staffList);
      // Load schedules for each room
      const withSchedules = await Promise.all(
        roomList.map(async (r) => {
          try {
            const schedules = await clinicApi.rooms.schedule(r.id);
            return { ...r, schedules };
          } catch {
            return { ...r, schedules: [] };
          }
        })
      );
      setRooms(withSchedules);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinic.rooms.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  async function handleCreate() {
    if (!createName.trim()) { setCreateError(t("clinic.rooms.errorCreate")); return; }
    setCreating(true);
    setCreateError("");
    try {
      await clinicApi.rooms.create({
        name: createName.trim(),
        floor: createFloor ? createFloor.trim() : undefined,
      });
      setCreateName("");
      setCreateFloor("");
      setShowCreate(false);
      await loadRooms();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t("clinic.rooms.errorCreateGeneral"));
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign() {
    if (!assignRoomId) return;
    if (!assignForm.doctorId) { setAssignError(t("clinic.rooms.errorAssignDoctor")); return; }
    if (assignForm.days.length === 0) { setAssignError(t("clinic.rooms.errorAssignDays")); return; }
    if (!assignForm.startTime || !assignForm.endTime) { setAssignError(t("clinic.rooms.errorAssignTime")); return; }
    setAssigning(true);
    setAssignError("");
    try {
      await clinicApi.rooms.addDoctor(assignRoomId, {
        doctorId: assignForm.doctorId,
        days: assignForm.days,
        startTime: assignForm.startTime,
        endTime: assignForm.endTime,
      });
      setAssignRoomId(null);
      setAssignForm({ doctorId: "", days: [], startTime: "09:00", endTime: "18:00" });
      await loadRooms();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : t("clinic.rooms.errorAssignGeneral"));
    } finally {
      setAssigning(false);
    }
  }

  function toggleDay(day: number) {
    setAssignForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  const getDoctorName = (id: string) =>
    staff.find((s) => s.id === id)?.name ?? id;

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{t("clinic.rooms.title")}</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("clinic.rooms.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "10px 20px",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Plus size={16} /> {t("clinic.rooms.addRoom")}
        </button>
      </div>

      {error && <div style={{ marginBottom: 20 }}><ErrorBanner message={error} onRetry={loadRooms} /></div>}

      {/* Create form */}
      {showCreate && (
        <div style={{ ...card, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{t("clinic.rooms.newRoom")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{t("clinic.rooms.roomName")}</label>
              <input
                style={inputStyle}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("clinic.rooms.roomNamePlaceholder")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{t("clinic.rooms.floor")}</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                value={createFloor}
                onChange={(e) => setCreateFloor(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          {createError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>{createError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px 20px",
                fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? t("clinic.common.saving") : t("clinic.common.create")}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateName(""); setCreateFloor(""); setCreateError(""); }}
              style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, cursor: "pointer", color: "#64748b",
              }}
            >
              {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Rooms table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <Building2 size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>{t("clinic.rooms.noRooms")}</p>
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "12px 20px", color: "#64748b", fontWeight: 600 }}>{t("clinic.rooms.roomHeader")}</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>{t("clinic.rooms.floorHeader")}</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>{t("clinic.rooms.doctorHeader")}</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>{t("clinic.rooms.scheduleHeader")}</th>
                <th style={{ textAlign: "right", padding: "12px 20px", color: "#64748b", fontWeight: 600 }}>{t("clinic.rooms.actionsHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const sched = Array.isArray(room.schedules) ? room.schedules : [];
                return (
                  <tr key={room.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Building2 size={16} color="#0d9488" />
                        </div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{room.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>
                      {room.floor != null ? `${room.floor} ${t("clinic.rooms.floorSuffix")}` : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {sched.length === 0 ? (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{t("clinic.rooms.notAssigned")}</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {sched.map((s) => (
                            <span key={s.id} style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                              {getDoctorName(s.doctorId)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {sched.length === 0 ? (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {sched.map((s) => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ display: "flex", gap: 2 }}>
                                {(s.days ?? []).map((d) => (
                                  <span key={d} style={{
                                    fontSize: 10, fontWeight: 700, padding: "1px 5px",
                                    borderRadius: 5, background: "#f0fdfa", color: "#0d9488",
                                  }}>
                                    {DAY_LABELS[d] ?? String(d)}
                                  </span>
                                ))}
                              </div>
                              <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={10} /> {s.startTime}–{s.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          onClick={() => { setAssignRoomId(room.id); setAssignError(""); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "#f0fdfa", color: "#0d9488", border: "1px solid #ccfbf1",
                            cursor: "pointer",
                          }}
                        >
                          <UserPlus size={13} /> {t("clinic.rooms.assignDoctor")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign doctor modal */}
      {assignRoomId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(15,23,42,0.15)",
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>
              {t("clinic.rooms.assignDoctorTitle")} — {rooms.find((r) => r.id === assignRoomId)?.name}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{t("clinic.rooms.doctor")}</label>
              <select
                style={{ ...inputStyle, background: "#fff" }}
                value={assignForm.doctorId}
                onChange={(e) => setAssignForm((f) => ({ ...f, doctorId: e.target.value }))}
              >
                <option value="">{t("clinic.rooms.selectDoctor")}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialization ?? t("clinic.rooms.noSpecialization")}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>{t("clinic.rooms.weekdays")}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {UI_DAY_OPTIONS.map(({ label, value }) => {
                  const active = assignForm.days.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleDay(value)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${active ? "#0d9488" : "#e2e8f0"}`,
                        background: active ? "#f0fdfa" : "#fff",
                        color: active ? "#0d9488" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{t("clinic.rooms.startTime")}</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={assignForm.startTime}
                  onChange={(e) => setAssignForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>{t("clinic.rooms.endTime")}</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={assignForm.endTime}
                  onChange={(e) => setAssignForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            {assignError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{assignError}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleAssign}
                disabled={assigning}
                style={{
                  flex: 1, background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "12px 0",
                  fontSize: 14, fontWeight: 700, cursor: assigning ? "not-allowed" : "pointer",
                  opacity: assigning ? 0.7 : 1,
                }}
              >
                {assigning ? t("clinic.common.saving") : t("clinic.rooms.assignDoctor")}
              </button>
              <button
                onClick={() => {
                  setAssignRoomId(null);
                  setAssignForm({ doctorId: "", days: [], startTime: "09:00", endTime: "18:00" });
                  setAssignError("");
                }}
                style={{
                  flex: 1, background: "#f1f5f9", border: "none", borderRadius: 10,
                  padding: "12px 0", fontSize: 14, cursor: "pointer", color: "#64748b", fontWeight: 600,
                }}
              >
                {t("clinic.common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
