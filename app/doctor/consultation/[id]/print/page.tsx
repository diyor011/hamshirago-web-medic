"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doctorApi, Consultation } from "@/lib/api";

export default function ConsultationPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await doctorApi.consultations.get(id);
        if (!cancelled) setConsultation(c);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!loading && consultation && !error) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, consultation, error]);

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>Загрузка...</div>;
  }
  if (error || !consultation) {
    return <div style={{ padding: 40, fontFamily: "Arial, sans-serif", color: "#b91c1c" }}>
      {error || "Консультация не найдена"}
    </div>;
  }

  const c = consultation;
  const dateStr = new Date(c.createdAt).toLocaleString("ru-RU");
  const doctorName = c.doctor?.name ?? "—";
  const doctorSpec = c.doctor?.specialization ?? "";
  const clientName = c.client?.name ?? "—";
  const clientPhone = c.client?.phone ?? "—";
  const prescriptionTitle = c.prescription?.serviceTitle;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
        html, body { background: #fff; }
      `}</style>
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#000",
          background: "#fff",
          maxWidth: "210mm",
          margin: "0 auto",
          padding: "24mm 20mm",
          lineHeight: 1.5,
          fontSize: 13,
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>
            HamshiraGo — Медицинское заключение
          </h1>
          <p style={{ fontSize: 12, margin: "6px 0 0", color: "#333" }}>
            Дата: {dateStr}
          </p>
        </div>

        {/* Patient */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={sectionTitle}>Пациент</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={labelCell}>ФИО:</td>
                <td style={valueCell}>{clientName}</td>
              </tr>
              <tr>
                <td style={labelCell}>Телефон:</td>
                <td style={valueCell}>{clientPhone}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Symptoms */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={sectionTitle}>Симптомы и жалобы</h2>
          <p style={paragraph}>{c.symptoms || "—"}</p>
        </section>

        {/* Salomat AI summary */}
        {c.salomatSummary && (
          <section style={{ marginBottom: 18 }}>
            <h2 style={sectionTitle}>Предварительное резюме (AI)</h2>
            <p style={{ ...paragraph, whiteSpace: "pre-wrap" }}>{c.salomatSummary}</p>
          </section>
        )}

        {/* Doctor notes */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={sectionTitle}>Заключение врача</h2>
          <p style={{ ...paragraph, whiteSpace: "pre-wrap" }}>
            {c.doctorNotes || "—"}
          </p>
        </section>

        {/* Prescription */}
        {prescriptionTitle && (
          <section style={{ marginBottom: 18 }}>
            <h2 style={sectionTitle}>Назначение</h2>
            <p style={paragraph}>{prescriptionTitle}</p>
          </section>
        )}

        {/* Signature */}
        <div style={{ marginTop: 40, borderTop: "1px solid #000", paddingTop: 14 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Врач:</strong> {doctorName}
            {doctorSpec ? `, ${doctorSpec}` : ""}
          </p>
          <p style={{ margin: "20px 0 0", fontSize: 13 }}>
            Подпись: ______________________
          </p>
        </div>

        {/* Print button (hidden when printing) */}
        <div className="no-print" style={{ marginTop: 30, textAlign: "center" }}>
          <button
            onClick={() => window.print()}
            style={{
              background: "#000", color: "#fff", border: "none",
              padding: "10px 24px", fontSize: 14, cursor: "pointer", borderRadius: 4,
            }}
          >
            Печать / Сохранить PDF
          </button>
        </div>
      </div>
    </>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: "1px solid #000",
  paddingBottom: 4,
};

const paragraph: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#000",
  lineHeight: 1.55,
};

const labelCell: React.CSSProperties = {
  padding: "4px 8px 4px 0",
  fontWeight: 700,
  width: 110,
  verticalAlign: "top",
};

const valueCell: React.CSSProperties = {
  padding: "4px 0",
  verticalAlign: "top",
};
