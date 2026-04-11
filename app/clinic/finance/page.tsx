"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, DollarSign, Users, Download } from "lucide-react";
import { clinicApi, StatsOverview, MonthlyStats, DoctorStats } from "@/lib/clinicApi";

function Skeleton({ height = 56, radius = 12 }: { height?: number; radius?: number }) {
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

type Period = "today" | "week" | "month" | "year";
const PERIOD_LABELS: Record<Period, string> = { today: "Сегодня", week: "Неделя", month: "Месяц", year: "Год" };

const AVATAR_COLORS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf2f8", color: "#db2777" },
];

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats[]>([]);
  const [doctors, setDoctors] = useState<DoctorStats[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [errOverview, setErrOverview] = useState<string | null>(null);
  const [errMonthly, setErrMonthly] = useState<string | null>(null);
  const [errDoctors, setErrDoctors] = useState<string | null>(null);

  const fetchOverview = useCallback(async (p: Period) => {
    setLoadingOverview(true); setErrOverview(null);
    try { setOverview(await clinicApi.stats.overview(p)); }
    catch (e) { setErrOverview(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingOverview(false); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true); setErrMonthly(null);
    try { setMonthly(await clinicApi.stats.monthly()); }
    catch (e) { setErrMonthly(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingMonthly(false); }
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); setErrDoctors(null);
    try { setDoctors(await clinicApi.stats.doctors()); }
    catch (e) { setErrDoctors(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoadingDoctors(false); }
  }, []);

  useEffect(() => { fetchOverview(period); }, [period, fetchOverview]);
  useEffect(() => { fetchMonthly(); fetchDoctors(); }, [fetchMonthly, fetchDoctors]);

  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);
  const maxDocRevenue = Math.max(...doctors.map((d) => d.revenue), 1);

  function exportCSV() {
    if (monthly.length === 0) { alert("Нет данных для экспорта"); return; }
    const header = ["Месяц", "Приёмов", "Выручка (сум)"];
    const rows = monthly.map((r) => [r.month, r.appointments, r.revenue]);

    // Append doctor stats if available
    const doctorHeader = ["", "", ""];
    const doctorTitle  = ["Врач", "Приёмов", "Выручка (сум)"];
    const doctorRows   = doctors.slice(0, 5).map((d) => [d.doctorName, d.appointments, d.revenue]);

    const allRows = [
      header, ...rows,
      [""],
      doctorTitle, ...doctorRows,
    ];

    const csv = allRows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `hamshirago-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)", padding: "24px",
  };

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Финансы</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Доходы и статистика клиники</p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#0d9488"; (e.currentTarget as HTMLButtonElement).style.color = "#0d9488"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
        >
          <Download size={14} /> Экспорт CSV
        </button>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${period === p ? "#0d9488" : "#e2e8f0"}`,
            background: period === p ? "#f0fdfa" : "#fff",
            color: period === p ? "#0d9488" : "#475569",
            cursor: "pointer",
          }}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {errOverview && <div style={{ marginBottom: 20 }}><ErrorBanner message={errOverview} onRetry={() => fetchOverview(period)} /></div>}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {loadingOverview ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={card}>
              <Skeleton height={60} />
            </div>
          ))
        ) : overview ? (
          [
            {
              icon: <DollarSign size={22} color="#0d9488" />,
              iconBg: "#f0fdfa",
              value: `${overview.revenue.toLocaleString("ru-RU")} сум`,
              label: "Выручка",
            },
            {
              icon: <Users size={22} color="#2563eb" />,
              iconBg: "#eff6ff",
              value: overview.appointments,
              label: "Приёмов",
            },
            {
              icon: <TrendingUp size={22} color="#9333ea" />,
              iconBg: "#faf5ff",
              value: `${overview.cancelRate}%`,
              label: "Процент отмен",
            },
          ].map(({ icon, iconBg, value, label }) => (
            <div key={label} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{label}</div>
                </div>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* Monthly table */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Статистика по месяцам (12 мес.)</h2>

        {errMonthly && <ErrorBanner message={errMonthly} onRetry={fetchMonthly} />}
        {loadingMonthly ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={18} radius={6} />)}
          </div>
        ) : monthly.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>Нет данных</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "0 0 10px", color: "#64748b", fontWeight: 600 }}>Месяц</th>
                  <th style={{ textAlign: "right", padding: "0 12px 10px", color: "#64748b", fontWeight: 600 }}>Приёмов</th>
                  <th style={{ textAlign: "right", padding: "0 12px 10px", color: "#64748b", fontWeight: 600 }}>Выручка</th>
                  <th style={{ width: 160, padding: "0 0 10px" }} />
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 0", fontWeight: 600, color: "#374151" }}>{row.month}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{row.appointments}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>
                      {row.revenue.toLocaleString("ru-RU")} сум
                    </td>
                    <td style={{ padding: "10px 0 10px 16px" }}>
                      <div style={{ height: 8, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4,
                          background: "linear-gradient(90deg, #0d9488, #5eead4)",
                          width: `${(row.revenue / maxRevenue) * 100}%`,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top doctors */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Топ-5 врачей по доходу</h2>

        {errDoctors && <ErrorBanner message={errDoctors} onRetry={fetchDoctors} />}
        {loadingDoctors ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ flex: 1 }}><Skeleton height={14} radius={4} /></div>
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>Нет данных</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {doctors.slice(0, 5).map((doc, idx) => {
              const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const pct = Math.round((doc.revenue / maxDocRevenue) * 100);
              return (
                <div key={doc.doctorId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      background: c.bg, color: c.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800,
                    }}>
                      {doc.doctorName.charAt(0).toUpperCase()}
                    </div>
                    {idx < 3 && (
                      <span style={{
                        position: "absolute", top: -4, right: -4, width: 18, height: 18,
                        borderRadius: "50%", background: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : "#a16207",
                        color: "#fff", fontSize: 10, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.doctorName}
                      </span>
                      <span style={{ fontSize: 12, color: "#0d9488", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                        {doc.revenue.toLocaleString("ru-RU")} сум
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: "linear-gradient(90deg, #0d9488, #5eead4)",
                          width: `${pct}%`, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{doc.appointments} приёмов</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
