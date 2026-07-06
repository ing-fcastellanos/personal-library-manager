"use client";

import * as React from "react";
import { BookCheck, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { WriteCta } from "@/components/auth/write-cta";
import type { Reader } from "@/lib/types/reader";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { todayIso, readingEventCreateBody, type MarkTarget } from "./mark-read";

/**
 * Shared confirmation step for "marcar como leído" (#24). Given a resolved
 * library book + the active reader, it captures the finish date (default today),
 * an optional start date, and — when the book has copies — which copy the reading
 * attributes to, then creates a `finished` ReadingEvent via `POST /api/reading-events`.
 * Used by both entry points: the dedicated `/leido` flow and the book detail.
 * Rating/review are intentionally out of scope (#25).
 */
export function ConfirmReadingSheet({
  target,
  reader,
  onDone,
  onClose,
}: {
  target: MarkTarget;
  reader: Reader | null;
  onDone: (event: ReadingEvent) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copies, setCopies] = React.useState<Copy[]>([]);
  const [copyId, setCopyId] = React.useState<string>("");
  const [dateFinished, setDateFinished] = React.useState(todayIso());
  const [dateStarted, setDateStarted] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/books/${target.id}/copies`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: unknown) => {
        if (!alive) return;
        const list = Array.isArray(c) ? (c as Copy[]) : [];
        setCopies(list);
        // Preselect the only copy so single-copy books need no interaction.
        if (list.length === 1) setCopyId(list[0].id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [target.id]);

  async function submit() {
    if (!reader) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reading-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          readingEventCreateBody({
            readerId: reader.id,
            bookId: target.id,
            copyId: copyId || null,
            dateFinished,
            dateStarted,
          }),
        ),
      });
      if (!res.ok) throw new Error("create failed");
      const event = (await res.json()) as ReadingEvent;
      toast({ title: "Lectura registrada" });
      onDone(event);
    } catch {
      // Keep the sheet open with the reader's input so they can retry.
      setError("No se pudo registrar la lectura. Probá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-label="Marcar como leído"
        className="relative w-full max-w-md rounded-t-[20px] bg-card p-4 text-card-foreground shadow-2xl animate-in slide-in-from-bottom sm:rounded-2xl"
      >
        <span
          className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-border sm:hidden"
          aria-hidden="true"
        />

        {/* book header */}
        <div className="flex items-center gap-3">
          <CoverThumb url={target.coverUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight">
              {target.title}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">
              {target.authors[0] ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancelar"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        {reader ? (
          <>
            <div className="mt-4 space-y-3.5">
              <Field id="date-finished" label="Fecha de fin">
                <input
                  id="date-finished"
                  type="date"
                  value={dateFinished}
                  max={todayIso()}
                  onChange={(e) => setDateFinished(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>

              <Field id="date-started" label="Fecha de inicio (opcional)">
                <input
                  id="date-started"
                  type="date"
                  value={dateStarted}
                  max={dateFinished || todayIso()}
                  onChange={(e) => setDateStarted(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>

              {copies.length > 0 && (
                <Field id="copy" label="Ejemplar">
                  <select
                    id="copy"
                    value={copyId}
                    onChange={(e) => setCopyId(e.target.value)}
                    className="h-12 w-full appearance-none rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sin especificar</option>
                    {copies.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        {c.shelfId ? "En estante" : "Sin estante"}
                        {copies.length > 1 ? ` · #${i + 1}` : ""}
                        {c.condition ? ` · ${c.condition}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 text-[13px] font-semibold text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-4 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? (
                <Loader2
                  className="size-[18px] animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <BookCheck className="size-[18px]" aria-hidden="true" />
              )}
              Marcar como leído
            </button>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              Iniciá sesión para registrar la lectura.
            </p>
            <WriteCta label="Registrar lectura" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function CoverThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
