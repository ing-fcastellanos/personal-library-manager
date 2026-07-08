"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/shell/nav-items";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Desktop sidebar (md+). Same 5 sections as the mobile bottom nav.
 * Hidden below md, where BottomNav takes over.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card p-3 md:flex print:hidden">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2.5 rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen className="size-4" aria-hidden="true" />
        </span>
        <span className="text-base font-bold tracking-tight">
          Mi biblioteca
        </span>
      </Link>

      <nav aria-label="Navegación principal">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
