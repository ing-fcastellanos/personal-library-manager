"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AuthControl } from "@/components/auth/auth-control";
import { NAV_ITEMS } from "@/components/shell/nav-items";

function useCurrentTitle() {
  const pathname = usePathname();
  const match = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  return match?.label ?? "Mi biblioteca";
}

/**
 * App header. Sticky on mobile; spans the content column on desktop.
 * Holds the page title, theme toggle and account avatar.
 */
export function Header() {
  const title = useCurrentTitle();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:h-16 md:px-6">
      <h1 className="flex-1 truncate text-lg font-bold tracking-tight md:text-xl">
        {title}
      </h1>
      <ThemeToggle />
      <AuthControl />
    </header>
  );
}
