"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Library,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Pencil,
  Copy,
  LayoutGrid,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  candidateToBookData,
  prepareImage,
  MAX_SHELF_EDGE,
  type IdentifyCandidate,
} from "./photo-add";
import {
  shelfEnrichUrl,
  duplicatesUrl,
  classifyProcessed,
  splitBuckets,
  shelfIntakePayload,
  type ProcessedBook,
  type ShelfAICandidate,
  type ShelfBuckets,
} from "./shelf-add";
import type { BookData, ExistingBook, Shelf } from "./types";

/**
 * Add books from a whole-shelf photo (#21b, Claude Design handoff "Add by Shelf").
 * Captures a shelf photo, identifies the books (`/api/ai/identify-shelf`, 21a),
 * then per book enriches + dedupes + classifies with a real progress bar (reusing
 * `/api/enrich` + `/api/books/duplicates`). Confident books are added after a
 * preview; doubtful ones go to a one-by-one review queue; duplicates are handled
 * in bulk. All books land on one batch shelf. Recreated from the design over the
 * existing tokens.
 */
type Phase =
  | "capture"
  | "analyzing"
  | "processing"
  | "results"
  | "review"
  | "done";

interface DupMatch {
  book: { id: string; title: string; authors: string[] };
  existingCopies: number;
}

const SHELF_SVG = "M3 7v13h18V7M3 7l3-4h12l3 4M3 7h18";

