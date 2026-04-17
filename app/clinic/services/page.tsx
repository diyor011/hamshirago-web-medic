"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Check, X, Trash2, RefreshCw, Stethoscope } from "lucide-react";
import { clinicApi, ClinicService } from "@/lib/clinicApi";
import { useTranslation } from "react-i18next";
import "@/i18n";

type ServiceCategory = "ALL" | "CONSULTATION" | "LAB" | "DIAGNOSTIC" | "PROCEDURE";

interface ServiceForm {
  name: string;
  price: string;
  durationMinutes: string;
  category: Exclude<ServiceCategory, "ALL">;
}

const EMPTY_FORM: ServiceForm = { name: "", price: "", durationMinutes: "", category: "CONSULTATION" };

function Skeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 12, padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ height: 16, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "#ef4444" }}>{message}</span>
      <button onClick={onRetry} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
        <RefreshCw size={13} /> {t("clinic.common.retry")}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 36, borderRadius: 8, border: "1.5px solid #e2e8f0",
  padding: "0 10px", fontSize: 13, color: "#0f172a", outline: "none",
  background: "#fff", boxSizing: "border-box",
};

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
  boxShadow: "0 1px 4px rgba(15,23,42,0.04)", padding: "24px",
};

export default function ServicesPage() {
  const { t } = useTranslation();

  const CATEGORIES: { value: ServiceCategory; label: string; color: string; bg: string }[] = [
    { value: "ALL",          label: t("clinic.services.categories.all"),          color: "#475569", bg: "#f1f5f9" },
    { value: "CONSULTATION", label: t("clinic.services.categories.consultation"),  color: "#0d9488", bg: "#f0fdfa" },
    { value: "LAB",          label: t("clinic.services.categories.lab"),           color: "#2563eb", bg: "#eff6ff" },
    { value: "DIAGNOSTIC",   label: t("clinic.services.categories.diagnostic"),    color: "#9333ea", bg: "#faf5ff" },
    { value: "PROCEDURE",    label: t("clinic.services.categories.procedure"),     color: "#ea580c", bg: "#fff7ed" },
  ];

  const [services, setServices]       = useState<ClinicService[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [filter, setFilter]           = useState<ServiceCategory>("ALL");

  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState<ServiceForm>(EMPTY_FORM);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm, setEditForm]       = useState<ServiceForm>(EMPTY_FORM);
  const [updating, setUpdating]       = useState(false);

  const [deactivating, setDeactivating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setServices(await clinicApi.services.list()); }
    catch (e) { setError(e instanceof Error ? e.message : t("clinic.services.errorLoad")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ALL" ? services : services.filter((s) => s.category === filter);

  const stats = {
    total:    services.filter((s) => s.isActive).length,
    inactive: services.filter((s) => !s.isActive).length,
  };

  async function handleCreate() {
    if (!form.name.trim() || !form.price || !form.durationMinutes) {
      setCreateError(t("clinic.services.errorFillAll")); return;
    }
    setCreating(true); setCreateError("");
    try {
      await clinicApi.services.create({
        name: form.name.trim(),
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        category: form.category,
      });
      setShowCreate(false); setForm(EMPTY_FORM);
      await load();
    } catch (e) { setCreateError(e instanceof Error ? e.message : t("clinic.services.errorCreate")); }
    finally { setCreating(false); }
  }

  async function handleUpdate(id: string) {
    if (!editForm.name.trim()) return;
    setUpdating(true);
    try {
      await clinicApi.services.update(id, {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        durationMinutes: Number(editForm.durationMinutes),
      });
      setEditingId(null); await load();
    } catch { /* ignore */ }
    finally { setUpdating(false); }
  }

  async function handleDeactivate(id: string) {
    setDeactivating(id);
    try { await clinicApi.services.deactivate(id); await load(); }
    catch { /* ignore */ }
    finally { setDeactivating(null); }
  }

  function startEdit(svc: ClinicService) {
    setEditingId(svc.id);
    setEditForm({
      name: svc.name,
      price: String(svc.price),
      durationMinutes: String(svc.durationMinutes),
      category: (svc.category as Exclude<ServiceCategory, "ALL">) ?? "CONSULTATION",
    });
  }

  const catMeta = (cat: string) => CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[1];

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{t("clinic.services.title")}</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("clinic.services.subtitle")}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setCreateError(""); }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            border: "none", cursor: "pointer",
          }}
        >
          <Plus size={15} /> {t("clinic.services.addService")}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: t("clinic.services.activeCount"), value: stats.total,    color: "#0d9488", bg: "#f0fdfa" },
          { label: t("clinic.services.inactiveCount"), value: stats.inactive, color: "#94a3b8", bg: "#f1f5f9" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ ...card, padding: "16px 20px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>{t("clinic.services.newService")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{t("clinic.services.name")}</label>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("clinic.services.namePlaceholder")} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{t("clinic.services.category")}</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Exclude<ServiceCategory, "ALL"> }))}>
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{t("clinic.services.price")}</label>
              <input type="number" min={0} style={inputStyle} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder={t("clinic.services.pricePlaceholder")} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{t("clinic.services.duration")}</label>
              <input type="number" min={1} style={inputStyle} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder={t("clinic.services.durationPlaceholder")} />
            </div>
          </div>
          {createError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>{createError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={creating} style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
              {creating ? t("clinic.common.creating") : t("clinic.common.create")}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateError(""); }} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", color: "#64748b" }}>
              {t("clinic.common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setFilter(c.value)} style={{
            padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: `1.5px solid ${filter === c.value ? c.color : "#e2e8f0"}`,
            background: filter === c.value ? c.bg : "#fff",
            color: filter === c.value ? c.color : "#475569",
          }}>
            {c.label}
            {c.value !== "ALL" && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700 }}>
                {services.filter((s) => s.category === c.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Stethoscope size={32} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "#94a3b8" }}>
              {filter === "ALL" ? t("clinic.services.noServices") : t("clinic.services.noServicesInCategory")}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ textAlign: "left",   padding: "0 0 12px",    color: "#64748b", fontWeight: 600 }}>{t("clinic.services.name")}</th>
                  <th style={{ textAlign: "left",   padding: "0 12px 12px", color: "#64748b", fontWeight: 600 }}>{t("clinic.services.category")}</th>
                  <th style={{ textAlign: "right",  padding: "0 12px 12px", color: "#64748b", fontWeight: 600 }}>{t("clinic.services.price")}</th>
                  <th style={{ textAlign: "right",  padding: "0 12px 12px", color: "#64748b", fontWeight: 600 }}>{t("clinic.services.duration")}</th>
                  <th style={{ textAlign: "center", padding: "0 12px 12px", color: "#64748b", fontWeight: 600 }}>{t("clinic.services.status")}</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc) => {
                  const isEditing = editingId === svc.id;
                  const cm = catMeta(svc.category ?? "CONSULTATION");
                  return (
                    <tr key={svc.id} style={{ borderBottom: "1px solid #f8fafc", opacity: svc.isActive ? 1 : 0.5 }}>
                      {/* Name */}
                      <td style={{ padding: "12px 0" }}>
                        {isEditing ? (
                          <input style={{ ...inputStyle, width: "90%" }} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                        ) : (
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{svc.name}</span>
                        )}
                      </td>
                      {/* Category */}
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: cm.bg, color: cm.color }}>
                          {cm.label}
                        </span>
                      </td>
                      {/* Price */}
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        {isEditing ? (
                          <input type="number" min={0} style={{ ...inputStyle, width: 110, textAlign: "right" }} value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                        ) : (
                          <span style={{ color: "#374151", fontWeight: 600 }}>{svc.price.toLocaleString("ru-RU")} {t("common.sum")}</span>
                        )}
                      </td>
                      {/* Duration */}
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        {isEditing ? (
                          <input type="number" min={1} style={{ ...inputStyle, width: 80, textAlign: "right" }} value={editForm.durationMinutes} onChange={(e) => setEditForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                        ) : (
                          <span style={{ color: "#374151" }}>{svc.durationMinutes} {t("clinic.services.durationMin")}</span>
                        )}
                      </td>
                      {/* Status */}
                      <td style={{ padding: "12px 12px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                          ...(svc.isActive
                            ? { background: "#f0fdf4", color: "#16a34a" }
                            : { background: "#f1f5f9", color: "#94a3b8" }),
                        }}>
                          {svc.isActive ? t("clinic.services.active") : t("clinic.services.inactive")}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "12px 0" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => handleUpdate(svc.id)} disabled={updating} style={{ padding: "5px 8px", borderRadius: 7, background: "#f0fdf4", border: "1px solid #bbf7d0", cursor: "pointer", color: "#16a34a" }}>
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditingId(null)} style={{ padding: "5px 8px", borderRadius: 7, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b" }}>
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(svc)} style={{ padding: "5px 8px", borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b" }}>
                                <Pencil size={13} />
                              </button>
                              {svc.isActive && (
                                <button
                                  onClick={() => handleDeactivate(svc.id)}
                                  disabled={deactivating === svc.id}
                                  style={{ padding: "5px 8px", borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer", color: "#ef4444", opacity: deactivating === svc.id ? 0.5 : 1 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
