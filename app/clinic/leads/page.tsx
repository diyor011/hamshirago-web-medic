"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, MessageSquare, Phone, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { clinicApi, Lead, LeadStatus, LeadStats } from "@/lib/clinicApi";

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  DONE: "Завершён",
  CANCELED: "Отменён",
};

const STATUS_STYLES: Record<LeadStatus, React.CSSProperties> = {
  NEW:         { background: "#eff6ff", color: "#2563eb" },
  IN_PROGRESS: { background: "#fefce8", color: "#ca8a04" },
  DONE:        { background: "#f0fdf4", color: "#16a34a" },
  CANCELED:    { background: "#fef2f2", color: "#ef4444" },
};

const STATUS_NEXT: Record<LeadStatus, LeadStatus | null> = {
  NEW: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null,
  CANCELED: null,
};

const STATUS_NEXT_LABELS: Record<LeadStatus, string> = {
  NEW: "Взять в работу",
  IN_PROGRESS: "Завершить",
  DONE: "",
  CANCELED: "",
};

function Skeleton({ height = 80, radius = 12 }: { height?: number; radius?: number }) {
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

const ALL_STATUSES: Array<LeadStatus | "ALL"> = ["ALL", "NEW", "IN_PROGRESS", "DONE", "CANCELED"];
const FILTER_LABELS: Record<LeadStatus | "ALL", string> = {
  ALL: "Все", ...STATUS_LABELS,
};

export default function LeadsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<LeadStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errStats, setErrStats] = useState<string | null>(null);
  const [errLeads, setErrLeads] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true); setErrStats(null);
    try { setStats(await clinicApi.leads.stats()); }
    catch (e) { setErrStats(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingStats(false); }
  }, []);

  const loadLeads = useCallback(async (f: LeadStatus | "ALL", p: number) => {
    setLoadingLeads(true); setErrLeads(null);
    try {
      const res = await clinicApi.leads.list({
        ...(f !== "ALL" ? { status: f } : {}),
        page: p,
        limit: LIMIT,
      });
      setLeads(res.data);
      setTotal(res.total);
    } catch (e) {
      setErrLeads(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLeads(filter, page); }, [filter, page, loadLeads]);

  function changeFilter(f: LeadStatus | "ALL") {
    setFilter(f);
    setPage(1);
  }

  async function handleUpdateStatus(lead: Lead, newStatus: LeadStatus) {
    setUpdating(lead.id);
    try {
      await clinicApi.leads.updateStatus(lead.id, newStatus);
      await Promise.all([loadStats(), loadLeads(filter, page)]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setUpdating(null);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Лиды — Salomat AI</h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>Пациенты, обратившиеся через голосового ассистента</p>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {loadingStats ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...card, padding: 16 }}>
              <Skeleton height={50} />
            </div>
          ))
        ) : errStats ? (
          <div style={{ gridColumn: "1/-1" }}><ErrorBanner message={errStats} onRetry={loadStats} /></div>
        ) : stats ? (
          [
            { label: "Всего", value: stats.total, bg: "#f8fafc", color: "#475569" },
            { label: "Новых", value: stats.new, bg: "#eff6ff", color: "#2563eb" },
            { label: "В работе", value: stats.inProgress, bg: "#fefce8", color: "#ca8a04" },
            { label: "Завершено", value: stats.done, bg: "#f0fdf4", color: "#16a34a" },
            { label: "Отменено", value: stats.canceled, bg: "#fef2f2", color: "#ef4444" },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ ...card, padding: "16px 20px", background: bg }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color, opacity: 0.75, marginTop: 4, fontWeight: 600 }}>{label}</div>
            </div>
          ))
        ) : null}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => changeFilter(s)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${filter === s ? "#0d9488" : "#e2e8f0"}`,
              background: filter === s ? "#f0fdfa" : "#fff",
              color: filter === s ? "#0d9488" : "#475569",
              cursor: "pointer",
            }}
          >
            {FILTER_LABELS[s]}
          </button>
        ))}
      </div>

      {errLeads && <div style={{ marginBottom: 16 }}><ErrorBanner message={errLeads} onRetry={() => loadLeads(filter, page)} /></div>}

      {/* Leads list */}
      {loadingLeads ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)}
        </div>
      ) : leads.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <MessageSquare size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Нет лидов</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead) => {
            const st = lead.status as LeadStatus;
            const next = STATUS_NEXT[st];
            return (
              <div key={lead.id} style={{ ...card, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{lead.name ?? "Без имени"}</span>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{lead.phone}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, ...STATUS_STYLES[st] }}>
                        {STATUS_LABELS[st]}
                      </span>
                    </div>
                    {lead.notes && (
                      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px", lineHeight: 1.5 }}>{lead.notes}</p>
                    )}
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                      {new Date(lead.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {/* Call button */}
                    <a
                      href={`tel:${lead.phone}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                        textDecoration: "none", whiteSpace: "nowrap",
                      }}
                    >
                      <Phone size={12} /> Позвонить
                    </a>

                    {/* Record appointment */}
                    {st === "NEW" || st === "IN_PROGRESS" ? (
                      <button
                        onClick={() => router.push("/clinic/reception")}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        <CalendarPlus size={12} /> Записать
                      </button>
                    ) : null}

                    {next && (
                      <button
                        onClick={() => handleUpdateStatus(lead, next)}
                        disabled={updating === lead.id}
                        style={{
                          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
                          border: "none", cursor: updating === lead.id ? "not-allowed" : "pointer",
                          opacity: updating === lead.id ? 0.6 : 1, whiteSpace: "nowrap",
                        }}
                      >
                        {updating === lead.id ? "..." : STATUS_NEXT_LABELS[st]}
                      </button>
                    )}
                    {st !== "CANCELED" && st !== "DONE" && (
                      <button
                        onClick={() => handleUpdateStatus(lead, "CANCELED")}
                        disabled={updating === lead.id}
                        style={{
                          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                          cursor: updating === lead.id ? "not-allowed" : "pointer",
                        }}
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "#fff", border: "1px solid #e2e8f0", cursor: page === 1 ? "not-allowed" : "pointer",
              color: page === 1 ? "#cbd5e1" : "#475569",
            }}
          >
            Назад
          </button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "#64748b", fontWeight: 600 }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "#fff", border: "1px solid #e2e8f0", cursor: page === totalPages ? "not-allowed" : "pointer",
              color: page === totalPages ? "#cbd5e1" : "#475569",
            }}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