export function AddBookByShelf() {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("capture");
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [buckets, setBuckets] = React.useState<ShelfBuckets | null>(null);
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [shelfId, setShelfId] = React.useState("");
  const [summary, setSummary] = React.useState({ added: 0, skipped: 0 });

  React.useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) =>
        setShelves(d.map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => setShelves([]));
  }, []);

  const shelfName = shelves.find((s) => s.id === shelfId)?.name ?? null;

  function reset() {
    setPhase("capture");
    setProgress({ done: 0, total: 0 });
    setBuckets(null);
    setSummary({ added: 0, skipped: 0 });
  }

  async function processBook(ai: ShelfAICandidate): Promise<ProcessedBook> {
    try {
      const enrich = await fetch(shelfEnrichUrl(ai)).then((r) => r.json());
      let best: IdentifyCandidate | null;
      let alternatives: IdentifyCandidate[];
      if (ai.isbn13) {
        best = (enrich.candidate as IdentifyCandidate | null) ?? null;
        alternatives = [];
      } else {
        const cands = (enrich.candidates as IdentifyCandidate[]) ?? [];
        best = cands[0] ?? null;
        alternatives = cands.slice(1);
      }
      const idFor = best ?? {
        title: ai.title,
        authors: ai.authors,
        isbn13: ai.isbn13,
      };
      const dupRes = await fetch(duplicatesUrl(idFor)).then((r) => r.json());
      const m = (dupRes.matches as DupMatch[] | undefined)?.[0];
      const duplicate: ExistingBook | null = m
        ? {
            id: m.book.id,
            title: m.book.title,
            authors: m.book.authors,
            copies: m.existingCopies,
          }
        : null;
      return {
        ai,
        best,
        alternatives,
        duplicate,
        classification: classifyProcessed({ ai, best, duplicate }),
      };
    } catch {
      return {
        ai,
        best: null,
        alternatives: [],
        duplicate: null,
        classification: { bucket: "review", reason: "no_match" },
      };
    }
  }

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("analyzing");
    try {
      const { base64, contentType } = await prepareImage(file, MAX_SHELF_EDGE);
      const res = await fetch("/api/ai/identify-shelf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, contentType }),
      });
      if (!res.ok) throw new Error(`identify-shelf ${res.status}`);
      const { books } = (await res.json()) as { books: ShelfAICandidate[] };
      if (books.length === 0) {
        setBuckets({ auto: [], queue: [], duplicates: [] });
        setPhase("results");
        return;
      }
      setPhase("processing");
      setProgress({ done: 0, total: books.length });
      const processed: ProcessedBook[] = [];
      for (let i = 0; i < books.length; i++) {
        processed.push(await processBook(books[i]));
        setProgress({ done: i + 1, total: books.length });
      }
      setBuckets(splitBuckets(processed));
      setPhase("results");
    } catch {
      setPhase("capture");
      toast({
        title: "No se pudo analizar el estante",
        variant: "destructive",
      });
    }
  }

  /** Intake one book with the enrichment cover + the batch shelf. */
  async function intake(
    book: BookData,
    coverUrl: string | null,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/books/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(shelfIntakePayload(book, shelfId, coverUrl)),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function addAuto() {
    if (!buckets) return;
    setPhase("processing");
    setProgress({ done: 0, total: buckets.auto.length });
    let added = 0;
    for (let i = 0; i < buckets.auto.length; i++) {
      const b = buckets.auto[i];
      const ok = await intake(
        candidateToBookData(b.best!),
        b.best!.coverUrl ?? null,
      );
      if (ok) added++;
      setProgress({ done: i + 1, total: buckets.auto.length });
    }
    setSummary((s) => ({ ...s, added: s.added + added }));
    setPhase(
      buckets.queue.length || buckets.duplicates.length ? "review" : "done",
    );
  }

  // ───────────────────────── capture ─────────────────────────
  if (phase === "capture") {
    return (
      <div className="flex flex-col items-center px-2 pt-2 text-center">
        <div className="flex aspect-[4/3] w-full max-w-[300px] flex-col items-center justify-center gap-3.5 rounded-[20px] border-2 border-dashed border-border bg-card p-6">
          <span className="grid size-[72px] place-items-center rounded-full bg-accent text-accent-foreground">
            <Library className="size-9" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <p className="text-lg font-bold tracking-tight">
            Sacá una foto del estante
          </p>
          <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            Capturá los lomos de toda una fila. La IA identifica varios libros
            de una.
          </p>
        </div>
        <label className="mt-6 inline-flex h-[54px] w-full max-w-[300px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-primary text-base font-bold text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Library className="size-5" aria-hidden="true" />
          Tomar foto del estante
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onCapture}
          />
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Se abre la cámara del dispositivo.
        </p>
      </div>
    );
  }

  // ───────────────────────── analyzing / processing ─────────────────────────
  if (phase === "analyzing" || phase === "processing") {
    const pct =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Library className="size-7" strokeWidth={1.8} aria-hidden="true" />
        </span>
        {phase === "analyzing" ? (
          <>
            <div
              className="flex items-center gap-2.5"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="size-5 animate-spin text-primary"
                aria-hidden="true"
              />
              <span className="text-base font-semibold">
                Analizando el estante…
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Detectando los lomos de los libros.
            </p>
          </>
        ) : (
          <>
            <p
              className="text-[17px] font-bold"
              role="status"
              aria-live="polite"
            >
              Procesando {progress.done}/{progress.total}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Identificando y verificando duplicados de cada libro.
            </p>
            <div className="mt-5 w-full max-w-xs">
              <div
                role="progressbar"
                aria-valuenow={progress.done}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-label="Progreso del lote"
                className="h-3 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs text-muted-foreground">
                {pct}%
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // ───────────────────────── results ─────────────────────────
  if (phase === "results" && buckets) {
    const reviewCount = buckets.queue.length + buckets.duplicates.length;
    if (buckets.auto.length + reviewCount === 0) {
      return (
        <div className="flex flex-col items-center px-3 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold">No se reconocieron libros</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Probá con más luz o enfocando los lomos.
          </p>
          <RetakeButton onChange={onCapture} className="mt-5" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <ShelfPicker shelves={shelves} value={shelfId} onChange={setShelfId} />

        {buckets.auto.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border bg-success-bg p-3.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
                <Check
                  className="size-3.5"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-bold">
                {buckets.auto.length} listos para agregar
              </span>
            </div>
            <ul className="max-h-52 overflow-y-auto p-1.5">
              {buckets.auto.map((b, i) => (
                <li key={i} className="flex items-center gap-3 p-2">
                  <CoverThumb
                    url={b.best!.coverUrl}
                    className="h-11 w-[30px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {b.best!.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {b.best!.authors?.[0] ?? ""}
                    </p>
                  </div>
                  <Check
                    className="size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={addAuto}
                className="h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground"
              >
                Agregar los {buckets.auto.length}
              </button>
            </div>
          </div>
        )}

        {reviewCount > 0 && (
          <button
            type="button"
            onClick={() => setPhase("review")}
            className="flex w-full items-center gap-3 rounded-2xl border border-warning/40 bg-warning-bg p-3.5 text-left hover:border-warning"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
              <AlertTriangle className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                {reviewCount} para revisar
              </span>
              <span className="block text-[11.5px] text-muted-foreground">
                Baja confianza o sin metadata.
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-warning">
              Revisar <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </button>
        )}

        {buckets.duplicates.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3">
            <Copy
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {buckets.duplicates.length} duplicados se manejan al final de la
              revisión.
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <RetakeButton onChange={onCapture} variant="text" />
        </div>
      </div>
    );
  }

  // ───────────────────────── review ─────────────────────────
  if (phase === "review" && buckets) {
    return (
      <ReviewFlow
        buckets={buckets}
        shelfId={shelfId}
        onIntake={intake}
        onDone={(added, skipped) => {
          setSummary((s) => ({
            added: s.added + added,
            skipped: s.skipped + skipped,
          }));
          setPhase("done");
        }}
      />
    );
  }

  // ───────────────────────── done ─────────────────────────
  return (
    <div className="flex flex-col items-center px-3 py-8 text-center">
      <span className="grid size-[84px] animate-in place-items-center rounded-full bg-success-bg text-success zoom-in-95">
        <Check className="size-10" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <p className="mt-5 text-[22px] font-bold tracking-tight">¡Listo!</p>
      <p className="mt-2.5 font-semibold">
        {summary.added} {summary.added === 1 ? "agregado" : "agregados"} ·{" "}
        {summary.skipped} {summary.skipped === 1 ? "saltado" : "saltados"}
      </p>
      {shelfName && (
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
          Todos fueron al estante «{shelfName}».
        </p>
      )}
      <button
        type="button"
        onClick={() => router.push("/catalogo")}
        className="mt-6 inline-flex h-[50px] w-full max-w-[280px] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        <LayoutGrid className="size-[18px]" aria-hidden="true" />
        Ver catálogo
      </button>
      <button
        type="button"
        onClick={reset}
        className="mt-2.5 p-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        Otro estante
      </button>
    </div>
  );
}

// ───────────────────────── review flow ─────────────────────────

function ReviewFlow({
  buckets,
  shelfId,
  onIntake,
  onDone,
}: {
  buckets: ShelfBuckets;
  shelfId: string;
  onIntake: (book: BookData, coverUrl: string | null) => Promise<boolean>;
  onDone: (added: number, skipped: number) => void;
}) {
  const { toast } = useToast();
  const [index, setIndex] = React.useState(0);
  const tally = React.useRef({ added: 0, skipped: 0 });
  const [dupsHandled, setDupsHandled] = React.useState(
    buckets.duplicates.length === 0,
  );

  const queue = buckets.queue;
  const inQueue = index < queue.length;

  function advance(addedDelta: number, skippedDelta: number) {
    tally.current.added += addedDelta;
    tally.current.skipped += skippedDelta;
    if (index + 1 < queue.length) setIndex(index + 1);
    else if (!dupsHandled) setIndex(queue.length);
    else onDone(tally.current.added, tally.current.skipped);
  }

  async function handleDuplicates(asCopy: boolean) {
    let added = 0;
    if (asCopy) {
      for (const d of buckets.duplicates) {
        try {
          const res = await fetch("/api/copies", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              bookId: d.duplicate!.id,
              shelfId: shelfId || null,
            }),
          });
          if (res.ok) added++;
        } catch {
          /* skip on failure */
        }
      }
    }
    setDupsHandled(true);
    onDone(
      tally.current.added + added,
      tally.current.skipped + (asCopy ? 0 : buckets.duplicates.length),
    );
  }

  if (inQueue) {
    const item = queue[index];
    return (
      <ReviewItem
        key={index}
        item={item}
        position={index + 1}
        total={queue.length}
        onConfirm={async (book, coverUrl) => {
          const ok = await onIntake(book, coverUrl);
          if (!ok) {
            toast({ title: "No se pudo agregar", variant: "destructive" });
            return;
          }
          advance(1, 0);
        }}
        onDiscard={() => advance(0, 1)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-accent p-3.5"
      >
        <Copy className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm font-bold">
          {buckets.duplicates.length} duplicados ya en tu biblioteca
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {buckets.duplicates.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
          >
            <CoverThumb
              url={d.best?.coverUrl ?? null}
              className="h-[58px] w-10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">
                {d.duplicate!.title}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {d.duplicate!.authors[0] ?? ""}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-primary">
                Ya tenés {d.duplicate!.copies}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => handleDuplicates(false)}
          className="h-12 flex-1 rounded-lg border bg-card font-semibold hover:bg-accent"
        >
          Saltar todos
        </button>
        <button
          type="button"
          onClick={() => handleDuplicates(true)}
          className="h-12 flex-1 rounded-lg bg-primary font-bold text-primary-foreground"
        >
          Agregar como copia
        </button>
      </div>
    </div>
  );
}

function ReviewItem({
  item,
  position,
  total,
  onConfirm,
  onDiscard,
}: {
  item: ProcessedBook;
  position: number;
  total: number;
  onConfirm: (book: BookData, coverUrl: string | null) => void;
  onDiscard: () => void;
}) {
  const lowConf = item.classification.reason === "low_confidence";
  const initial: IdentifyCandidate = item.best ?? {
    title: item.ai.title,
    authors: item.ai.authors ?? [],
  };
  const [book, setBook] = React.useState<BookData>(
    candidateToBookData(initial),
  );
  const [cover, setCover] = React.useState<string | null>(
    initial.coverUrl ?? null,
  );
  const [activeAlt, setActiveAlt] = React.useState<number | null>(null);
  const [editOpen, setEditOpen] = React.useState(!lowConf); // no_match shows the form

  function pick(c: IdentifyCandidate, i: number) {
    setBook(candidateToBookData(c));
    setCover(c.coverUrl ?? null);
    setActiveAlt(i);
  }

  return (
    <div className="space-y-4 pb-2">
      {/* counter + badge */}
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-bold text-muted-foreground">
          {position} de {total}
        </span>
        <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((position / total) * 100)}%` }}
          />
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
            lowConf
              ? "bg-warning-bg text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          {lowConf ? (
            <AlertTriangle className="size-3" aria-hidden="true" />
          ) : (
            <SearchX className="size-3" aria-hidden="true" />
          )}
          {lowConf ? "Baja confianza" : "Sin metadata"}
        </span>
      </div>

      {lowConf && (
        <>
          <Card className="rounded-2xl border-[1.5px] border-primary shadow-none">
            <CardContent className="flex items-center gap-3 p-3.5">
              <CoverThumb url={cover} className="h-16 w-11" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Mejor candidato
                </p>
                <p className="mt-0.5 text-[15px] font-bold leading-tight">
                  {book.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {book.authors[0] ?? ""}
                </p>
              </div>
            </CardContent>
          </Card>

          {item.alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-bold">¿Es alguno de estos?</p>
              {item.alternatives.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={activeAlt === i}
                  onClick={() => pick(c, i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-[1.5px] p-2.5 text-left transition-colors hover:border-ring",
                    activeAlt === i
                      ? "border-primary bg-accent"
                      : "border-border bg-card",
                  )}
                >
                  <CoverThumb url={c.coverUrl} className="h-[50px] w-[34px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {c.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {(c.authors ?? []).join(", ")}
                      {c.publishedYear ? ` · ${c.publishedYear}` : ""}
                    </span>
                  </span>
                  {activeAlt === i && (
                    <Check
                      className="size-[17px] shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {!editOpen && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 p-1 text-[12.5px] font-semibold text-primary"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Editar título / autores
            </button>
          )}
        </>
      )}

      {editOpen && (
        <div className="space-y-3">
          {!lowConf && (
            <div className="flex items-center gap-3">
              <span className="grid h-16 w-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Library className="size-5" aria-hidden="true" />
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                No encontramos metadata. Completá los datos a mano para
                agregarlo.
              </p>
            </div>
          )}
          <Field
            id="rv-title"
            label="Título"
            value={book.title}
            placeholder="Título del libro"
            onChange={(v) => setBook({ ...book, title: v })}
          />
          <Field
            id="rv-authors"
            label="Autor(es)"
            value={book.authors.join(", ")}
            placeholder="Separados por coma"
            onChange={(v) =>
              setBook({
                ...book,
                authors: v
                  .split(",")
                  .map((a) => a.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      {/* actions */}
      <div className="flex gap-2.5 border-t pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-[50px] items-center gap-1.5 rounded-2xl border px-4 font-semibold hover:bg-accent"
        >
          <X className="size-4" aria-hidden="true" />
          Descartar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(book, cover)}
          className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
        >
          <Check className="size-4" aria-hidden="true" />
          Confirmar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── small pieces ─────────────────────────

function CoverThumb({
  url,
  className,
}: {
  url?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow",
        className,
      )}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
      <span className="absolute inset-y-0 left-0 w-[2px] bg-black/15" />
    </span>
  );
}

function Field({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-[46px] w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}

function ShelfPicker({
  shelves,
  value,
  onChange,
}: {
  shelves: Shelf[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="shelf-batch" className="block text-[13px] font-semibold">
        Estante para todo el lote
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={SHELF_SVG} />
        </svg>
        <select
          id="shelf-batch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-10 text-[15px] font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sin estante</option>
          {shelves.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function RetakeButton({
  onChange,
  variant = "solid",
  className,
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "solid" | "text";
  className?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 font-semibold",
        variant === "solid"
          ? "h-11 rounded-2xl bg-primary px-5 text-primary-foreground"
          : "text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Library className="size-4" aria-hidden="true" />
      Otra foto
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onChange}
      />
    </label>
  );
}
