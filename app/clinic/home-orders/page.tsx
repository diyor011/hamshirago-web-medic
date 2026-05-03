"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, MapPin, User, ChevronDown, CheckCircle, Home } from "lucide-react";
import { clinicApi, HomeOrder, HomeOrderStatus, ClinicStaff } from "@/lib/clinicApi";
import { useToast, ToastContainer } from "@/components/clinic/Toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<HomeOrderStatus, string> = {
  CREATED:         "Создан",
  ASSIGNED:        "Назначен",
  ACCEPTED:        "Принят",
  ON_THE_WAY:      "В пути",
  ARRIVED:         "Прибыл",
  SERVICE_STARTED: "Оказывается услуга",
  DONE:            "Выполнен",
  CANCELED:        "Отменён",
};

const STATUS_BADGE: Record<HomeOrderStatus, string> = {
  CREATED:         "bg-teal-50 text-teal-700",
  ASSIGNED:        "bg-yellow-50 text-yellow-700",
  ACCEPTED:        "bg-yellow-50 text-yellow-700",
  ON_THE_WAY:      "bg-blue-50 text-blue-700",
  ARRIVED:         "bg-orange-50 text-orange-700",
  SERVICE_STARTED: "bg-purple-50 text-purple-700",
  DONE:            "bg-emerald-50 text-emerald-700",
  CANCELED:        "bg-red-50 text-red-500",
};

const ACTIVE_STATUSES: HomeOrderStatus[] = [
  "CREATED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAddress(loc: HomeOrder["location"]): string {
  const parts = [loc.house];
  if (loc.floor) parts.push(`эт. ${loc.floor}`);
  if (loc.apartment) parts.push(`кв. ${loc.apartment}`);
  return parts.join(", ");
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "только что";
  if (diff < 60) return `${diff} мин назад`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} д назад`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-24 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="h-8 w-36 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Assign Dropdown ──────────────────────────────────────────────────────────

function AssignDropdown({
  order,
  staff,
  onAssign,
}: {
  order: HomeOrder;
  staff: ClinicStaff[];
  onAssign: (orderId: string, staffId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const nurses = staff.filter((s) => s.isActive);

  async function handleSelect(staffId: string) {
    setOpen(false);
    setLoading(true);
    await onAssign(order.id, staffId);
    setLoading(false);
  }

  const assigned = order.medicId
    ? nurses.find((s) => s.id === order.medicId)
    : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 disabled:opacity-60"
      >
        <User size={14} className="shrink-0 text-slate-400" />
        <span className="max-w-[130px] truncate">
          {loading ? "Назначение..." : assigned ? assigned.name : "Назначить медсестру"}
        </span>
        <ChevronDown size={13} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {nurses.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-slate-400">Нет активных сотрудников</p>
            ) : (
              nurses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
                >
                  {s.photoUrl ? (
                    <img
                      src={s.photoUrl}
                      alt={s.name}
                      className="h-6 w-6 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    {s.specialization && (
                      <p className="truncate text-[11px] text-slate-400">{s.specialization}</p>
                    )}
                  </div>
                  {order.medicId === s.id && (
                    <CheckCircle size={14} className="shrink-0 text-teal-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  staff,
  onAssign,
}: {
  order: HomeOrder;
  staff: ClinicStaff[];
  onAssign: (orderId: string, staffId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-slate-800">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                STATUS_BADGE[order.status],
              ].join(" ")}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          <p className="mb-1 truncate text-[14px] font-semibold text-slate-700">
            {order.serviceTitle}
          </p>

          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MapPin size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{formatAddress(order.location)}</span>
          </div>

          {order.location.phone && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
              <span className="text-slate-400">📞</span>
              <span>{order.location.phone}</span>
            </div>
          )}

          <p className="mt-2 text-[11px] text-slate-400">{timeAgo(order.created_at)}</p>
        </div>

        <AssignDropdown order={order} staff={staff} onAssign={onAssign} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
        <span className="text-[12px] text-slate-400">Стоимость</span>
        <span className="text-[13px] font-semibold text-slate-700">
          {(order.finalPrice ?? order.price).toLocaleString("ru-RU")} сум
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomeOrdersPage() {
  const [orders, setOrders] = useState<HomeOrder[]>([]);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, toast, closeToast } = useToast();

  const [notReady, setNotReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotReady(false);
    try {
      const [ordersData, staffData] = await Promise.all([
        clinicApi.homeOrders.list(),
        clinicApi.staff.list(),
      ]);
      const active = ordersData.filter((o) => ACTIVE_STATUSES.includes(o.status));
      setOrders(active);
      setStaff(staffData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("404") || msg.includes("Not Found") || msg.includes("Cannot GET")) {
        setNotReady(true);
      } else {
        setError(msg || "Ошибка загрузки");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(orderId: string, staffId: string) {
    try {
      const updated = await clinicApi.homeOrders.assign(orderId, staffId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      const member = staff.find((s) => s.id === staffId);
      toast.success(`Назначен: ${member?.name ?? "сотрудник"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка назначения");
    }
  }

  if (notReady) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 text-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Home size={28} className="text-amber-500" />
        </div>
        <div>
          <p className="text-[16px] font-bold text-slate-800">Раздел в разработке</p>
          <p className="mt-1.5 text-[13px] text-slate-500 max-w-sm">
            Функция «Заказы на дом» будет доступна после подключения бэкенд-эндпоинта.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
              <Home size={12} />
              Clinic OS
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Заказы на дом</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Активные заказы клиники · {orders.length} шт.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-[13px] text-red-500">{error}</span>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-red-500 hover:text-red-700"
          >
            <RefreshCw size={13} /> Повторить
          </button>
        </div>
      )}

      {/* Skeletons */}
      {loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Home size={24} className="text-slate-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-700">Нет активных заказов</p>
          <p className="mt-1 text-[13px] text-slate-400">Новые заказы появятся здесь</p>
        </div>
      )}

      {/* Orders Grid */}
      {!loading && orders.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              staff={staff}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
