"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  LayoutGrid,
  PlusCircle,
  BookMarked,
  Printer,
} from "lucide-react";
import { QrCode } from "./qr-code";
import { SCAN_ACTIONS, scanUrl, type ScanAction } from "./scan-url";

const ACTION_ICONS: Record<ScanAction["action"], typeof LayoutGrid> = {
  dashboard: LayoutGrid,
  add: PlusCircle,
  finish: BookMarked,
};

/**
 * QR print sheet (#31, Claude Design handoff): two independent renderings of
 * the same three action QRs — an on-screen review grid (app chrome visible)
 * and a print-only sheet (`hidden print:block`, everything else `print:hidden`)
 * laid out in physical units (cm) as separate cuttable tiles. No auth
 * required — printing is a read-only, non-attributed setup action, like the
 * rest of `/ajustes`. Renders on mount so "Imprimir" always finds fully-drawn
 * canvases (design.md Decision 5); per-shelf QRs are a follow-up (#33).
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

  const urls = SCAN_ACTIONS.map(({ action, label }) => ({
    action,
    label,
    url: origin ? scanUrl(action, origin) : null,
    Icon: ACTION_ICONS[action],
  }));

  return (
    <>
      {/* ===================== Screen view ===================== */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-start justify-between gap-3">
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

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {urls.map(({ action, label, url, Icon }) => (
            <div
              key={action}
              className="flex flex-col items-center gap-3.5 rounded-2xl border bg-card p-[18px]"
            >
              <div className="grid size-[170px] shrink-0 place-items-center rounded-xl border bg-white p-2">
                {url && <QrCode value={url} size={152} />}
              </div>
              <div className="flex items-center gap-2">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-accent/70 text-accent-foreground">
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
                <span className="text-base font-bold tracking-tight">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/ajustes"
          className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-semibold text-primary hover:underline"
        >
          <ChevronLeft className="size-[15px]" aria-hidden="true" />
          Volver a Ajustes
        </Link>
      </div>

      {/* ===================== Print-only sheet ===================== */}
      <div
        className="hidden print:flex print:flex-col print:gap-[0.7cm]"
        style={{ color: "#111111" }}
      >
        {urls.map(({ action, label, url, Icon }) => (
          <div
            key={action}
            className="flex items-center gap-[0.8cm] break-inside-avoid rounded-[2px] border-[1.5px] p-0"
            style={{
              borderColor: "#111111",
              padding: "0.7cm 0.9cm",
            }}
          >
            <div
              className="shrink-0"
              style={{ width: "4.2cm", height: "4.2cm" }}
            >
              {url && (
                <QrCode
                  value={url}
                  size={480}
                  className=""
                  style={{ width: "4.2cm", height: "4.2cm" }}
                />
              )}
            </div>
            <div className="flex flex-col gap-[0.28cm]">
              <span
                className="grid place-items-center rounded-[0.18cm] border"
                style={{ width: "1cm", height: "1cm", borderColor: "#111111" }}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span
                className="font-bold leading-tight tracking-tight"
                style={{ fontSize: "22pt" }}
              >
                {label}
              </span>
              <span style={{ fontSize: "9pt", color: "#555555" }}>
                Escaneá con la cámara para abrir en tu teléfono
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
