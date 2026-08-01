import { useEffect, useState } from "react";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  Settings as SettingsIcon,
  LogOut,
  BookOpen,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import type { Category } from "../../shared/types";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const DASHBOARD_ITEM = { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true };
const SETTINGS_ITEM = { to: "/settings", label: "Configurações", icon: SettingsIcon, end: false };

function adminItem(role?: string) {
  if (role === "admin") {
    return { to: "/admin", label: "Administração", icon: ShieldCheck, end: false };
  }
  return null;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let alive = true;
    api.categories
      .list()
      .then((cats) => alive && setCategories(cats))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch {}
    clear();
    navigate("/login", { replace: true });
  }

  const categoryLink = categories[0]?.code ? `/category/${categories[0].code}` : "/category/01";
  const categoryItem = { to: categoryLink, label: "Categorias", icon: Library, end: false };
  const admin = adminItem(user?.role);

  const navItems = [DASHBOARD_ITEM, categoryItem, SETTINGS_ITEM, admin].filter(Boolean) as {
    to: string;
    label: string;
    icon: React.ElementType;
    end?: boolean;
  }[];

  return (
    <div className="flex h-full">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Estante</span>
            <span className="text-xs text-muted-foreground">de Ebooks</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/80 hover:bg-muted/60"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggle}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {theme === "light" ? "Modo escuro" : "Modo claro"}
          </Button>
          <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
            {user?.username}
            {user?.role === "admin" && (
              <span className="ml-1 text-primary font-medium">admin</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 pb-safe z-40">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-md text-[11px] transition-colors",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-auto scrollbar-thin bg-background pb-16 md:pb-0">
        <div key={location.pathname} className="animate-fade-in h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}