import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  colorClass = "text-primary",
  formatValue,
  className,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn("kpi-card", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground dark:text-slate-300 font-medium">{title}</span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 dark:bg-slate-900/70 border border-border/60 dark:border-slate-700/70">
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight">
        {typeof value === "number" ? (
          <CountUp
            preserveValue
            duration={1.1}
            end={value}
            separator=" "
            formattingFn={formatValue}
          />
        ) : (
          value
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground dark:text-slate-300 mt-1">{description}</p>}
    </motion.div>
  );
}
