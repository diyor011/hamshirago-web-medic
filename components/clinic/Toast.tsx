"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const STYLES: Record<ToastType, { containerCls: string; iconCls: string; Icon: React.FC<{ size: number }> }> = {
  success: { containerCls: "bg-green-50 border-green-200",  iconCls: "text-green-600",  Icon: CheckCircle },
  error:   { containerCls: "bg-red-50 border-red-200",      iconCls: "text-red-500",    Icon: XCircle    },
  warn:    { containerCls: "bg-amber-50 border-amber-200",  iconCls: "text-amber-600",  Icon: AlertCircle },
  info:    { containerCls: "bg-blue-50 border-blue-200",    iconCls: "text-blue-600",   Icon: Info        },
};

// ─── ToastContainer ────────────────────────────────────────────────────────

export function ToastContainer({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-[360px]">
      {toasts.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.Icon;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)] [animation:toastIn_200ms_cubic-bezier(0.22,1,0.36,1)] ${s.containerCls}`}
          >
            <span className={`shrink-0 mt-px flex ${s.iconCls}`}><Icon size={16} /></span>
            <span className="text-[13px] font-semibold text-slate-900 flex-1 leading-[1.45]">{t.message}</span>
            <button
              onClick={() => onClose(t.id)}
              className="bg-transparent border-none cursor-pointer text-slate-400 p-0 flex shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
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
    setToasts((prev) => {
      // Deduplicate: reset timer if same type+message already shown
      const existing = prev.find((t) => t.type === type && t.message === message);
      if (existing) {
        const prevTimer = timers.current.get(existing.id);
        if (prevTimer) { clearTimeout(prevTimer); timers.current.delete(existing.id); }
        const t = setTimeout(() => close(existing.id), duration);
        timers.current.set(existing.id, t);
        return prev;
      }
      const id = `${Date.now()}-${Math.random()}`;
      const t = setTimeout(() => close(id), duration);
      timers.current.set(id, t);
      return [...prev.slice(-4), { id, type, message }];
    });
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
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div onClick={onCancel} className="fixed inset-0 z-[9998] bg-black/30" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white rounded-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.14)] w-full max-w-[360px] [animation:toastIn_180ms_cubic-bezier(0.22,1,0.36,1)]">
        <p className="text-[15px] font-bold text-slate-900 mb-2">Подтверждение</p>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel} className="px-[18px] py-[9px] rounded-[10px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-500 cursor-pointer">
            Отмена
          </button>
          <button onClick={onConfirm} className={`px-[18px] py-[9px] rounded-[10px] text-[13px] font-bold text-white cursor-pointer border-none ${danger ? "bg-red-500" : "bg-teal-600"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
