"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { doctorApi, Consultation, ConsultationStatus } from "@/lib/api";
import { ClipboardList, Clock, CheckCircle, XCircle, ChevronRight, RefreshCw, Search, X, Wifi, WifiOff } from "lucide-react";
import { useDoctor } from "@/context/DoctorContext";

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
type StatusFilter = "all" | "active" | "completed" | "canceled";

export default function DoctorConsultationsPage() {
  const router = useRouter();
  const { doctor, setDoctor } = useDoctor();
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<Consultation[]>([]);
  const [all, setAll] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const first = await doctorApi.consultations.my(1, 100);
      let collected: Consultation[] = first.data;
      const totalPages = first.totalPages ?? 1;
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            doctorApi.consultations.my(i + 2, 100).then((r) => r.data).catch(() => [] as Consultation[])
          )
        );
        rest.forEach((r) => { collected = collected.concat(r); });
      }
      const pendingRes = await doctorApi.consultations.pending().catch(() => [] as Consultation[]);
      setPending(pendingRes);
      setAll(collected);
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

  const sourceList = tab === "pending" ? pending : all;
  const isAllTab = tab === "all";

  const filtersActive = isAllTab && (
    query.trim() !== "" || statusFilter !== "all" || dateFrom !== "" || dateTo !== ""
  );

  const filtered = useMemo(() => {
    if (!isAllTab) return sourceList;
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return sourceList.filter((c) => {
      if (statusFilter === "active" && !(c.status === "ACTIVE" || c.status === "PENDING")) return false;
      if (statusFilter === "completed" && c.status !== "COMPLETED") return false;
      if (statusFilter === "canceled" && c.status !== "CANCELED") return false;

      if (fromTs !== null || toTs !== null) {
        const t = new Date(c.createdAt).getTime();
        if (fromTs !== null && t < fromTs) return false;
        if (toTs !== null && t > toTs) return false;
      }

      if (q) {
        const hay = [
          c.client?.name ?? "",
          c.client?.phone ?? "",
          c.symptoms ?? "",
          c.doctorNotes ?? "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [sourceList, isAllTab, query, statusFilter, dateFrom, dateTo]);

  const displayed = filtered;

  async function toggleOnline() {
    if (!doctor) return;
    setTogglingOnline(true);
    try {
      const updated = await doctorApi.auth.setOnline(!doctor.isOnline);
      setDoctor(updated);
    } catch { /* ignore */ }
    setTogglingOnline(false);
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const STATUS_TABS: [StatusFilter, string][] = [
    ["all", "Все"],
    ["active", "Активные"],
    ["completed", "Завершённые"],
    ["canceled", "Отменённые"],
  ];

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={toggleOnline}
            disabled={togglingOnline}
            style={{
              background: doctor?.isOnline ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#fff",
              border: doctor?.isOnline ? "none" : "1.5px solid #e2e8f0",
              borderRadius: 20, padding: "7px 14px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600,
              color: doctor?.isOnline ? "#fff" : "#64748b",
              opacity: togglingOnline ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {doctor?.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {doctor?.isOnline ? "Онлайн" : "Офлайн"}
          </button>
          <button onClick={load} style={{
            background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b",
          }}>
            <RefreshCw size={14} />
            Обновить
          </button>
        </div>
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

      {/* Filters — only on "all" tab */}
      {isAllTab && (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
          padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Row 1: search + reset */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: имя, телефон, симптомы, заметки…"
                style={{
                  width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10,
                  border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
                  background: "#f8fafc", color: "#0f172a",
                }}
              />
            </div>
            <div style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
              Показано <b style={{ color: "#0f172a" }}>{displayed.length}</b> из <b style={{ color: "#0f172a" }}>{sourceList.length}</b>
            </div>
            {filtersActive && (
              <button onClick={resetFilters} style={{
                background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444",
                borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              }}>
                <X size={14} /> Сбросить
              </button>
            )}
          </div>

          {/* Row 2: status segmented + dates */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
              {STATUS_TABS.map(([key, label]) => (
                <button key={key} onClick={() => setStatusFilter(key)} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  background: statusFilter === key ? "#fff" : "transparent",
                  color: statusFilter === key ? "#0d9488" : "#94a3b8",
                  boxShadow: statusFilter === key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s",
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>с</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a",
                }}
              />
              <span style={{ fontSize: 13, color: "#64748b" }}>по</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
              padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 80, height: 22, borderRadius: 99, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                    <div style={{ width: 120, height: 22, borderRadius: 6, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                  </div>
                  <div style={{ height: 16, width: "60%", borderRadius: 6, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                  <div style={{ height: 14, width: "80%", borderRadius: 6, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                </div>
                <div style={{ width: 70, height: 36, borderRadius: 8, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "#fff",
          borderRadius: 16, border: "1px solid #e2e8f0",
        }}>
          <Clock size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", margin: 0 }}>
            {tab === "pending"
              ? "Нет ожидающих консультаций"
              : filtersActive
                ? "Ничего не найдено — попробуйте изменить фильтры"
                : "Консультаций пока нет"}
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
                padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                borderLeft: `4px solid ${sc.text}`,
              }}>
                {/* Client avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: sc.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 800, color: sc.text,
                }}>
                  {(c.client?.name ?? "К").charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      color: sc.text, background: sc.bg,
                    }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {new Date(c.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {c.suggestedSpecialization && (
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: "#f0fdfa", color: "#0d9488", fontWeight: 600 }}>
                        {c.suggestedSpecialization}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, margin: "0 0 3px" }}>
                    {c.client?.name ?? "Клиент"}
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>
                    {c.client?.phone ?? ""}
                  </p>

                  <p style={{
                    fontSize: 13, color: "#475569", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 460,
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
                          padding: "8px 18px", fontSize: 13, fontWeight: 700,
                          cursor: isActing ? "not-allowed" : "pointer",
                          opacity: isActing ? 0.7 : 1,
                          display: "flex", alignItems: "center", gap: 6, minHeight: 44,
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
                          display: "flex", alignItems: "center", gap: 6, minHeight: 44,
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
                    flexShrink: 0, minHeight: 44,
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
