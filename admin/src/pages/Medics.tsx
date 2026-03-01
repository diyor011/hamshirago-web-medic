import { useEffect, useMemo, useState } from "react";
import { getAllMedics, blockMedic, type AdminMedic } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ShieldAlert, Star, Users, UserCheck, Wifi } from "lucide-react";
import { motion } from "framer-motion";

const Medics = () => {
  const [medics, setMedics] = useState<AdminMedic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlineFilter, setOnlineFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await getAllMedics(1, 100);
        setMedics(res.data);
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

  const filteredMedics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medics.filter((m) => {
      const bySearch =
        !q ||
        String(m.name ?? "").toLowerCase().includes(q) ||
        String(m.phone ?? "").toLowerCase().includes(q);
      const byOnline =
        onlineFilter === "ALL" ||
        (onlineFilter === "ONLINE" && m.isOnline) ||
        (onlineFilter === "OFFLINE" && !m.isOnline);
      return bySearch && byOnline;
    });
  }, [medics, onlineFilter, search]);

  const onlineCount = medics.filter((m) => m.isOnline).length;
  const blockedCount = medics.filter((m) => m.isBlocked).length;
  const approvedCount = medics.filter((m) => m.verificationStatus === "APPROVED").length;

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/20 to-cyan-300/10 dark:from-indigo-700/20 dark:to-cyan-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/20 to-blue-300/10 dark:from-emerald-700/20 dark:to-blue-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-indigo-50/80 via-white/70 to-cyan-50/80 dark:from-slate-900 dark:via-indigo-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Medic Operations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Все медики</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
            Центр управления профилями медиков, статусами верификации и доступностью в реальном времени.
          </p>
        </div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-slate-900/90 dark:to-blue-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Всего в списке</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{medics.length}</p>
          <Users className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Онлайн</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{onlineCount}</p>
          <Wifi className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-cyan-50/80 to-sky-100/70 dark:from-slate-900/90 dark:to-cyan-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">APPROVED</p>
          <p className="text-2xl font-semibold text-cyan-900 dark:text-cyan-200">{approvedCount}</p>
          <UserCheck className="h-4 w-4 text-cyan-700 dark:text-cyan-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-rose-50/80 to-orange-100/70 dark:from-slate-900/90 dark:to-rose-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Заблокированы</p>
          <p className="text-2xl font-semibold text-rose-900 dark:text-rose-200">{blockedCount}</p>
          <ShieldAlert className="h-4 w-4 text-rose-700 dark:text-rose-300 mt-2" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или телефону"
            className="sm:max-w-sm bg-white/80 dark:bg-slate-900/80"
          />
          <Select value={onlineFilter} onValueChange={(v: "ALL" | "ONLINE" | "OFFLINE") => setOnlineFilter(v)}>
            <SelectTrigger className="sm:w-44 bg-white/80 dark:bg-slate-900/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все</SelectItem>
              <SelectItem value="ONLINE">Только онлайн</SelectItem>
              <SelectItem value="OFFLINE">Только оффлайн</SelectItem>
            </SelectContent>
          </Select>
          <span className="status-badge status-created sm:ml-auto">Показано: {filteredMedics.length}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
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
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredMedics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              filteredMedics.map((m) => (
                <TableRow key={m.id} className="hover:bg-white/70 dark:hover:bg-slate-900/60">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-sm">{m.phone}</TableCell>
                  <TableCell><StatusBadge status={m.verificationStatus} /></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-2 text-xs font-medium rounded-full px-2 py-1 ${
                      m.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${m.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {m.isOnline ? "Online" : "Offline"}
                    </span>
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
