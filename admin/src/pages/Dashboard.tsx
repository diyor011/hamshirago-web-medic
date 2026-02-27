import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { getOrders, getPendingMedics } from "@/lib/api";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  UserCheck,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

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

  useEffect(() => {
    async function load() {
      try {
        const [allOrders, doneOrders, canceledOrders, pending] = await Promise.all([
          getOrders(1, 1),
          getOrders(1, 1, "DONE"),
          getOrders(1, 1, "CANCELED"),
          getPendingMedics(),
        ]);

        // Get done orders for revenue calculation
        let revenue = 0;
        if (doneOrders.total > 0) {
          const doneAll = await getOrders(1, 100, "DONE");
          revenue = doneAll.data.reduce((sum: number, o: any) => sum + (o.platformFee || 0), 0);
        }

        // Today's orders
        const today = new Date().toISOString().split("T")[0];
        const recentOrders = await getOrders(1, 100);
        const todayCount = recentOrders.data.filter(
          (o: any) => o.created_at?.startsWith(today)
        ).length;

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
    }
    load();
  }, []);

  const formatUZS = (n: number) => n.toLocaleString("ru-RU") + " UZS";

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kpi-card animate-pulse h-28 bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-bold"
      >
        Дашборд
      </motion.h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Заказов сегодня" value={stats.todayOrders} icon={TrendingUp} colorClass="text-primary" />
        <KpiCard title="Всего заказов" value={stats.totalOrders} icon={ClipboardList} colorClass="text-info" />
        <KpiCard title="Выполнено" value={stats.doneOrders} icon={CheckCircle2} colorClass="text-success" />
        <KpiCard title="Отменено" value={stats.canceledOrders} icon={XCircle} colorClass="text-destructive" />
        <KpiCard title="Доход платформы" value={formatUZS(stats.totalRevenue)} icon={DollarSign} colorClass="text-primary" description="Сумма комиссий DONE заказов" />
        <KpiCard title="Ожидают верификации" value={stats.pendingMedics} icon={UserCheck} colorClass="text-warning" />
      </div>
    </div>
  );
};

export default Dashboard;
