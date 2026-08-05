"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  ChevronLeft,
  Check,
  ExternalLink,
  Home,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Plus,
  Book as BookIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CoverPreview } from "@/components/books/enrich-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { SignInPrompt } from "@/components/auth/sign-in-prompt";
import { buildNextParam } from "@/lib/auth/next-param";
import { ConfirmReadingSheet } from "@/components/reading/confirm-reading-sheet";
import { StarRating } from "@/components/reading/star-rating";
import { ReadingEventCard } from "@/components/reading/reading-event-card";
import { formatReadingDate } from "@/components/reading/history";
import { goodreadsSearchUrl } from "@/components/reading/goodreads";
import { AddToWishlistButton } from "@/components/wishlist/add-to-wishlist-button";
import { LendDialog } from "@/components/loans/lend-dialog";
import { borrowerSuggestions } from "@/components/loans/borrowers";
import {
  initials as borrowerInitials,
  dueLabel,
} from "@/components/loans/format";
import { isOverdue } from "@/services/loans/views";
import { SeriesDialog } from "@/components/series/series-dialog";
import { LinkSeriesDialog } from "@/components/series/link-series-dialog";
import { VolumeRow } from "@/components/series/volume-row";
import { seriesForBook } from "@/services/series/views";
import { ActivityRow } from "@/components/audit/activity-row";
import { fetchBookActivity } from "@/components/audit/activity";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent, ReadingStatus } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import type { Loan } from "@/lib/types/loan";
import type { Series } from "@/lib/types/series";
import type { AuditLogEntry } from "@/lib/types/audit-log";

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

