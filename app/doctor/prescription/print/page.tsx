"use client";

import { useEffect, useState } from "react";

interface PrescriptionItem {
  drug: string;
  dose: string;
  frequency: string;
  days: string;
}

interface PrescriptionData {
  drugs: PrescriptionItem[];
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorSpec: string;
  date: string;
}

export default function PrescriptionPrintPage() {
  const [data, setData] = useState<PrescriptionData | null>(null);
  const [error, setError] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("print_prescription");
    if (!raw) {
      setError("Нет данных для печати");
      setReady(true);
      return;
    }
    try {
      const parsed: PrescriptionData = JSON.parse(raw);
      setData(parsed);
      setReady(true);
      // Auto-trigger print after short delay so layout paints first
      const t = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(t);
    } catch {
      setError("Ошибка чтения данных рецепта");
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div style={{ fontFamily: "serif", padding: 40, color: "#334155", textAlign: "center" }}>
        Подготовка рецепта...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        fontFamily: "serif", padding: 60, textAlign: "center", color: "#ef4444",
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{error || "Нет данных для печати"}</p>
        <p style={{ fontSize: 14, color: "#94a3b8" }}>
          Закройте это окно и попробуйте снова с экрана консультации.
        </p>
        <button
          className="no-print"
          onClick={() => window.close()}
          style={{
            marginTop: 24, padding: "10px 24px", borderRadius: 8,
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            fontSize: 14, cursor: "pointer", color: "#64748b",
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 20mm 18mm 20mm 18mm;
          }
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }

        @media screen {
          body { background: #f1f5f9; }
          .page-shell {
            max-width: 720px;
            margin: 40px auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            padding: 48px 52px;
          }
        }
      `}</style>

      <div className="page-shell" style={{ fontFamily: "'Times New Roman', Times, serif", color: "#111", lineHeight: 1.6 }}>

        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: "2.5px solid #0d9488", paddingBottom: 16, marginBottom: 24,
        }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, color: "#0d9488", fontFamily: "sans-serif" }}>
              HamshiraGo
            </p>
            <p style={{ fontSize: 11, color: "#64748b", fontFamily: "sans-serif", marginTop: 2 }}>
              Онлайн медицинская платформа — hamshirago.uz
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 13, color: "#334155", fontFamily: "sans-serif" }}>
              <strong>Рецепт врача</strong>
            </p>
            <p style={{ fontSize: 12, color: "#64748b", fontFamily: "sans-serif", marginTop: 2 }}>
              {data.date}
            </p>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "sans-serif" }}>
              Врач
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{data.doctorName}</p>
            {data.doctorSpec && (
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{data.doctorSpec}</p>
            )}
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "sans-serif" }}>
              Пациент
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{data.patientName}</p>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{data.patientPhone}</p>
          </div>
        </div>

        {/* Heading */}
        <div style={{
          background: "#f0fdfa", border: "1px solid #99f6e4",
          borderRadius: 6, padding: "10px 16px", marginBottom: 20,
        }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: "#0f766e", textTransform: "uppercase",
            letterSpacing: 1.5, fontFamily: "sans-serif",
          }}>
            Назначения
          </p>
        </div>

        {/* Drug list */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #e2e8f0" }}>
              {["#", "Препарат", "Доза", "Кратность приёма", "Длительность"].map((h) => (
                <th key={h} style={{
                  padding: "8px 10px", textAlign: "left",
                  fontSize: 11, fontWeight: 700, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 0.8,
                  fontFamily: "sans-serif",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.drugs.map((item, idx) => (
              <tr key={idx} style={{
                borderBottom: "1px solid #f1f5f9",
                background: idx % 2 === 0 ? "#fff" : "#fafafa",
              }}>
                <td style={{ padding: "10px 10px", fontSize: 13, color: "#94a3b8", width: 30 }}>{idx + 1}.</td>
                <td style={{ padding: "10px 10px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{item.drug}</td>
                <td style={{ padding: "10px 10px", fontSize: 14, color: "#334155" }}>{item.dose || "—"}</td>
                <td style={{ padding: "10px 10px", fontSize: 14, color: "#334155" }}>{item.frequency || "—"}</td>
                <td style={{ padding: "10px 10px", fontSize: 14, color: "#334155" }}>
                  {item.days ? `${item.days} дн.` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature block */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 48 }}>
          <div style={{ textAlign: "center", minWidth: 220 }}>
            <div style={{
              borderBottom: "1.5px solid #334155",
              marginBottom: 6,
              height: 40,
            }} />
            <p style={{ fontSize: 12, color: "#64748b", fontFamily: "sans-serif" }}>
              Подпись врача / {data.doctorName}
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div style={{
          borderTop: "1px solid #e2e8f0", paddingTop: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ fontSize: 11, color: "#94a3b8", fontFamily: "sans-serif" }}>
            Сформировано через платформу HamshiraGo. Действительно при наличии подписи врача.
          </p>
          <p style={{ fontSize: 11, color: "#94a3b8", fontFamily: "sans-serif" }}>
            {data.date}
          </p>
        </div>

        {/* Screen-only action buttons */}
        <div className="no-print" style={{
          display: "flex", gap: 12, justifyContent: "center",
          marginTop: 32, paddingTop: 24, borderTop: "1px solid #e2e8f0",
        }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "11px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700,
              background: "#0d9488", color: "#fff", border: "none", cursor: "pointer",
              fontFamily: "sans-serif",
            }}
          >
            Печать / Сохранить PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              padding: "11px 28px", borderRadius: 8, fontSize: 14,
              background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
              cursor: "pointer", fontFamily: "sans-serif",
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
