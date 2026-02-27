import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
}

export function KpiCard({ title, value, icon: Icon, description, colorClass = "text-primary" }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="kpi-card"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </motion.div>
  );
}
