"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckSquare, CalendarPlus, MessageSquare } from "lucide-react";
import { clinicApi, Appointment, AppointmentStatus, Lead } from "@/lib/clinicApi";
import BookingModal from "@/components/clinic/BookingModal";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED:  "Запись",
  CHECKED_IN: "Прибыл",
  IN_PROGRESS:"На приёме",
  DONE:       "Готово",
  CANCELED:   "Отменён",
  NO_SHOW:    "Не явился",
};

const STATUS_STYLES: Record<AppointmentStatus, React.CSSProperties> = {
  SCHEDULED:   { background: "#eff6ff", color: "#2563eb" },
  CHECKED_IN:  { background: "#fefce8", color: "#ca8a04" },
  IN_PROGRESS: { background: "#fff7ed", color: "#ea580c" },
  DONE:        { background: "#f0fdf4", color: "#16a34a" },
  CANCELED:    { background: "#fef2f2", color: "#ef4444" },
  NO_SHOW:     { background: "#f1f5f9", color: "#94a3b8" },
};

function Skeleton({ height = 70, radius = 12 }: { height?: number; radius?: number }) {
  return (
    <div style={{ height, borderRadius: radius, background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
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
        <RefreshCw size={13} /> Повторить
      </button>
    </div>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Наличные", TERMINAL: "Терминал", ONLINE: "Online",
};

export default function ReceptionPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errApps, setErrApps] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  const loadApps = useCallback(async () => {
    setLoadingApps(true); setErrApps(null);
    try { setAppointments(await clinicApi.appointments.today()); }
    catch (e) { setErrApps(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingApps(false); }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({ status: "NEW", limit: 5 });
      setLeads(res.data);
    } catch (e) {
      setErrLeads(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => { loadApps(); loadLeads(); }, [loadApps, loadLeads]);
  useEffect(() => {
    const id = setInterval(loadApps, 30000);
    return () => clearInterval(id);
  }, [loadApps]);

  async function handleCheckin(id: string) {
    setCheckingIn(id);
    try {
      await clinicApi.appointments.checkin(id);
      await loadApps();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCheckingIn(null);
    }
  }

  const waiting = appointments.filter((a) => ["SCHEDULED", "CHECKED_IN"].includes(a.status)).length;
  const inProgress = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const done = appointments.filter((a) => a.status === "DONE").length;

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  };

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Регистратура</h1>
          <p style={{ fontSize: 13, color: "#64748b", textTransform: "capitalize" }}>{today}</p>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "10px 20px",
            border: "none", cursor: "pointer",
          }}
        >
          <CalendarPlus size={16} /> Записать пациента
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Ожидают", value: waiting, bg: "#eff6ff", color: "#2563eb" },
          { label: "На приёме", value: inProgress, bg: "#fff7ed", color: "#ea580c" },
          { label: "Завершено", value: done, bg: "#f0fdf4", color: "#16a34a" },
        ].map(({ label, value, bg, color }) => (
          <div key={label} style={{ ...card, padding: "16px 20px", background: bg }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color, opacity: 0.75, marginTop: 4, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }} className="reception-grid">

        {/* Appointments list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Записи на сегодня</h2>
            <button
              onClick={loadApps}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
            >
              <RefreshCw size={13} /> Обновить
            </button>
          </div>

          {errApps && <div style={{ marginBottom: 14 }}><ErrorBanner message={errApps} onRetry={loadApps} /></div>}

          {loadingApps ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} />)}
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ ...card, padding: 50, textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Записей нет</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {appointments
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((app) => {
                  const st = app.status as AppointmentStatus;
                  const canCheckin = st === "SCHEDULED";
                  return (
                    <div key={app.id} style={{ ...card, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Time */}
                          <div style={{
                            minWidth: 56, textAlign: "center", padding: "8px 10px", borderRadius: 10,
                            background: "#f8fafc", border: "1px solid #e2e8f0",
                          }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{app.time}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                              {app.patientName ?? app.patientPhone}
                            </div>
                            {app.patientName && (
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>{app.patientPhone}</div>
                            )}
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {PAYMENT_LABELS[app.paymentType] ?? app.paymentType}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, ...STATUS_STYLES[st] }}>
                            {STATUS_LABELS[st]}
                          </span>
                          {canCheckin && (
                            <button
                              onClick={() => handleCheckin(app.id)}
                              disabled={checkingIn === app.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
                                border: "none", cursor: checkingIn === app.id ? "not-allowed" : "pointer",
                                opacity: checkingIn === app.id ? 0.6 : 1,
                              }}
                            >
                              <CheckSquare size={13} />
                              {checkingIn === app.id ? "..." : "Check In"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Leads sidebar */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Новые лиды AI</h2>

          {errLeads && <div style={{ marginBottom: 14 }}><ErrorBanner message={errLeads} onRetry={loadLeads} /></div>}

          {loadingLeads ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={60} />)}
            </div>
          ) : leads.length === 0 ? (
            <div style={{ ...card, padding: 32, textAlign: "center" }}>
              <MessageSquare size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <p style={{ color: "#94a3b8", fontSize: 13 }}>Нет новых лидов</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leads.map((lead) => (
                <div key={lead.id} style={{ ...card, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{lead.name ?? "Без имени"}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 5, background: "#eff6ff", color: "#2563eb" }}>NEW</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 4px" }}>{lead.phone}</p>
                  {lead.notes && <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.notes}</p>}
                  <p style={{ fontSize: 10, color: "#cbd5e1", margin: "4px 0 0" }}>
                    {new Date(lead.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showBooking && (
        <BookingModal
          open={showBooking}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); loadApps(); }}
        />
      )}

      <style>{`
        @media (max-width: 900px) { .reception-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
