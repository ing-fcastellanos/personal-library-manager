"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <span aria-hidden>📚</span> Library
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
