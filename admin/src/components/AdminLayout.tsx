import { Navigate } from "react-router-dom";
import { hasAdminToken as hasAdminSecret } from "@/lib/api";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasAdminSecret()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-medium text-muted-foreground">HamshiraGo Admin</span>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
