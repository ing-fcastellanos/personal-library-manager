"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, ChevronLeft, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CoverPreview } from "@/components/books/enrich-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmReadingSheet } from "@/components/reading/confirm-reading-sheet";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent, ReadingStatus } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/**
 * Read-only book detail (#17, Claude Design handoff). Metadata + copies +
 * per-reader reading status with an Edit action. Composes existing endpoints (no
 * new backend). "Marcar como leído" / "Agregar ejemplar" are disabled (other
 * milestones). Recreated from the design prototype over the `ui` primitives.
 */

const STATUS_LABEL: Record<ReadingStatus, string> = {
  finished: "Leído",
  reading: "Leyendo",
  abandoned: "Abandonado",
};

function statusClasses(s?: ReadingStatus): string {
  if (s === "finished") return "bg-success/15 text-success";
  if (s === "reading") return "bg-accent text-accent-foreground";
  if (s === "abandoned") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

export function BookDetail({ bookId }: { bookId: string }) {
  const { reader } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [book, setBook] = React.useState<Book | null>(null);
  const [copies, setCopies] = React.useState<Copy[]>([]);
  const [events, setEvents] = React.useState<ReadingEvent[]>([]);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [markOpen, setMarkOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    // A failed fetch (e.g. a 500 returning `{"error":"internal"}`) must not crash
    // the page: only accept ok responses, and coerce list endpoints to arrays so
    // the book still renders while copies/events/readers degrade to empty.
    const okJson = (r: Response) => (r.ok ? r.json() : null);
    const asArray = <T,>(v: unknown): T[] =>
      Array.isArray(v) ? (v as T[]) : [];
    Promise.all([
      fetch(`/api/books/${bookId}`).then(okJson),
      fetch(`/api/books/${bookId}/copies`).then(okJson),
      fetch(`/api/books/${bookId}/reading-events`).then(okJson),
      fetch(`/api/readers`).then(okJson),
    ])
      .then(([b, c, e, rd]) => {
        if (!alive) return;
        setBook((b as Book | null) ?? null);
        setCopies(asArray<Copy>(c));
        setEvents(asArray<ReadingEvent>(e));
        setReaders(asArray<Reader>(rd));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-40 w-28 shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <h2 className="text-lg font-bold">No encontramos este libro</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Puede que se haya quitado de la biblioteca o que el enlace sea
          incorrecto.
        </p>
        <Button className="mt-6 gap-2" asChild>
          <Link href="/catalogo">
            <ChevronLeft className="size-4" />
            Volver al catálogo
          </Link>
        </Button>
      </div>
    );
  }

  // Latest status per reader (events arrive newest-first from the endpoint).
  const statusByReader = new Map<string, ReadingStatus>();
  for (const e of events)
    if (!statusByReader.has(e.readerId))
      statusByReader.set(e.readerId, e.status);

  const meta = [
    ["Editorial", book.publisher],
    ["Año", book.publishedYear],
    ["ISBN", book.isbn13],
    ["Idioma", book.language],
    ["Páginas", book.pageCount],
  ].filter(([, v]) => v != null && v !== "") as [string, string | number][];

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {/* Header */}
      <div className="flex gap-4 sm:gap-5">
        <CoverPreview
          url={book.coverUrl ?? undefined}
          title={book.title}
          className="h-40 w-28 shrink-0 sm:h-44 sm:w-32"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight tracking-tight">
                {book.title}
              </h2>
              {book.subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {book.subtitle}
                </p>
              )}
              <p className="mt-2 text-sm font-semibold">
                {book.authors.join(", ")}
              </p>
            </div>
            <Button className="shrink-0 gap-1.5" asChild>
              <Link href={`/libros/${book.id}/editar`}>
                <Pencil className="size-3.5" />
                Editar
              </Link>
            </Button>
          </div>
          {meta.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {meta.map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </span>
                  <span className="text-xs font-semibold">{v}</span>
                </div>
              ))}
            </div>
          )}
          {(book.categories ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {book.categories.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Descripción */}
      {book.description && (
        <section>
          <SectionTitle>Descripción</SectionTitle>
          <p className="text-sm leading-relaxed">{book.description}</p>
        </section>
      )}

      {/* Ejemplares */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle className="mb-0">
            Ejemplares · {copies.length}
          </SectionTitle>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Próximamente"
            className="gap-1.5 border-dashed"
          >
            Agregar
          </Button>
        </div>
        {copies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ejemplares.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {copies.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {c.shelfId ? "En estante" : "Sin estante"}
                  </span>
                  {c.condition && (
                    <Badge variant="secondary">{c.condition}</Badge>
                  )}
                </div>
                {c.acquiredAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adquirido {c.acquiredAt}
                  </p>
                )}
                {c.notes && (
                  <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed">
                    {c.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lectura */}
      <section>
        <SectionTitle>Lectura</SectionTitle>
        <div className="overflow-hidden rounded-xl border bg-card">
          {readers.map((r, i) => {
            const s = statusByReader.get(r.id);
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 p-3.5",
                  i < readers.length - 1 && "border-b",
                )}
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback>
                    {r.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-semibold">{r.name}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                    statusClasses(s),
                  )}
                >
                  {s === "finished" ? (
                    <Check className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {s ? STATUS_LABEL[s] : "Sin empezar"}
                </span>
              </div>
            );
          })}
          <div className="bg-background p-3">
            <Button
              size="sm"
              onClick={() => setMarkOpen(true)}
              className="w-full gap-1.5"
            >
              <Check className="size-3.5" />
              Marcar como leído
            </Button>
          </div>
        </div>
      </section>

      {markOpen && (
        <ConfirmReadingSheet
          target={{
            id: book.id,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverUrl ?? null,
            isbn13: book.isbn13 ?? null,
          }}
          reader={reader}
          onClose={() => setMarkOpen(false)}
          onDone={(event) => {
            // Optimistically surface the new "Leído" status without a full reload
            // (and without depending on the reading-events index, #24 resilience).
            setEvents((prev) => [event, ...prev]);
            setMarkOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "mb-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}
