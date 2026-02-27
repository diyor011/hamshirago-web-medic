import { useEffect, useState } from "react";
import { getPendingMedics, blockMedic } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const Medics = () => {
  const [medics, setMedics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Using pending endpoint as all-medics endpoint is not yet available
        const data = await getPendingMedics();
        setMedics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await blockMedic(id, isBlocked);
      setMedics((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isBlocked } : m))
      );
      toast.success(isBlocked ? "Медик заблокирован" : "Медик разблокирован");
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold">
        Все медики
      </motion.h1>

      <p className="text-sm text-muted-foreground">
        ⚠️ Отображаются медики из доступного эндпоинта. Для полного списка необходим <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">GET /medics/admin/all</code>
      </p>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Онлайн</TableHead>
              <TableHead>Рейтинг</TableHead>
              <TableHead>Баланс</TableHead>
              <TableHead>Заблокирован</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : medics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              medics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-sm">{m.phone}</TableCell>
                  <TableCell><StatusBadge status={m.verificationStatus} /></TableCell>
                  <TableCell>
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${m.isOnline ? "bg-success" : "bg-muted-foreground/30"}`} />
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {m.rating ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>{m.balance != null ? `${Number(m.balance).toLocaleString("ru-RU")} UZS` : "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={m.isBlocked || false}
                      onCheckedChange={(v) => handleBlock(m.id, v)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Medics;
