import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  MapPin,
  Dumbbell,
  ClipboardList,
  BarChart3,
  Package,
  FileText,
  Megaphone,
  Bell,
  Settings,
} from "lucide-react";

// Menu items with role requirements
// admin - only admins can access
// reservist - only reservists can access
// If no roles specified, both roles can access (for backward compatibility during transition)
export const menuItems = [
  // Admin-only items
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & summary",
    roles: ["admin"],
  },
  {
    name: "Reservists",
    path: "/reservists",
    icon: Users,
    description: "Manage reservists",
    roles: ["admin"],
  },
  {
    name: "Groups & Units",
    path: "/groups",
    icon: Users,
    description: "Teams & units",
    roles: ["admin"],
  },
  {
    name: "Areas",
    path: "/areas",
    icon: MapPin,
    description: "Location management",
    roles: ["admin"],
  },
  {
    name: "Readiness & Analytics",
    path: "/analytics",
    icon: BarChart3,
    description: "Performance data",
    roles: ["admin"],
  },
  {
    name: "Logistics & Supplies",
    path: "/logistics",
    icon: Package,
    description: "Inventory & resources",
    roles: ["admin"],
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
    description: "Generate reports",
    roles: ["admin"],
  },
  // Shared items (both roles)
  {
    name: "Trainings & Activities",
    path: "/trainings",
    icon: Dumbbell,
    description: "Sessions & programs",
    roles: ["admin", "reservist"],
  },
  {
    name: "Attendance",
    path: "/attendance",
    icon: ClipboardList,
    description: "Track presence",
    roles: ["admin", "reservist"],
  },
  // Reservist-only items
  {
    name: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    description: "Latest updates",
    roles: ["reservist"],
  },
];

// System items (always visible when authenticated)
export const systemMenuItems = [
  {
    name: "Alerts",
    path: "/alerts",
    icon: Bell,
    description: "Notifications",
    roles: ["admin", "reservist"],
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences",
    roles: ["admin", "reservist"],
  },
];
