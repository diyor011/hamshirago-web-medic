"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Search, User } from "lucide-react";
import { clinicApi, ClinicStaff, PaymentType, PatientInfo, DoctorRoomSlot } from "@/lib/clinicApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "CASH", label: "Наличные" },
  { value: "TERMINAL", label: "Терминал" },
  { value: "ONLINE", label: "Online" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

export default function BookingModal({ open, onClose, onSuccess }: Props) {
  const [doctors, setDoctors] = useState<ClinicStaff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Patient lookup
  const [phone, setPhone] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientNotFound, setPatientNotFound] = useState(false);

  // Booking form
  const [doctorId, setDoctorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [roomSlots, setRoomSlots] = useState<DoctorRoomSlot[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Load available rooms when doctor + date are set
  useEffect(() => {
    if (!doctorId || !date) { setRoomSlots([]); setRoomId(""); return; }
    let cancelled = false;
    setLoadingRooms(true);
    clinicApi.rooms
      .forDoctor(doctorId, date)
      .then((slots) => {
        if (cancelled) return;
        setRoomSlots(slots);
        // Auto-select first if only one room
        if (slots.length === 1) setRoomId(slots[0].roomId);
        else setRoomId("");
      })
      .catch(() => {
        if (!cancelled) setRoomSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => { cancelled = true; };
  }, [doctorId, date]);

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const all = await clinicApi.staff.list();
      setDoctors(all.filter((s) => s.role === "DOCTOR" && s.isActive));
    } catch {
      // ignore
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadDoctors();
  }, [open, loadDoctors]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhone(""); setPatient(null); setPatientName(""); setPatientNotFound(false);
      setDoctorId(""); setRoomId(""); setPaymentType("CASH"); setError("");
      setDate(new Date().toISOString().slice(0, 10)); setTime("09:00");
    }
  }, [open]);

  async function searchPatient() {
    if (!phone.trim()) return;
    setSearchingPatient(true); setPatient(null); setPatientNotFound(false); setPatientName("");
    try {
      const p = await clinicApi.patients.getByPhone(phone.trim());
      setPatient(p);
      setPatientName(p.name ?? "");
    } catch {
      setPatientNotFound(true);
    } finally {
      setSearchingPatient(false);
    }
  }

  async function handleSubmit() {
    if (!phone.trim()) { setError("Введите номер телефона"); return; }
    if (!doctorId) { setError("Выберите врача"); return; }
    if (!date) { setError("Выберите дату"); return; }
    if (!time) { setError("Укажите время"); return; }
    if (!roomId) { setError("Выберите кабинет"); return; }

    // Validate time is within doctor's room schedule window
    const slot = roomSlots.find((s) => s.roomId === roomId);
    if (slot && (time < slot.startTime || time > slot.endTime)) {
      setError(`Время вне графика врача (${slot.startTime}–${slot.endTime})`);
      return;
    }

    setSubmitting(true); setError("");
    try {
      await clinicApi.appointments.create({
        patientPhone: phone.trim(),
        patientName: patientName.trim() || undefined,
        doctorId,
        roomId,
        date,
        time,
        paymentType,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания записи");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520,
        boxShadow: "0 20px 60px rgba(15,23,42,0.18)", maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Записать пациента</h2>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748b", display: "flex" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Phone search */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
            Телефон пациента *
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPatient(null); setPatientNotFound(false); }}
              placeholder="+998901234567"
              onKeyDown={(e) => e.key === "Enter" && searchPatient()}
            />
            <button
              onClick={searchPatient}
              disabled={searchingPatient}
              style={{
                padding: "10px 14px", borderRadius: 10, background: "#f0fdfa",
                border: "1.5px solid #ccfbf1", cursor: "pointer", color: "#0d9488",
                display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                opacity: searchingPatient ? 0.6 : 1,
              }}
            >
              <Search size={14} /> {searchingPatient ? "..." : "Найти"}
            </button>
          </div>

          {/* Patient found */}
          {patient && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 10,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <User size={16} color="#16a34a" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0 }}>{patient.name ?? "Без имени"}</p>
                <p style={{ fontSize: 11, color: "#4ade80", margin: 0 }}>{patient.appointments.length} визитов в истории</p>
              </div>
            </div>
          )}

          {/* Patient not found — allow manual name */}
          {patientNotFound && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                padding: "8px 14px", borderRadius: 10,
                background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 8,
              }}>
                <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>Пациент не найден. Введите имя вручную.</p>
              </div>
              <input
                style={inputStyle}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Имя пациента"
              />
            </div>
          )}
        </div>

        {/* Doctor */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Врач *</label>
          <select
            style={{ ...inputStyle, background: "#fff" }}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={loadingDoctors}
          >
            <option value="">{loadingDoctors ? "Загрузка..." : "Выберите врача"}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Room (based on doctor's schedule) */}
        {doctorId && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Кабинет *
            </label>
            {loadingRooms ? (
              <div style={{ ...inputStyle, color: "#94a3b8", display: "flex", alignItems: "center" }}>
                Загрузка расписания...
              </div>
            ) : roomSlots.length === 0 ? (
              <div style={{
                ...inputStyle, background: "#fffbeb", border: "1.5px solid #fde68a",
                color: "#92400e", fontSize: 13, display: "flex", alignItems: "center",
              }}>
                Врач не работает в выбранный день
              </div>
            ) : (
              <select
                style={{ ...inputStyle, background: "#fff" }}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">Выберите кабинет</option>
                {roomSlots.map((s) => (
                  <option key={`${s.roomId}-${s.startTime}`} value={s.roomId}>
                    {s.roomName}{s.floor != null ? ` (${s.floor} этаж)` : ""} · {s.startTime}–{s.endTime}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Date & Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Дата *</label>
            <input
              type="date"
              style={inputStyle}
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Время *</label>
            <input
              type="time"
              style={inputStyle}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>Тип оплаты *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PAYMENT_OPTIONS.map(({ value, label }) => {
              const active = paymentType === value;
              return (
                <button
                  key={value}
                  onClick={() => setPaymentType(value)}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
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

        {error && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>{error}</p>}

        {/* Submit */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1, background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
              border: "none", borderRadius: 10, padding: "12px 0",
              fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Создание записи..." : "Записать"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: "#f1f5f9", border: "none", borderRadius: 10,
              padding: "12px 0", fontSize: 14, cursor: "pointer", color: "#64748b", fontWeight: 600,
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
