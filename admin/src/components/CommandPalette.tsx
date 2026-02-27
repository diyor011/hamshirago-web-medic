import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { clearAdminToken, getOrders } from "@/lib/api";

type RecentOrder = {
  id: string;
  serviceTitle?: string;
  status?: string;
};

const NAV_ITEMS = [
  { label: "Дашборд", path: "/", icon: LayoutDashboard },
  { label: "Верификация", path: "/verification", icon: UserCheck },
  { label: "Медики", path: "/medics", icon: Stethoscope },
  { label: "Клиенты", path: "/clients", icon: Users },
  { label: "Заказы", path: "/orders", icon: ClipboardList },
  { label: "Услуги", path: "/services", icon: Package },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (recentOrders.length > 0) return;

    getOrders(1, 8)
      .then((res) => {
        setRecentOrders(res.data);
      })
      .catch(() => {});
  }, [open, recentOrders.length]);

  const canSearchOrder = useMemo(() => query.trim().length >= 6, [query]);

  const navigateTo = (path: string) => {
    setOpen(false);
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const openOrderSearch = () => {
    const search = query.trim();
    if (!search) return;
    setOpen(false);
    navigate(`/orders?search=${encodeURIComponent(search)}`);
  };

  const handleLogout = () => {
    clearAdminToken();
    setOpen(false);
    navigate("/login");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter>
        <CommandInput
          placeholder="Поиск раздела или заказа... (Cmd/Ctrl + K)"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>

          {canSearchOrder && (
            <CommandGroup heading="Быстрый поиск">
              <CommandItem value={`Поиск заказа ${query}`} onSelect={openOrderSearch}>
                <Search className="mr-2 h-4 w-4" />
                <span>Найти заказ: {query.trim()}</span>
                <CommandShortcut>Enter</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandGroup heading="Навигация">
            {NAV_ITEMS.map((item) => (
              <CommandItem key={item.path} value={item.label} onSelect={() => navigateTo(item.path)}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {recentOrders.length > 0 && (
            <CommandGroup heading="Последние заказы">
              {recentOrders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`${order.id} ${order.serviceTitle ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate(`/orders?search=${encodeURIComponent(order.id)}`);
                  }}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span className="truncate">#{order.id.slice(0, 8)} {order.serviceTitle ?? "Заказ"}</span>
                  {order.status ? <CommandShortcut>{order.status}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Сессия">
            <CommandItem value="Выйти" onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Выйти</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
