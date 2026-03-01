import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOrders, cancelOrder, WS_URL, type AdminOrder } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Wallet,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { useSearchParams } from "react-router-dom";

const STATUSES = [
  { value: "ALL", label: "Все" },
  { value: "CREATED", label: "Создан" },
  { value: "ASSIGNED", label: "Назначен" },
  { value: "ACCEPTED", label: "Принят" },
  { value: "ON_THE_WAY", label: "В пути" },
  { value: "ARRIVED", label: "Прибыл" },
  { value: "SERVICE_STARTED", label: "Выполняется" },
  { value: "DONE", label: "Завершён" },
  { value: "CANCELED", label: "Отменён" },
];

const CANCELABLE = ["CREATED", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED"];
type SortKey = "created_at" | "priceAmount" | "platformFee" | "status";
type SortDirection = "asc" | "desc";

const Orders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const subscribedOrderIds = useRef<Set<string>>(new Set());
  const visibleOrderIds = useRef<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    }
    try {
      const activeSearch = searchText.trim().toLowerCase();
      if (activeSearch) {
        const data = await getOrders(1, 100, status === "ALL" ? undefined : status);
        const filtered = data.data.filter((order) => {
          const id = String(order.id ?? "").toLowerCase();
          const service = String(order.serviceTitle ?? "").toLowerCase();
          const address = String(order.location?.house ?? "").toLowerCase();
          return id.includes(activeSearch) || service.includes(activeSearch) || address.includes(activeSearch);
        });
        setOrders(filtered);
        setTotal(filtered.length);
        setTotalPages(1);
      } else {
        const data = await getOrders(page, 20, status === "ALL" ? undefined : status);
        setOrders(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (e) {
      toast.error("Ошибка загрузки заказов");
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  }, [page, status, searchText]);

  useEffect(() => {
    const initialSearch = searchParams.get("search") ?? "";
    setSearchText(initialSearch);
  }, [searchParams]);

  useEffect(() => {
    load(true);
    const intervalId = window.setInterval(() => load(false), 30_000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      visibleOrderIds.current.forEach((id) => {
        socket.emit("subscribe_order", id);
        subscribedOrderIds.current.add(id);
      });
    });
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));
    socket.on("order_status", ({ orderId, status: nextStatus }: { orderId: string; status: string }) => {
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)));
    });

    return () => {
      subscribedOrderIds.current.clear();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    visibleOrderIds.current = orders.map((order) => order.id);
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const nextSet = new Set(visibleOrderIds.current);
    subscribedOrderIds.current.forEach((orderId) => {
      if (!nextSet.has(orderId)) {
        socket.emit("unsubscribe_order", orderId);
        subscribedOrderIds.current.delete(orderId);
      }
    });
    nextSet.forEach((orderId) => {
      if (!subscribedOrderIds.current.has(orderId)) {
        socket.emit("subscribe_order", orderId);
        subscribedOrderIds.current.add(orderId);
      }
    });
  }, [orders]);

  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";
      if (sortKey === "created_at") {
        left = new Date(a.created_at).getTime();
        right = new Date(b.created_at).getTime();
      } else if (sortKey === "priceAmount") {
        left = Number(a.priceAmount || 0);
        right = Number(b.priceAmount || 0);
      } else if (sortKey === "platformFee") {
        left = Number(a.platformFee || 0);
        right = Number(b.platformFee || 0);
      } else if (sortKey === "status") {
        left = String(a.status || "");
        right = String(b.status || "");
      }

      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [orders, sortDirection, sortKey]);
  const activeCount = useMemo(
    () => sortedOrders.filter((o) => !["DONE", "CANCELED"].includes(o.status)).length,
    [sortedOrders],
  );
  const doneCount = useMemo(
    () => sortedOrders.filter((o) => o.status === "DONE").length,
    [sortedOrders],
  );
  const canceledCount = useMemo(
    () => sortedOrders.filter((o) => o.status === "CANCELED").length,
    [sortedOrders],
  );
  const revenueSum = useMemo(
    () => sortedOrders.reduce((sum, o) => sum + Number(o.platformFee || 0), 0),
    [sortedOrders],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-300" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Отменить заказ?")) return;
    try {
      await cancelOrder(id);
      toast.success("Заказ отменён");
      load(false);
    } catch (e) {
      toast.error("Ошибка отмены");
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-300/10 dark:from-cyan-700/20 dark:to-blue-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/20 to-emerald-300/10 dark:from-indigo-700/20 dark:to-emerald-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-cyan-50/80 via-white/70 to-indigo-50/80 dark:from-slate-900 dark:via-cyan-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Order Control</p>
            <h1 className="text-3xl font-semibold tracking-tight">Заказы</h1>
            <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
              Мониторинг потока заказов в реальном времени с фильтрацией, сортировкой и быстрыми действиями.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-badge ${socketConnected ? "status-done" : "status-created"}`}>
              {socketConnected ? "Live" : "Polling"}
            </span>
            <span className="status-badge status-created">Всего: {total}</span>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-cyan-50/80 to-blue-100/70 dark:from-slate-900/90 dark:to-cyan-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Активные</p>
          <p className="text-2xl font-semibold text-cyan-900 dark:text-cyan-200">{activeCount}</p>
          <Activity className="h-4 w-4 text-cyan-700 dark:text-cyan-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Завершены</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{doneCount}</p>
          <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-rose-50/80 to-orange-100/70 dark:from-slate-900/90 dark:to-rose-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Отменены</p>
          <p className="text-2xl font-semibold text-rose-900 dark:text-rose-200">{canceledCount}</p>
          <Clock3 className="h-4 w-4 text-rose-700 dark:text-rose-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-indigo-50/80 to-violet-100/70 dark:from-slate-900/90 dark:to-indigo-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Комиссия (выборка)</p>
          <p className="text-2xl font-semibold text-indigo-900 dark:text-indigo-200">{revenueSum.toLocaleString("ru-RU")} UZS</p>
          <Wallet className="h-4 w-4 text-indigo-700 dark:text-indigo-300 mt-2" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={searchText}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchText(nextValue);
              setPage(1);
              const nextParams = new URLSearchParams(searchParams);
              if (nextValue.trim()) {
                nextParams.set("search", nextValue);
              } else {
                nextParams.delete("search");
              }
              setSearchParams(nextParams, { replace: true });
            }}
            placeholder="Поиск: ID, услуга, адрес"
            className="sm:max-w-sm bg-white/80 dark:bg-slate-900/80"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44 bg-white/80 dark:bg-slate-900/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="status-badge status-created sm:ml-auto">Сортировка: {sortKey}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1.5" onClick={() => toggleSort("created_at")}>
                    Дата {renderSortIcon("created_at")}
                  </button>
                </TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1.5" onClick={() => toggleSort("priceAmount")}>
                    Цена {renderSortIcon("priceAmount")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1.5" onClick={() => toggleSort("platformFee")}>
                    Комиссия {renderSortIcon("platformFee")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1.5" onClick={() => toggleSort("status")}>
                    Статус {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead>Адрес</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Нет заказов
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {sortedOrders.map((o) => (
                  <motion.tr
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="border-b transition-colors hover:bg-white/70 dark:hover:bg-slate-900/60"
                  >
                    <TableCell className="font-mono text-xs">{o.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell className="font-medium">{o.serviceTitle}</TableCell>
                    <TableCell>{Number(o.priceAmount).toLocaleString("ru-RU")} UZS</TableCell>
                    <TableCell>{Number(o.platformFee).toLocaleString("ru-RU")} UZS</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{o.location?.house || "—"}</TableCell>
                    <TableCell>
                      {CANCELABLE.includes(o.status) && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-0"
                          onClick={() => handleCancel(o.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Отменить
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Orders;
