import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems, filterMenuByRole } from "@/config/menuItems";
import { useAuth } from "@/contexts/AuthContext";
import { getAlerts } from "@/services/api";

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const [alertSummary, setAlertSummary] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleMenuItems = filterMenuByRole(menuItems, user?.role);
  const isSuperAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAlerts({ params: { limit: 1 } });
        if (res.data?.status === 'success') {
          setAlertSummary(res.data.data?.summary || null);
        }
      } catch {
        // silent fail — badge is non-critical
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
<aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "transition-all duration-200 ease-out",
          collapsed ? "w-[64px]" : "w-[260px]",
          "bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)]",
          // Mobile: hidden by default, shown when mobileOpen
          "max-lg:-translate-x-full",
          "max-lg:data-[mobile-open=true]:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
        data-mobile-open={mobileOpen}
      >
{/* ── Brand ─────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center",
            "border-b border-[var(--border-sidebar)]",
            collapsed ? "justify-center px-0" : "justify-between px-4"
          )}
        >
         <Link
           to="/"
           onClick={handleNavClick}
           className={cn(
             "flex items-center gap-2.5 overflow-hidden",
             collapsed && "justify-center"
           )}
         >
           <img
             src="/8th_ARCEN.png"
             alt="Air Force Logo"
             className={cn(
               "h-9 w-9 shrink-0",
               collapsed && "mx-auto"
             )}
           />
{!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[15px] font-black tracking-[0.12em] text-[var(--text-on-sidebar)] leading-none">
                A R I E S - 8
              </span>
              <span className="mt-[3px] text-[5px] font-medium tracking-[0.06em] uppercase text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] truncate leading-none">
                Air Force Reservist Information, Engagement, and Support System
              </span>
            </div>
          )}
</Link>
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
{!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-on-sidebar)]">
              Navigation
            </p>
          )}

          <ul className="space-y-0.5" role="list">
            {visibleMenuItems.map((item) => (
              <li key={item.path}>
                <SidebarItem item={item} isCollapsed={collapsed} onNavClick={handleNavClick} />
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-[var(--border-sidebar)]" />

          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-on-sidebar)]">
              System
            </p>
          )}

<ul className="space-y-0.5" role="list">
          <li>
<Link
              to="/alerts"
              onClick={handleNavClick}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                "text-sm font-medium leading-none tracking-[-0.01em]",
                "transition-all duration-200 ease-out",
                "text-[var(--text-on-sidebar)] hover:text-[color-mix(in_srgb,var(--text-on-sidebar)_120%,transparent)] hover:bg-[var(--bg-hover)]",
                "hover:scale-[1.015]",
                collapsed && "justify-center px-0"
              )}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--text-on-sidebar)] group-hover:text-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]">
                <Bell size={17} strokeWidth={1.8} />
              </span>
              {!collapsed && <span className="truncate">Alerts</span>}
              {!collapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className={cn(
                  "ml-auto inline-flex min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                  alertSummary.critical > 0
                    ? "bg-red-600 text-white"
                    : "bg-amber-500 text-white"
                )}>
                  {alertSummary.critical || alertSummary.unread}
                </span>
              )}
              {collapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Link>
          </li>
          {isSuperAdmin && (
        <li>
          <SidebarItem
            item={{ name: "Audit Logs", path: "/audit-logs", icon: History, description: "System change history" }}
            isCollapsed={collapsed}
            onNavClick={handleNavClick}
          />
        </li>
      )}
      {isSuperAdmin && (
        <li>
          <SidebarItem
            item={{ name: "Settings", path: "/settings", icon: Settings, description: "User & system management" }}
            isCollapsed={collapsed}
            onNavClick={handleNavClick}
          />
        </li>
      )}
        </ul>
      </nav>

{/* ── User footer ───────────────────────────────────────── */}
      <div
        ref={dropdownRef}
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-[var(--border-sidebar)]",
          "bg-[var(--border-sidebar)]",
          collapsed ? "justify-center gap-2 p-3" : "gap-3 px-4 py-3",
          "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        )}
        onClick={() => setShowProfileDropdown(prev => !prev)}
      >
        <div className="relative">
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm"
            )}
          >
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'CO'}
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-400" />
          </span>

{showProfileDropdown && (
            <div
              className={cn(
                "absolute bottom-0 top-auto",
                collapsed ? "left-14 ml-2" : "left-full ml-2",
                "min-w-[200px] rounded-lg",
                "bg-[var(--bg-surface)] border border-[var(--border)]",
                "shadow-lg z-50 py-2 overflow-hidden"
              )}
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {user?.role ? user.role.replace('admin_', 'Admin ').replace('_', ' ') : '—'}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowProfileDropdown(false); navigate('/profile'); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <User size={16} />
                My Profile
              </button>
              <div className="border-t border-[var(--border)] my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); setShowProfileDropdown(false); logout(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--accent-danger)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex flex-1 flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-[var(--text-on-sidebar)]">
              {user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]">
              {user?.role ? user.role.replace('admin_', 'Admin ').replace('_', ' ') : '—'}
            </span>
          </div>
        )}
      </div>
    </aside>
   );
 }
