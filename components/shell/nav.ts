import {
  LayoutDashboard,
  BookPlus,
  BookCheck,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Single source for the app's 5 sections (used by Sidebar and BottomNav). */
export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/add", label: "Agregar", icon: BookPlus },
  { href: "/mark-read", label: "Leído", icon: BookCheck },
  { href: "/catalog", label: "Catálogo", icon: Library },
  { href: "/settings", label: "Ajustes", icon: Settings },
];
