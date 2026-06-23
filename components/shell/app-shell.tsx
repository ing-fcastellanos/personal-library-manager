import * as React from "react";

import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";

/**
 * Responsive application shell.
 *
 * - Mobile (base): header on top, scrollable content, fixed bottom navigation.
 * - Desktop (md+): persistent sidebar on the left + header over the content column.
 *
 * Deep links / QR landing: each section is its own route (see NAV_ITEMS), so a QR
 * pointing at e.g. `/agregar` lands the user directly in "Agregar" with the matching
 * nav item active — no client-side redirect needed. Wrap your route segments with
 * this shell (e.g. in app/(app)/layout.tsx).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {/* pb-20 clears the fixed bottom nav on mobile; removed at md+ */}
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
