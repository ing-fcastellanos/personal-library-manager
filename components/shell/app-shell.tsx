import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Responsive app shell (ADR-0010): sidebar on desktop, bottom-nav on mobile.
 * Children render directly, so action routes (e.g. /add) land without going
 * through home — supports the QR deep-links (#32).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <span className="font-semibold md:hidden">📚 Library</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
