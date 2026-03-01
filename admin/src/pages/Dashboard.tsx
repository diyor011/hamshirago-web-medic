import { useCallback, useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { getOrders, getPendingMedics, type AdminOrder } from "@/lib/api";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  UserCheck,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    doneOrders: 0,
    canceledOrders: 0,
    pendingMedics: 0,
    totalRevenue: 0,
    todayOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dailyOrders, setDailyOrders] = useState<{ day: string; orders: number }[]>([]);

  const load = useCallback(async () => {
    try {
      const [allOrders, doneOrders, canceledOrders, pending] = await Promise.all([
        getOrders(1, 1),
        getOrders(1, 1, "DONE"),
        getOrders(1, 1, "CANCELED"),
        getPendingMedics(),
      ]);

      // Загружаем ВСЕ страницы DONE заказов параллельно для точного подсчёта дохода
      let revenue = 0;
      if (doneOrders.total > 0) {
        const PAGE = 100;
        const totalPages = Math.ceil(doneOrders.total / PAGE);
        const pages = await Promise.all(
          Array.from({ length: totalPages }, (_, i) => getOrders(i + 1, PAGE, "DONE"))
        );
        revenue = pages
          .flatMap(p => p.data)
          .reduce((sum: number, o: AdminOrder) => sum + (o.platformFee || 0), 0);
      }

      // Загружаем страницы пока не дойдём до заказов старше 7 дней (сортировка DESC)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const today = new Date().toISOString().split("T")[0];
      const recentData: AdminOrder[] = [];
      let page = 1;
      while (true) {
        const res = await getOrders(page, 100);
        recentData.push(...res.data);
        const last = res.data[res.data.length - 1];
        if (!last || new Date(last.created_at) < cutoff || page >= res.totalPages) break;
        page++;
      }

      const todayCount = recentData.filter((o) => o.created_at?.startsWith(today)).length;
      const last7Days = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.set(d.toISOString().split("T")[0], 0);
      }
      recentData.forEach((o) => {
        const key = String(o.created_at || "").split("T")[0];
        if (last7Days.has(key)) last7Days.set(key, (last7Days.get(key) || 0) + 1);
      });
      const chartData = Array.from(last7Days.entries()).map(([date, orders]) => ({
        day: new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        orders,
      }));
      setDailyOrders(chartData);

      setStats({
        totalOrders: allOrders.total,
        doneOrders: doneOrders.total,
        canceledOrders: canceledOrders.total,
        pendingMedics: pending.length,
        totalRevenue: revenue,
        todayOrders: todayCount,
      });
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, 30_000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const formatUZS = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;
  const successRate = stats.totalOrders > 0 ? Math.round((stats.doneOrders / stats.totalOrders) * 100) : 0;
  const cancelRate = stats.totalOrders > 0 ? Math.round((stats.canceledOrders / stats.totalOrders) * 100) : 0;
  const kpiCards = [
    {
      title: "Заказов сегодня",
      value: stats.todayOrders,
      icon: TrendingUp,
      colorClass: "text-cyan-700 dark:text-cyan-300",
      className:
        "bg-gradient-to-br from-cyan-50/90 via-white/80 to-sky-100/80 border-cyan-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(8,145,178,0.6)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-cyan-950/45 dark:to-slate-900/90 dark:border-cyan-900/40",
    },
    {
      title: "Всего заказов",
      value: stats.totalOrders,
      icon: ClipboardList,
      colorClass: "text-blue-700 dark:text-blue-300",
      className:
        "bg-gradient-to-br from-blue-50/90 via-white/80 to-indigo-100/80 border-blue-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(37,99,235,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-blue-950/45 dark:to-slate-900/90 dark:border-blue-900/40",
    },
    {
      title: "Выполнено",
      value: stats.doneOrders,
      icon: CheckCircle2,
      colorClass: "text-emerald-700 dark:text-emerald-300",
      className:
        "bg-gradient-to-br from-emerald-50/90 via-white/80 to-teal-100/80 border-emerald-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(5,150,105,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-emerald-950/45 dark:to-slate-900/90 dark:border-emerald-900/40",
    },
    {
      title: "Отменено",
      value: stats.canceledOrders,
      icon: XCircle,
      colorClass: "text-rose-700 dark:text-rose-300",
      className:
        "bg-gradient-to-br from-rose-50/90 via-white/80 to-pink-100/80 border-rose-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(225,29,72,0.5)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-rose-950/35 dark:to-slate-900/90 dark:border-rose-900/40",
    },
    {
      title: "Доход платформы",
      value: stats.totalRevenue,
      icon: DollarSign,
      colorClass: "text-teal-700 dark:text-teal-300",
      description: "Сумма комиссий DONE заказов",
      formatValue: formatUZS,
      className:
        "bg-gradient-to-br from-teal-50/90 via-white/80 to-emerald-100/80 border-teal-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(13,148,136,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-teal-950/40 dark:to-slate-900/90 dark:border-teal-900/40",
    },
    {
      title: "Ожидают верификации",
      value: stats.pendingMedics,
      icon: UserCheck,
      colorClass: "text-amber-700 dark:text-amber-300",
      className:
        "bg-gradient-to-br from-amber-50/90 via-white/80 to-yellow-100/80 border-amber-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(217,119,6,0.5)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-amber-950/35 dark:to-slate-900/90 dark:border-amber-900/40",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kpi-card h-28">
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <Skeleton className="h-6 w-60 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary/25 to-info/20 dark:from-cyan-700/20 dark:to-indigo-700/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-64 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/20 to-cyan-300/20 dark:from-emerald-700/20 dark:to-cyan-700/20 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-primary/20 via-cyan-50/50 to-info/20 dark:from-slate-900 dark:via-cyan-950/30 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-info/20 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations Center</p>
            <h1 className="text-3xl font-semibold tracking-tight">HamshiraGo Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground dark:text-slate-300 max-w-2xl">
              Живая сводка по заказам, доходности и верификации. Данные обновляются автоматически в течение дня.
            </p>
          </div>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/75 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-wider text-muted-foreground dark:text-slate-300">Эффективность</p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-foreground dark:text-slate-100">
                  <span>Успешные заказы</span>
                  <span className="font-semibold">{successRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/70 dark:bg-slate-700/70">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${successRate}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-foreground dark:text-slate-100">
                  <span>Отмены</span>
                  <span className="font-semibold">{cancelRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/70 dark:bg-slate-700/70">
                  <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${cancelRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.title}
            className={card.className}
            title={card.title}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            description={card.description}
            formatValue={card.formatValue}
          />
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Заказы за последние 7 дней</h2>
          <span className="status-badge status-created">auto refresh 30s</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyOrders}>
              <defs>
                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--primary))"
                strokeWidth={2.4}
                fill="url(#ordersGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 via-white/80 to-teal-100/70 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-emerald-950/30 p-5 backdrop-blur-md"
        >
          <p className="text-sm font-semibold">Состояние потока заказов</p>
          <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">
            Сегодня в обработке: <span className="font-semibold text-foreground">{stats.totalOrders - stats.doneOrders - stats.canceledOrders}</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">DONE</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{stats.doneOrders}</p>
            </div>
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">CANCELED</p>
              <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">{stats.canceledOrders}</p>
            </div>
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">Верификация</p>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{stats.pendingMedics}</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-indigo-50/80 via-white/80 to-blue-100/70 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-indigo-950/35 p-5 backdrop-blur-md"
        >
          <p className="text-sm font-semibold">Финансовый фокус</p>
          <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">Доход платформы за выполненные заказы</p>
          <p className="mt-4 text-3xl font-bold tracking-tight text-indigo-900 dark:text-indigo-200">{formatUZS(stats.totalRevenue)}</p>
          <div className="mt-4 h-2 rounded-full bg-white/80 dark:bg-slate-700/80">
            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" style={{ width: `${Math.min(100, successRate + 12)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-slate-300">Индикатор эффективности построен на доле успешно завершённых заказов.</p>
        </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;
