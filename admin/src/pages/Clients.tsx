import { useEffect, useState, useCallback } from "react";
import { getUsers, blockClient, type AdminUser } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const Clients = () => {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");

  const blockedCount = users.filter((u) => u.isBlocked).length;

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await getUsers(p, 20, q || undefined);
      setUsers(res.data);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка загрузки клиентов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, ""); }, [load]);

  // Поиск с задержкой
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      load(1, searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, load]);

  const handleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await blockClient(id, isBlocked);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBlocked } : u));
      toast.success(isBlocked ? "Клиент заблокирован" : "Клиент разблокирован");
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-blue-300/20 to-indigo-300/10 dark:from-blue-700/20 dark:to-indigo-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-72 w-72 rounded-full bg-gradient-to-br from-teal-300/20 to-cyan-300/10 dark:from-teal-700/20 dark:to-cyan-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 via-white/70 to-teal-50/80 dark:from-slate-900 dark:via-blue-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Client Management</p>
          <h1 className="text-3xl font-semibold tracking-tight">Все клиенты</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
            Управление учётными записями клиентов платформы.
          </p>
        </div>
      </motion.section>

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-slate-900/90 dark:to-blue-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Всего клиентов</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{total}</p>
          <Users className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-rose-50/80 to-orange-100/70 dark:from-slate-900/90 dark:to-rose-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Заблокированы (на странице)</p>
          <p className="text-2xl font-semibold text-rose-900 dark:text-rose-200">{blockedCount}</p>
          <ShieldAlert className="h-4 w-4 text-rose-700 dark:text-rose-300 mt-2" />
        </div>
      </div>

      {/* Поиск */}
      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
        <div className="flex items-center gap-3">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по имени или телефону"
            className="max-w-sm bg-white/80 dark:bg-slate-900/80"
          />
          <span className="status-badge status-created ml-auto">
            Всего: {total}
          </span>
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur">
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Дата регистрации</TableHead>
              <TableHead>Заблокирован</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Клиентов не найдено
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-white/70 dark:hover:bg-slate-900/60">
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{u.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isBlocked || false}
                      onCheckedChange={(v) => handleBlock(u.id, v)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1, search)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => load(page + 1, search)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Clients;
