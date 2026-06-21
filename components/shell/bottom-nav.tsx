"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
