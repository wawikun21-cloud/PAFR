import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Bell, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems, systemMenuItems } from "@/config/menuItems";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((v) => !v);
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true; // No role restriction
    if (!user) return false; // No user, no access
    return item.roles.includes(user.role);
  });

  const filteredSystemItems = systemMenuItems.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "transition-all duration-200 ease-out",
        isCollapsed ? "w-[64px]" : "w-[260px]",
        "bg-white border-r border-neutral-200",
        "dark:bg-neutral-950 dark:border-neutral-800"
      )}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          "border-b border-neutral-200 dark:border-neutral-800",
          isCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden",
            isCollapsed && "justify-center"
          )}
        >
          {/* Logo mark — PAF roundel-inspired badge */}
          <span className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700",
            "shadow-md shadow-blue-900/30 dark:shadow-blue-900/50",
            "ring-2 ring-blue-500/30 dark:ring-blue-400/20",
            "before:absolute before:inset-[3px] before:rounded-full",
            "before:border before:border-white/20"
          )}>
            {/* Outer ring detail */}
            <span className="absolute inset-0 rounded-full border border-white/10" />
            {/* PAF text */}
            <span className="relative z-10 text-[9px] font-black tracking-[0.05em] text-white leading-none select-none">
              PAF
            </span>
            {/* Bottom star accent */}
            <span className="absolute bottom-[5px] text-[6px] text-yellow-300 leading-none select-none">★</span>
          </span>

          {/* Brand text */}
          {!isCollapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              {/* P.A.F.R with letter-spaced styling */}
              <span className="text-[15px] font-black tracking-[0.12em] text-neutral-900 dark:text-neutral-50 leading-none">
                P.A.F.R
              </span>
              {/* Subtitle — subtle, small, tight */}
              <span className="mt-[3px] text-[9px] font-medium tracking-[0.06em] uppercase text-neutral-400 dark:text-neutral-500 truncate leading-none">
                Philippine Air Force Reservists
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle */}
        {!isCollapsed && (
          <button
            onClick={handleToggle}
            aria-label="Collapse sidebar"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              "text-neutral-400 hover:text-neutral-700",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
              "transition-colors duration-150"
            )}
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed only) ────────────────────── */}
      {isCollapsed && (
        <div className="flex justify-center mt-2">
          <button
            onClick={handleToggle}
            aria-label="Expand sidebar"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              "text-neutral-400 hover:text-neutral-700",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
              "transition-colors duration-150"
            )}
          >
            <ChevronLeft size={15} className="rotate-180" />
          </button>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
        {!isCollapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600">
            Navigation
          </p>
        )}

        <ul className="space-y-0.5" role="list">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={isCollapsed} />
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

        {!isCollapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600">
            System
          </p>
        )}

        <ul className="space-y-0.5" role="list">
          {filteredSystemItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={isCollapsed} />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-neutral-200 dark:border-neutral-800",
          "bg-neutral-50 dark:bg-neutral-900",
          isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
          {user?.id_number?.charAt(0).toUpperCase() || "U"}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-neutral-900 bg-emerald-400" />
        </span>

        {!isCollapsed && (
          <div className="flex flex-col leading-tight overflow-hidden flex-1">
            <span className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
              {user?.id_number || "User"}
            </span>
            <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500 capitalize">
              {user?.role || "Guest"}
            </span>
          </div>
        )}

        {!isCollapsed && (
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              "text-neutral-400 hover:text-red-600",
              "hover:bg-red-50 dark:hover:bg-red-900/20",
              "dark:text-neutral-500 dark:hover:text-red-400",
              "transition-colors duration-150"
            )}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}