export function BookDetail({ bookId }: { bookId: string }) {
  const { reader } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [book, setBook] = React.useState<Book | null>(null);
  const [copies, setCopies] = React.useState<Copy[]>([]);
  const [events, setEvents] = React.useState<ReadingEvent[]>([]);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [seriesList, setSeriesList] = React.useState<Series[]>([]);
  const [sheet, setSheet] = React.useState<
    { mode: "create" } | { mode: "edit"; event: ReadingEvent } | null
  >(null);
  const [lendFor, setLendFor] = React.useState<Copy | null>(null);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = React.useState(false);
  const [linkSeriesOpen, setLinkSeriesOpen] = React.useState(false);
  const [activity, setActivity] = React.useState<AuditLogEntry[]>([]);

  React.useEffect(() => {
    let alive = true;
    // A failed fetch (e.g. a 500 returning `{"error":"internal"}`) must not crash
    // the page: only accept ok responses, and coerce list endpoints to arrays so
    // the book still renders while copies/events/readers/loans degrade to empty.
    const okJson = (r: Response) => (r.ok ? r.json() : null);
    const asArray = <T,>(v: unknown): T[] =>
      Array.isArray(v) ? (v as T[]) : [];
    Promise.all([
      fetch(`/api/books/${bookId}`).then(okJson),
      fetch(`/api/books/${bookId}/copies`).then(okJson),
      fetch(`/api/books/${bookId}/reading-events`).then(okJson),
      fetch(`/api/readers`).then(okJson),
      fetch(`/api/loans`).then(okJson),
      fetch(`/api/series`).then(okJson),
    ])
      .then(([b, c, e, rd, ln, sr]) => {
        if (!alive) return;
        setBook((b as Book | null) ?? null);
        setCopies(asArray<Copy>(c));
        setEvents(asArray<ReadingEvent>(e));
        setReaders(asArray<Reader>(rd));
        setLoans(asArray<Loan>(ln));
        setSeriesList(asArray<Series>(sr));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookId]);

  React.useEffect(() => {
    // The household's mental model is "what happened to this book" — its own
    // edits plus its copies' and reading events' (#40, design D5).
    if (!book) return;
    let alive = true;
    fetchBookActivity(
      book.id,
      copies.map((c) => c.id),
      events.map((e) => e.id),
    ).then((a) => {
      if (alive) setActivity(a);
    });
    return () => {
      alive = false;
    };
  }, [book, copies, events]);

  function openPrestar(copy: Copy) {
    if (!reader) {
      setSignInOpen(true);
      return;
    }
    setLendFor(copy);
  }

  async function devolver(loan: Loan) {
    if (!reader) {
      setSignInOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/loans/${loan.id}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ returnedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as Loan;
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast({ title: `«${updated.bookTitle}» volvió a casa` });
    } catch {
      toast({
        title: "No se pudo registrar la devolución",
        variant: "destructive",
      });
    }
  }

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

  // Latest event per reader (events arrive newest-first from the endpoint); it
  // carries status plus the rating/review to display and edit (#25).
  const eventByReader = new Map<string, ReadingEvent>();
  for (const e of events)
    if (!eventByReader.has(e.readerId)) eventByReader.set(e.readerId, e);

  const readerName = new Map<string, string>();
  readers.forEach((r) => readerName.set(r.id, r.name));

  const meta = [
    ["Editorial", book.publisher],
    ["Año", book.publishedYear],
    ["ISBN", book.isbn13],
    ["Idioma", book.language],
    ["Páginas", book.pageCount],
  ].filter(([, v]) => v != null && v !== "") as [string, string | number][];

  const mySeries = seriesForBook(book.id, seriesList);
  const sortedVolumes = mySeries
    ? [...mySeries.volumes].sort((a, b) => a.position - b.position)
    : [];

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
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <AddToWishlistButton
                snapshot={{
                  bookTitle: book.title,
                  bookAuthors: book.authors,
                  isbn13: book.isbn13,
                  coverUrl: book.coverUrl,
                }}
                addedVia="catalog"
                bookId={book.id}
                ownedCopies={copies.length}
                label="A deseos"
              />
              <Button variant="outline" className="gap-1.5" asChild>
                <a
                  href={goodreadsSearchUrl(book.isbn13, book.title)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ver en Goodreads (se abre en una pestaña nueva)"
                >
                  <ExternalLink className="size-3.5" />
                  Ver en Goodreads
                </a>
              </Button>
              <Button className="gap-1.5" asChild>
                <Link href={`/libros/${book.id}/editar`}>
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
              </Button>
            </div>
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
            {copies.map((c) => {
              const openLoan = loans.find(
                (l) => l.copyId === c.id && !l.returnedAt,
              );
              const today = new Date().toISOString().slice(0, 10);
              const overdue = openLoan ? isOverdue(openLoan, today) : false;
              return (
                <div key={c.id} className="rounded-xl border bg-card p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {c.shelfId ? "En estante" : "Sin estante"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.condition && (
                        <Badge variant="secondary">{c.condition}</Badge>
                      )}
                      <Badge variant={overdue ? "destructive" : "secondary"}>
                        {openLoan ? (
                          overdue ? (
                            <AlertTriangle aria-hidden="true" />
                          ) : (
                            <ArrowUpRight aria-hidden="true" />
                          )
                        ) : (
                          <Home aria-hidden="true" />
                        )}
                        {openLoan
                          ? overdue
                            ? "Vencido"
                            : "Prestado"
                          : "En casa"}
                      </Badge>
                    </div>
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

                  {openLoan ? (
                    <div className="mt-3 rounded-lg border bg-background p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback>
                            {borrowerInitials(openLoan.borrowerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-muted-foreground">
                            Prestado a
                          </p>
                          <p className="truncate text-sm font-bold">
                            {openLoan.borrowerName}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" aria-hidden="true" />
                          Prestado desde el{" "}
                          {formatReadingDate(openLoan.loanedAt)}
                        </span>
                        {openLoan.dueDate && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              overdue && "font-bold text-destructive",
                            )}
                          >
                            <Clock className="size-3.5" aria-hidden="true" />
                            {dueLabel(openLoan.dueDate, overdue, today)}
                          </span>
                        )}
                      </div>
                      {openLoan.notes && (
                        <p className="mt-2.5 rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">
                          {openLoan.notes}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="mt-3 h-11 w-full"
                        onClick={() => devolver(openLoan)}
                        aria-label={`Marcar «${book?.title ?? ""}» como devuelto`}
                      >
                        Devolver
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="mt-3 h-11 w-full gap-1.5"
                      onClick={() => openPrestar(c)}
                      aria-label={`Prestar «${book?.title ?? ""}» · ${
                        c.shelfId ? "En estante" : "Sin estante"
                      }`}
                    >
                      <ArrowUpRight aria-hidden="true" />
                      Prestar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Serie (#38) */}
      <section>
        {mySeries ? (
          <>
            <div className="mb-3 flex items-end justify-between gap-2">
              <SectionTitle className="mb-0">
                Serie · {mySeries.name}
              </SectionTitle>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setSeriesDialogOpen(true)}
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
            </div>
            <ul className="flex flex-col gap-2.5">
              {sortedVolumes.map((v) => (
                <VolumeRow
                  key={v.position}
                  volume={v}
                  highlight={v.bookId === book.id}
                />
              ))}
            </ul>
          </>
        ) : (
          <>
            <SectionTitle>Serie</SectionTitle>
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <BookIcon className="size-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Este libro no forma parte de ninguna serie todavía
                </p>
              </div>
              <Button
                className="h-11 w-full gap-1.5"
                onClick={() => setLinkSeriesOpen(true)}
              >
                <Plus className="size-4" />
                Agregar a una serie
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Lectura */}
      <section>
        <SectionTitle>Lectura</SectionTitle>
        <div className="flex flex-col gap-3">
          {readers.map((r) => {
            const ev = eventByReader.get(r.id);
            const s = ev?.status;
            const isActive = reader?.id === r.id;
            // The active reader can mark this book when they haven't finished it.
            const canMark = isActive && s !== "finished";
            const hasRatingOrReview = ev && (ev.rating != null || ev.review);
            // Subtitle: a finished reading shows its date (or a bare "Leído" when
            // undated); other statuses show their label; no event → "Sin empezar".
            let subtitle: string;
            if (s === "finished" && ev?.dateFinished) {
              subtitle = `Finalizado el ${formatReadingDate(ev.dateFinished)}`;
              if (ev.rating == null && !ev.review)
                subtitle += " · sin calificación";
            } else if (s === "finished") {
              subtitle = "Leído";
            } else if (s) {
              subtitle = STATUS_LABEL[s];
            } else {
              subtitle = "Sin empezar";
            }
            return (
              <div key={r.id} className="rounded-2xl border bg-card p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback>
                      {r.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {r.name}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Vos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                  {canMark ? (
                    <Button
                      size="sm"
                      onClick={() => setSheet({ mode: "create" })}
                      className="shrink-0 gap-1.5"
                    >
                      <Check className="size-3.5" />
                      Marcar leído
                    </Button>
                  ) : (
                    isActive &&
                    s === "finished" && (
                      <button
                        type="button"
                        onClick={() =>
                          ev && setSheet({ mode: "edit", event: ev })
                        }
                        aria-label="Editar tu lectura"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-accent"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Editar
                      </button>
                    )
                  )}
                </div>

                {/* rating + review (#25) */}
                {hasRatingOrReview && (
                  <div className="mt-3 space-y-1.5 pl-12">
                    {ev.rating != null && (
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={ev.rating}
                          readOnly
                          size={16}
                          label={`Calificación de ${r.name}`}
                        />
                        <span className="text-xs font-bold">{ev.rating}</span>
                        <span className="text-xs text-muted-foreground">
                          / 5
                        </span>
                      </div>
                    )}
                    {ev.review && (
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {ev.review}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Historial de lecturas (#26): the full log, shown when it adds beyond the
          per-reader summary above — i.e. when some reader has more than one reading. */}
      {events.length > eventByReader.size && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <SectionTitle className="mb-0">Historial de lecturas</SectionTitle>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {events.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {events.map((ev) => (
              <ReadingEventCard
                key={ev.id}
                event={ev}
                showBook={false}
                readerName={readerName.get(ev.readerId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Actividad (#40): distinct from "Historial de lecturas" above — this is
          who touched the book/its copies/its readings, not what was read. */}
      {activity.length > 0 && (
        <section>
          <SectionTitle className="mb-0.5">Actividad</SectionTitle>
          <p className="mb-2 text-xs text-muted-foreground">
            Este libro, sus ejemplares y sus lecturas
          </p>
          <ul className="flex flex-col">
            {activity.map((a) => (
              <ActivityRow
                key={a.id}
                entry={a}
                readerName={readerName.get(a.readerId) ?? "Alguien"}
              />
            ))}
          </ul>
        </section>
      )}

      {sheet && (
        <ConfirmReadingSheet
          target={{
            id: book.id,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverUrl ?? null,
            isbn13: book.isbn13 ?? null,
          }}
          reader={reader}
          mode={sheet.mode}
          event={sheet.mode === "edit" ? sheet.event : undefined}
          onClose={() => setSheet(null)}
          onDone={(saved) => {
            // Optimistically reflect the create/edit without a full reload (and
            // without depending on the reading-events index, #24 resilience):
            // replace any existing event with the same id and move it to front.
            setEvents((prev) => [
              saved,
              ...prev.filter((e) => e.id !== saved.id),
            ]);
          }}
        />
      )}

      {lendFor && book && (
        <LendDialog
          open={!!lendFor}
          onOpenChange={(open) => !open && setLendFor(null)}
          copyId={lendFor.id}
          bookTitle={book.title}
          copyLabel={
            lendFor.shelfId ? "Ejemplar en estante" : "Ejemplar sin estante"
          }
          borrowers={borrowerSuggestions(loans)}
          onLent={(loan) => setLoans((prev) => [loan, ...prev])}
        />
      )}

      {mySeries && (
        <SeriesDialog
          open={seriesDialogOpen}
          onOpenChange={setSeriesDialogOpen}
          series={mySeries}
          highlightBookId={book.id}
          onUpdated={(updated) =>
            setSeriesList((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
          }
        />
      )}

      <LinkSeriesDialog
        open={linkSeriesOpen}
        onOpenChange={setLinkSeriesOpen}
        book={{
          id: book.id,
          title: book.title,
          authors: book.authors,
          isbn13: book.isbn13,
          coverUrl: book.coverUrl,
        }}
        existingSeries={seriesList}
        onLinked={(series) =>
          setSeriesList((prev) => {
            const exists = prev.some((s) => s.id === series.id);
            return exists
              ? prev.map((s) => (s.id === series.id ? series : s))
              : [series, ...prev];
          })
        }
      />

      <SignInPrompt
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSignIn={() => router.push(`/login?next=${buildNextParam()}`)}
        action="prestar o marcar una devolución"
      />
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
