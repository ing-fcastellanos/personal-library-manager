import {
  LayoutGrid,
  PlusCircle,
  Heart,
  BookMarked,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type SectionId =
  "dashboard" | "add" | "wishlist" | "read" | "catalog" | "settings";

export interface NavItem {
  id: SectionId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra path prefixes that also mark this item active (e.g. a sibling route). */
  altPaths?: string[];
}

/**
 * Single source of truth for the 6 shell sections (mobile + desktop). "Deseos"
 * fronts both wishlist views: `/deseos` (quiero leer) and `/comprar` (comprar) —
 * one entry with in-page tabs, keeping the mobile bottom nav readable (design D1).
 */
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutGrid },
  { id: "add", label: "Agregar", href: "/agregar", icon: PlusCircle },
  {
    id: "wishlist",
    label: "Deseos",
    href: "/deseos",
    icon: Heart,
    altPaths: ["/comprar"],
  },
  { id: "read", label: "Leído", href: "/leido", icon: BookMarked },
  { id: "catalog", label: "Catálogo", href: "/catalogo", icon: Library },
  { id: "settings", label: "Ajustes", href: "/ajustes", icon: Settings },
];

export const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: "Dashboard",
  add: "Agregar",
  wishlist: "Deseos",
  read: "Leído",
  catalog: "Catálogo",
  settings: "Ajustes",
};

/** Whether `pathname` falls under a nav item's route (its href or any altPath). */
export function navItemActive(item: NavItem, pathname: string): boolean {
  const under = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return under(item.href) || (item.altPaths ?? []).some(under);
}
