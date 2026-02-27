import { Navigate } from "react-router-dom";
import { hasAdminToken as hasAdminSecret } from "@/lib/api";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasAdminSecret()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-white via-slate-50/50 to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <AdminSidebar />
        <CommandPalette />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-14 flex items-center border-b border-white/40 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-medium text-muted-foreground">HamshiraGo Admin</span>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground bg-white/80 dark:bg-slate-900/80"
                onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Поиск</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
