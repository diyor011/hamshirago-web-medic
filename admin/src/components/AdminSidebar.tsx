import {
  LayoutDashboard,
  UserCheck,
  Stethoscope,
  Users,
  ClipboardList,
  Package,
  BarChart2,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { clearAdminToken as clearAdminSecret } from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Верификация", url: "/verification", icon: UserCheck },
  { title: "Медики", url: "/medics", icon: Stethoscope },
  { title: "Клиенты", url: "/clients", icon: Users },
  { title: "Заказы", url: "/orders", icon: ClipboardList },
  { title: "Услуги", url: "/services", icon: Package },
  { title: "Отчёты", url: "/reports", icon: BarChart2 },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminSecret();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/95 backdrop-blur-md">
      <SidebarContent>
        <div className="px-4 py-5">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400 text-sidebar-primary-foreground font-bold text-sm shadow-lg">
                H
              </div>
              <span className="font-semibold text-sidebar-foreground">HamshiraGo</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400 text-sidebar-primary-foreground font-bold text-sm mx-auto shadow-lg">
              H
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/80 rounded-md"
                      activeClassName="bg-gradient-to-r from-cyan-500/15 to-teal-500/15 text-teal-700 dark:text-cyan-300 font-medium rounded-md"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-sidebar-accent text-sidebar-foreground rounded-md">
              <LogOut className="h-4 w-4 mr-2" />
              {!collapsed && <span>Выйти</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
