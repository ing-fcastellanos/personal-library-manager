import {
  LayoutGrid,
  PlusCircle,
  BookMarked,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type SectionId = "dashboard" | "add" | "read" | "catalog" | "settings";

export interface NavItem {
  id: SectionId;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Single source of truth for the 5 shell sections (mobile + desktop). */
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutGrid },
  { id: "add", label: "Agregar", href: "/agregar", icon: PlusCircle },
  { id: "read", label: "Leído", href: "/leido", icon: BookMarked },
  { id: "catalog", label: "Catálogo", href: "/catalogo", icon: Library },
  { id: "settings", label: "Ajustes", href: "/ajustes", icon: Settings },
];

export const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: "Dashboard",
  add: "Agregar",
  read: "Leído",
  catalog: "Catálogo",
  settings: "Ajustes",
};
