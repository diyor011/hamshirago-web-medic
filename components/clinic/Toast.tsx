"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const STYLES: Record<ToastType, { bg: string; border: string; color: string; Icon: React.FC<{ size: number }> }> = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", Icon: CheckCircle },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#ef4444", Icon: XCircle    },
  warn:    { bg: "#fffbeb", border: "#fde68a", color: "#d97706", Icon: AlertCircle },
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", Icon: Info        },
};

// ─── ToastContainer ────────────────────────────────────────────────────────

export function ToastContainer({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 360,
    }}>
      {toasts.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.Icon;
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12,
            padding: "12px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            animation: "toastIn 200ms cubic-bezier(0.22,1,0.36,1)",
          }}>
            <span style={{ color: s.color, flexShrink: 0, marginTop: 1, display: "flex" }}><Icon size={16} /></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", flex: 1, lineHeight: 1.45 }}>{t.message}</span>
            <button onClick={() => onClose(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── useToast ───────────────────────────────────────────────────────────────

export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const close = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    const t = setTimeout(() => close(id), duration);
    timers.current.set(id, t);
  }, [close, duration]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const toast = {
    success: (msg: string) => add("success", msg),
    error:   (msg: string) => add("error",   msg),
    warn:    (msg: string) => add("warn",     msg),
    info:    (msg: string) => add("info",     msg),
  };

  return { toasts, toast, closeToast: close };
}

// ─── ConfirmDialog ──────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Подтвердить", danger = true }: ConfirmDialogProps) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 9999, background: "#fff", borderRadius: 16, padding: "24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.14)", width: "100%", maxWidth: 360,
        animation: "toastIn 180ms cubic-bezier(0.22,1,0.36,1)",
      }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Подтверждение</p>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
            Отмена
          </button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: danger ? "#ef4444" : "#0d9488", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
