"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookCheck, Check, Loader2, X, AlertCircle, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { WriteCta } from "@/components/auth/write-cta";
import type { Reader } from "@/lib/types/reader";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import {
  todayIso,
  readingEventCreateBody,
  readingEventUpdateBody,
  type MarkTarget,
} from "./mark-read";
import { StarRating } from "./star-rating";

/**
 * Shared confirmation step for "marcar como leído" (#24, Claude Design handoff).
 * Given a resolved library book + the active reader, it captures the finish date
 * (default today), an optional start date, and — when the book has copies — which
 * copy the reading attributes to, plus an optional rating (1–5) and review (#25),
 * then creates a `finished` ReadingEvent via `POST /api/reading-events`. In `edit`
 * mode it preloads an existing event and saves via `PATCH /api/reading-events/:id`
 * instead. On create-success it shows an in-sheet confirmation; edit-success saves
 * inline (toast + close). Used by the `/leido` flow and the book detail.
 */
export function ConfirmReadingSheet({
  target,
  reader,
  onDone,
  onClose,
  onMarkAnother,
  mode = "create",
  event,
}: {
  target: MarkTarget;
  reader: Reader | null;
  onDone: (event: ReadingEvent) => void;
  onClose: () => void;
  /** Dedicated flow resets to the finder; omit in the book-detail entry. */
  onMarkAnother?: () => void;
  /** "edit" preloads `event` and PATCHes it instead of creating (#25). */
  mode?: "create" | "edit";
  event?: ReadingEvent;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = mode === "edit" && !!event;
  const [copies, setCopies] = React.useState<Copy[]>([]);
  const [copyId, setCopyId] = React.useState<string>(event?.copyId ?? "");
  const [dateFinished, setDateFinished] = React.useState(
    event?.dateFinished ?? todayIso(),
  );
  const [dateStarted, setDateStarted] = React.useState(
    event?.dateStarted ?? "",
  );
  const [rating, setRating] = React.useState<number | null>(
    event?.rating ?? null,
  );
  const [review, setReview] = React.useState(event?.review ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/books/${target.id}/copies`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: unknown) => {
        if (!alive) return;
        const list = Array.isArray(c) ? (c as Copy[]) : [];
        setCopies(list);
        // Preselect the only copy so single-copy books need no interaction —
        // without clobbering a copy already chosen (edit mode preloads one).
        if (list.length === 1) setCopyId((prev) => prev || list[0].id);
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
      const res = isEdit
        ? await fetch(`/api/reading-events/${event.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
              readingEventUpdateBody({
                dateFinished,
                dateStarted,
                rating,
                review,
              }),
            ),
          })
        : await fetch("/api/reading-events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
              readingEventCreateBody({
                readerId: reader.id,
                bookId: target.id,
                copyId: copyId || null,
                dateFinished,
                dateStarted,
                rating,
                review,
              }),
            ),
          });
      if (!res.ok) throw new Error("save failed");
      const saved = (await res.json()) as ReadingEvent;
      if (isEdit) {
        // Inline save: the book-detail row updates and the sheet closes.
        toast({ title: "Cambios guardados" });
        onDone(saved);
        onClose();
      } else {
        toast({ title: "¡Lectura registrada!" });
        setDone(true);
        onDone(saved);
      }
    } catch {
      // Keep the sheet open with the reader's input so they can retry.
      setError(
        isEdit
          ? "No se pudieron guardar los cambios. Probá de nuevo."
          : "No se pudo registrar la lectura. Probá de nuevo.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(20,16,11,0.42)]"
      />
      <div
        role="dialog"
        aria-label={isEdit ? "Editar lectura" : "Marcar como leído"}
        className="relative max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-popover p-4 px-[18px] pb-[calc(18px+env(safe-area-inset-bottom))] text-popover-foreground shadow-2xl animate-in slide-in-from-bottom sm:rounded-2xl"
      >
        <span
          className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-border sm:hidden"
          aria-hidden="true"
        />

        {done ? (
          <Success
            title={target.title}
            onViewBook={() => router.push(`/libros/${target.id}`)}
            onMarkAnother={onMarkAnother ?? onClose}
          />
        ) : (
          <>
            {/* header */}
            <div className="flex items-center gap-3">
              <CoverThumb url={target.coverUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {isEdit ? "Editar lectura" : "Marcar como leído"}
                </p>
                <p className="mt-0.5 truncate text-base font-bold leading-tight">
                  {target.title}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {target.authors[0] ?? ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancelar"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <X className="size-[17px]" aria-hidden="true" />
              </button>
            </div>

            {reader ? (
              <>
                {/* attributed reader */}
                <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                    {reader.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    Se registra para{" "}
                    <strong className="font-bold text-foreground">
                      {reader.name}
                    </strong>
                  </span>
                </div>

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
                      className="h-12 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
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

                  {/* rating (#25) — the StarRating owns its own radiogroup label */}
                  <div className="space-y-1.5">
                    <p className="text-[13px] font-semibold">
                      Calificación (opcional)
                    </p>
                    <StarRating value={rating} onChange={setRating} />
                  </div>

                  <Field id="review" label="Reseña (opcional)">
                    <textarea
                      id="review"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      rows={3}
                      placeholder="¿Qué te pareció?"
                      className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-[15px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </Field>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
                  >
                    <AlertCircle
                      className="mt-px size-[17px] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-semibold leading-snug">
                      {error}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="mt-[18px] inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-90"
                >
                  {busy ? (
                    <>
                      <Loader2
                        className="size-[18px] animate-spin"
                        aria-hidden="true"
                      />
                      {isEdit ? "Guardando…" : "Registrando…"}
                    </>
                  ) : isEdit ? (
                    <>
                      <Check className="size-[18px]" aria-hidden="true" />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <BookCheck className="size-[18px]" aria-hidden="true" />
                      Marcar como leído
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="mt-[18px] flex flex-col items-center gap-3.5 rounded-2xl border border-dashed border-border bg-card px-[18px] py-6 text-center">
                <span className="grid size-[52px] place-items-center rounded-full bg-muted text-muted-foreground">
                  <User className="size-6" aria-hidden="true" />
                </span>
                <p className="max-w-[240px] text-[14.5px] font-semibold leading-snug">
                  Iniciá sesión para registrar la lectura.
                </p>
                <WriteCta label="Iniciar sesión" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Success({
  title,
  onViewBook,
  onMarkAnother,
}: {
  title: string;
  onViewBook: () => void;
  onMarkAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-1.5 pb-1 pt-2 text-center">
      <span className="grid size-[72px] place-items-center rounded-full bg-success-bg text-success animate-in zoom-in">
        <Check className="size-9" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <p className="mt-[18px] text-xl font-bold tracking-tight">
        ¡Lectura registrada!
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        «{title}» quedó marcado como leído.
      </p>
      <div className="mt-[22px] flex w-full gap-2.5">
        <button
          type="button"
          onClick={onMarkAnother}
          className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl border bg-card text-[14.5px] font-bold hover:bg-accent"
        >
          Marcar otro
        </button>
        <button
          type="button"
          onClick={onViewBook}
          className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-primary text-[14.5px] font-bold text-primary-foreground"
        >
          Ver libro
        </button>
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
    <span className="relative h-[70px] w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
      <span
        className="absolute inset-y-0 left-0 w-[3px] bg-black/15"
        aria-hidden="true"
      />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
