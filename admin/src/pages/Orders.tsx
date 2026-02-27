import { useEffect, useState } from "react";
import { getOrders, cancelOrder } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { motion } from "framer-motion";

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

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOrders(page, 20, status === "ALL" ? undefined : status);
      setOrders(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (e) {
      toast.error("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleCancel = async (id: string) => {
    if (!confirm("Отменить заказ?")) return;
    try {
      await cancelOrder(id);
      toast.success("Заказ отменён");
      load();
    } catch (e) {
      toast.error("Ошибка отмены");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold">
          Заказы
        </motion.h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Всего: {total}</span>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Адрес</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
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
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell className="font-medium">{o.serviceTitle}</TableCell>
                    <TableCell>{Number(o.priceAmount).toLocaleString("ru-RU")} UZS</TableCell>
                    <TableCell>{Number(o.platformFee).toLocaleString("ru-RU")} UZS</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{o.location?.house || "—"}</TableCell>
                    <TableCell>
                      {CANCELABLE.includes(o.status) && (
                        <Button variant="destructive" size="sm" onClick={() => handleCancel(o.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Отменить
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
