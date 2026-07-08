"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Library, Printer } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "./qr-code";
import { scanUrl } from "./scan-url";

/**
 * Per-shelf QR (#33): reuses #31's QR-rendering + print-tile pattern for a
 * single shelf, opened from the Shelves Manager. The print tile renders via
 * a portal to `document.body` (design.md Decision 2) — `DialogContent` must
 * itself be `print:hidden` so the dialog chrome never prints, and a
 * `display:none` ancestor can't be un-hidden by a `print:block` descendant,
 * so the tile can't live inside it.
 */
export function ShelfQrDialog({
  shelfId,
  shelfName,
  trigger,
}: {
  shelfId: string;
  shelfName: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState<string | null>(null);

  // Syncs `origin` from an external system (window.location, unavailable
  // during SSR) — the intended use of an effect, not a cascading-render bug.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const url = origin ? scanUrl("add", origin, shelfId) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-sm print:hidden">
          <DialogHeader>
            <DialogTitle>{shelfName}</DialogTitle>
            <DialogDescription>
              Escaneá para agregar un libro directamente a este estante.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-2">
            <div className="grid size-[170px] shrink-0 place-items-center rounded-xl border bg-white p-2">
              {url && <QrCode value={url} size={152} />}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="size-4" aria-hidden="true" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open &&
        url &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="hidden print:flex" style={{ color: "#111111" }}>
            <div
              className="flex items-center gap-[0.8cm] break-inside-avoid rounded-[2px] border-[1.5px]"
              style={{ borderColor: "#111111", padding: "0.7cm 0.9cm" }}
            >
              <div
                className="shrink-0"
                style={{ width: "4.2cm", height: "4.2cm" }}
              >
                <QrCode
                  value={url}
                  size={480}
                  className=""
                  style={{ width: "4.2cm", height: "4.2cm" }}
                />
              </div>
              <div className="flex flex-col gap-[0.28cm]">
                <span
                  className="grid place-items-center rounded-[0.18cm] border"
                  style={{
                    width: "1cm",
                    height: "1cm",
                    borderColor: "#111111",
                  }}
                >
                  <Library className="size-4" aria-hidden="true" />
                </span>
                <span
                  className="font-bold leading-tight tracking-tight"
                  style={{ fontSize: "22pt" }}
                >
                  {shelfName}
                </span>
                <span style={{ fontSize: "9pt", color: "#555555" }}>
                  Escaneá con la cámara para abrir en tu teléfono
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
