"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, UserX, Users } from "lucide-react";
import { clinicApi, ClinicStaff, ClinicRole } from "@/lib/clinicApi";
import { useToast, ToastContainer, ConfirmDialog } from "@/components/clinic/Toast";

const ROLE_LABELS: Record<ClinicRole, string> = {
  CEO: "Директор",
  RECEPTION: "Регистратура",
  DOCTOR: "Врач",
};

const ROLE_STYLES: Record<ClinicRole, React.CSSProperties> = {
  CEO:       { background: "#faf5ff", color: "#9333ea" },
  RECEPTION: { background: "#eff6ff", color: "#2563eb" },
  DOCTOR:    { background: "#f0fdfa", color: "#0d9488" },
};

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

const AVATAR_COLORS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf2f8", color: "#db2777" },
];

interface CreateForm {
  name: string;
  phone: string;
  password: string;
  role: ClinicRole;
  specialization: string;
  photoUrl: string;
}

const EMPTY_FORM: CreateForm = {
  name: "", phone: "", password: "", role: "DOCTOR", specialization: "", photoUrl: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { toasts, toast, closeToast } = useToast();

  const loadStaff = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStaff(await clinicApi.staff.list()); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка загрузки"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError("Введите имя"); return; }
    if (!form.phone.trim()) { setCreateError("Введите телефон"); return; }
    if (!form.password.trim()) { setCreateError("Введите пароль"); return; }
    setCreating(true); setCreateError("");
    try {
      await clinicApi.staff.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        ...(form.photoUrl ? { photoUrl: form.photoUrl } : {}),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadStaff();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    setConfirmId(id);
  }

  async function doDeactivate(id: string) {
    setConfirmId(null);
    setDeactivating(id);
    try {
      await clinicApi.staff.deactivate(id);
      toast.success("Сотрудник деактивирован");
      await loadStaff();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDeactivating(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  };

  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {confirmId && (
        <ConfirmDialog
          message="Деактивировать сотрудника? Он потеряет доступ к порталу."
          confirmLabel="Деактивировать"
          onConfirm={() => doDeactivate(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Сотрудники</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Управление командой клиники</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
            fontSize: 14, fontWeight: 700, borderRadius: 10, padding: "10px 20px",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Plus size={16} /> Добавить сотрудника
        </button>
      </div>

      {error && <div style={{ marginBottom: 20 }}><ErrorBanner message={error} onRetry={loadStaff} /></div>}

      {/* Create form */}
      {showCreate && (
        <div style={{ ...card, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Новый сотрудник</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Имя *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Иванов Иван" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Телефон *</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+998901234567" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Пароль *</label>
              <input type="password" style={inputStyle} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Минимум 6 символов" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Роль *</label>
              <select style={{ ...inputStyle, background: "#fff" }} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ClinicRole }))}>
                <option value="DOCTOR">Врач</option>
                <option value="RECEPTION">Регистратура</option>
                <option value="CEO">Директор (CEO)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Фото URL</label>
              <input style={inputStyle} value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
            </div>
          </div>

          {createError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{createError}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px 24px",
                fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Сохранение..." : "Создать"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }}
              style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer", color: "#64748b" }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Staff grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={100} />)}
        </div>
      ) : staff.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <Users size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Нет сотрудников</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {staff.map((member, idx) => {
            const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const roleStyle = ROLE_STYLES[member.role];
            return (
              <div key={member.id} style={{
                ...card, padding: 20,
                opacity: member.isActive ? 1 : 0.55,
                position: "relative",
              }}>
                {!member.isActive && (
                  <span style={{
                    position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 700,
                    background: "#fef2f2", color: "#ef4444", borderRadius: 6, padding: "2px 8px",
                  }}>Неактивен</span>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                      background: c.bg, color: c.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 800,
                    }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{member.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        ...roleStyle,
                      }}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 2px" }}>{member.phone}</p>
                    {member.specialization && (
                      <p style={{ fontSize: 12, color: "#0d9488", margin: 0, fontWeight: 600 }}>{member.specialization}</p>
                    )}
                  </div>
                </div>
                {member.isActive && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      onClick={() => handleDeactivate(member.id)}
                      disabled={deactivating === member.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                        cursor: deactivating === member.id ? "not-allowed" : "pointer",
                        opacity: deactivating === member.id ? 0.6 : 1,
                      }}
                    >
                      <UserX size={13} />
                      {deactivating === member.id ? "..." : "Деактивировать"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
