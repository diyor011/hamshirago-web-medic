"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi, DoctorSlot } from "@/lib/api";
import { Calendar, Plus, Trash2, Clock, CheckCircle } from "lucide-react";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getDays(around: Date, count = 14): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(around);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_NAMES = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export default function DoctorSchedulePage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(today));
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [interval, setInterval] = useState("30");

  const days = getDays(today, 14);

  const loadSlots = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await doctorApi.slots.get(date);
      setSlots(res);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadSlots(selectedDate); }, [selectedDate, loadSlots]);

  async function handleCreate() {
    if (!startTime || !endTime) return;
    setCreating(true);
    try {
      await doctorApi.slots.create({
        date: selectedDate,
        startTime,
        endTime,
        intervalMinutes: parseInt(interval, 10) || 30,
      });
      await loadSlots(selectedDate);
      setShowCreate(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка создания слотов");
    }
    setCreating(false);
  }

  async function handleDelete(slotId: string) {
    setDeletingId(slotId);
    try {
      await doctorApi.slots.delete(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
    setDeletingId(null);
  }

  const freeSlots = slots.filter((s) => !s.isBooked);
  const bookedSlots = slots.filter((s) => s.isBooked);

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #0d9488, #0f766e)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Расписание</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {slots.length} слотов · {bookedSlots.length} занято
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            background: "linear-gradient(135deg, #0d9488, #0f766e)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 18px", cursor: "pointer", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Plus size={16} />
          Создать слоты
        </button>
      </div>

      {/* Date picker strip */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto",
        paddingBottom: 8, marginBottom: 20,
        scrollbarWidth: "none",
      }}>
        {days.map((d) => {
          const ds = toDateStr(d);
          const isSelected = ds === selectedDate;
          const isToday = ds === toDateStr(today);
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              style={{
                flexShrink: 0, display: "flex", flexDirection: "column",
                alignItems: "center", padding: "10px 14px", borderRadius: 12,
                cursor: "pointer", transition: "all 0.15s", minWidth: 60,
                background: isSelected ? "#0d9488" : isToday ? "#f0fdfa" : "#fff",
                color: isSelected ? "#fff" : isToday ? "#0d9488" : "#475569",
                boxShadow: isSelected ? "0 4px 12px rgba(13,148,136,0.25)" : "0 1px 3px rgba(0,0,0,0.06)",
                border: isSelected ? "none" : `1px solid ${isToday ? "#ccfbf1" : "#e2e8f0"}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, opacity: isSelected ? 0.85 : 1 }}>
                {DAY_NAMES[d.getDay()]}
              </span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{d.getDate()}</span>
              <span style={{ fontSize: 10, opacity: isSelected ? 0.75 : 0.6 }}>
                {MONTH_NAMES[d.getMonth()]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
          padding: 20, marginBottom: 20,
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
            Создать слоты на {new Date(selectedDate + "T00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                НАЧАЛО
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: "100%", height: 40, borderRadius: 8, border: "1.5px solid #e2e8f0",
                  padding: "0 10px", fontSize: 14, boxSizing: "border-box", outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                КОНЕЦ
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: "100%", height: 40, borderRadius: 8, border: "1.5px solid #e2e8f0",
                  padding: "0 10px", fontSize: 14, boxSizing: "border-box", outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                ИНТЕРВАЛ (МИН)
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                style={{
                  width: "100%", height: 40, borderRadius: 8, border: "1.5px solid #e2e8f0",
                  padding: "0 10px", fontSize: 14, boxSizing: "border-box", outline: "none",
                  background: "#fff",
                }}
              >
                {[15, 20, 30, 45, 60].map((v) => (
                  <option key={v} value={v}>{v} мин</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                background: "linear-gradient(135deg, #0d9488, #0f766e)",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, fontWeight: 700,
                cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Создание..." : "Создать"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
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

      {/* Slots grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Загрузка...</div>
      ) : slots.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "#fff",
          borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          <Clock size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", margin: 0, marginBottom: 12 }}>Нет слотов на этот день</p>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: "#f0fdfa", color: "#0d9488", border: "1px solid #ccfbf1",
              borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600,
            }}
          >
            Создать слоты
          </button>
        </div>
      ) : (
        <>
          {freeSlots.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Свободные слоты ({freeSlots.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                {freeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                      padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        {slot.startTime}
                      </p>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>до {slot.endTime}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={deletingId === slot.id}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#ef4444", opacity: deletingId === slot.id ? 0.4 : 0.6, padding: 4,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookedSlots.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Занятые слоты ({bookedSlots.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                {bookedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      background: "#f0fdfa", borderRadius: 10, border: "1px solid #ccfbf1",
                      padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#0d9488", margin: 0 }}>
                        {slot.startTime}
                      </p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>до {slot.endTime}</p>
                    </div>
                    <CheckCircle size={16} color="#0d9488" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
