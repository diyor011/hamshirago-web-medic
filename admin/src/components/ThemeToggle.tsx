import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["system", "light", "dark"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const current = theme ?? "system";
  const idx = ORDER.indexOf(current as (typeof ORDER)[number]);
  const next = ORDER[(idx + 1) % ORDER.length];

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground bg-white/80 dark:bg-slate-900/80"
      onClick={() => setTheme(next)}
      title={`Текущая тема: ${current}`}
    >
      {current === "dark" ? <Moon className="h-4 w-4" /> : current === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
      <span className="hidden sm:inline capitalize">{current}</span>
    </Button>
  );
}
