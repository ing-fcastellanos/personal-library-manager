"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, PlusCircle, BookMarked, Printer } from "lucide-react";
import { QrCode } from "./qr-code";
import { SCAN_ACTIONS, scanUrl, type ScanAction } from "./scan-url";

const ACTION_ICONS: Record<ScanAction["action"], typeof LayoutGrid> = {
  dashboard: LayoutGrid,
  add: PlusCircle,
  finish: BookMarked,
};

/**
 * Printable sheet of the three action QR codes (#31): dashboard, agregar,
 * registrar leído. No auth required — printing a sheet is a read-only,
 * non-attributed setup action (like the rest of `/ajustes`). Renders on
 * mount so "Imprimir" always finds fully-drawn canvases (design.md
 * Decision 5); per-shelf QRs are a separate follow-up (#33).
 */
export function QrPrintSheet() {
  const [origin, setOrigin] = React.useState<string | null>(null);

  // Syncs `origin` from an external system (window.location, unavailable
  // during SSR) — the intended use of an effect, not a cascading-render bug.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            QR para el librero
          </h1>
          <p className="text-muted-foreground">
            Imprimí y pegá junto a tu biblioteca.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Printer className="size-[18px]" aria-hidden="true" />
          Imprimir
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-[1cm]">
        {SCAN_ACTIONS.map(({ action, label }) => {
          const Icon = ACTION_ICONS[action];
          return (
            <div
              key={action}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center print:break-inside-avoid print:rounded-none print:border-2 print:border-foreground print:p-[0.5cm]"
            >
              {origin && <QrCode value={scanUrl(action, origin)} size={160} />}
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/ajustes"
        className="inline-block text-sm font-semibold text-primary hover:underline print:hidden"
      >
        Volver a Ajustes
      </Link>
    </div>
  );
}
