"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Library,
  Loader2,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
 * Add books from a whole-shelf photo (#21b). Captures a shelf photo, identifies
 * the books (`/api/ai/identify-shelf`, 21a), then per book enriches + dedupes +
 * classifies with a real "processing N/M" bar (reusing `/api/enrich` +
 * `/api/books/duplicates`). The confident books are added after a preview; the
 * doubtful ones go to a one-by-one review queue, with duplicates handled in bulk.
 * All books land on a single batch shelf. Functional baseline over the existing
 * primitives; the Claude Design handoff refines it.
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

  if (phase === "capture") {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground">
            <Library className="size-8" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Sacá una foto del estante</p>
            <p className="mt-1 text-sm text-muted-foreground">
              La IA agrega los seguros y te deja revisar los dudosos.
            </p>
          </div>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
            <Library className="size-4" aria-hidden="true" />
            Tomar foto del estante
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onCapture}
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  if (phase === "analyzing" || phase === "processing") {
    const pct =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent
          className="flex flex-col items-center gap-4 p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="size-7 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="font-semibold">
            {phase === "analyzing"
              ? "Analizando el estante…"
              : `Procesando ${progress.done}/${progress.total}`}
          </p>
          {phase === "processing" && (
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (phase === "results" && buckets) {
    const total =
      buckets.auto.length + buckets.queue.length + buckets.duplicates.length;
    if (total === 0) {
      return (
        <Card className="rounded-2xl shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="size-7" aria-hidden="true" />
            </span>
            <p className="font-semibold">No se reconocieron libros</p>
            <p className="text-sm text-muted-foreground">
              Probá con más luz o enfocando los lomos.
            </p>
            <RetakeButton onChange={onCapture} />
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        <ShelfPicker shelves={shelves} value={shelfId} onChange={setShelfId} />

        {buckets.auto.length > 0 && (
          <Card className="rounded-2xl shadow-none">
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Check className="size-4 text-success" aria-hidden="true" />
                {buckets.auto.length} listos para agregar
              </p>
              <ul className="space-y-1.5">
                {buckets.auto.map((b, i) => (
                  <li key={i} className="truncate text-sm">
                    {b.best!.title}
                    <span className="text-muted-foreground">
                      {b.best!.authors?.length
                        ? ` · ${b.best!.authors[0]}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addAuto}
                className="h-11 w-full rounded-2xl bg-primary font-bold text-primary-foreground"
              >
                Agregar los {buckets.auto.length}
              </button>
            </CardContent>
          </Card>
        )}

        {(buckets.queue.length > 0 || buckets.duplicates.length > 0) && (
          <Card className="rounded-2xl shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm">
                <span className="font-bold">
                  {buckets.queue.length + buckets.duplicates.length}
                </span>{" "}
                para revisar
              </p>
              <button
                type="button"
                onClick={() => setPhase("review")}
                className="h-10 rounded-xl border px-4 text-sm font-semibold hover:bg-accent"
              >
                Revisar →
              </button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <RetakeButton onChange={onCapture} variant="text" />
        </div>
      </div>
    );
  }

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

  // done
  return (
    <Card className="rounded-2xl shadow-none">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-7" aria-hidden="true" />
        </span>
        <p className="font-semibold">Listo</p>
        <p className="text-sm text-muted-foreground">
          {summary.added} {summary.added === 1 ? "agregado" : "agregados"} ·{" "}
          {summary.skipped} {summary.skipped === 1 ? "saltado" : "saltados"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/catalogo")}
            className="h-11 rounded-2xl bg-primary px-5 font-bold text-primary-foreground"
          >
            Ver catálogo
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl border px-4 font-semibold hover:bg-accent"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Otro estante
          </button>
        </div>
      </CardContent>
    </Card>
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
    if (index + 1 < queue.length) {
      setIndex(index + 1);
    } else if (!dupsHandled) {
      setIndex(queue.length); // move to the duplicates block
    } else {
      onDone(tally.current.added, tally.current.skipped);
    }
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
        position={`${index + 1} de ${queue.length}`}
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

  // duplicates group
  return (
    <Card className="rounded-2xl shadow-none">
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-bold">
          {buckets.duplicates.length}{" "}
          {buckets.duplicates.length === 1 ? "duplicado" : "duplicados"} ya en
          tu biblioteca
        </p>
        <ul className="space-y-1.5">
          {buckets.duplicates.map((d, i) => (
            <li key={i} className="truncate text-sm">
              «{d.duplicate!.title}» ({d.duplicate!.copies})
            </li>
          ))}
        </ul>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => handleDuplicates(false)}
            className="h-11 flex-1 rounded-xl border font-semibold hover:bg-accent"
          >
            Saltar todos
          </button>
          <button
            type="button"
            onClick={() => handleDuplicates(true)}
            className="h-11 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            Agregar como copia
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewItem({
  item,
  position,
  onConfirm,
  onDiscard,
}: {
  item: ProcessedBook;
  position: string;
  onConfirm: (book: BookData, coverUrl: string | null) => void;
  onDiscard: () => void;
}) {
  const initial: IdentifyCandidate = item.best ?? {
    title: item.ai.title,
    authors: item.ai.authors ?? [],
  };
  const [picked, setPicked] = React.useState<IdentifyCandidate>(initial);
  const [book, setBook] = React.useState<BookData>(
    candidateToBookData(initial),
  );
  const lowConf = item.classification.reason === "low_confidence";

  function pick(c: IdentifyCandidate) {
    setPicked(c);
    setBook(candidateToBookData(c));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Revisar · {position}</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
            lowConf
              ? "bg-warning-bg text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          {lowConf ? "Baja confianza" : "Sin metadata"}
        </span>
      </div>

      <Card className="rounded-2xl shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="rv-title">Título</Label>
            <input
              id="rv-title"
              value={book.title}
              onChange={(e) => setBook({ ...book, title: e.target.value })}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rv-authors">Autor(es)</Label>
            <input
              id="rv-authors"
              value={book.authors.join(", ")}
              placeholder="Separados por coma"
              onChange={(e) =>
                setBook({
                  ...book,
                  authors: e.target.value
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean),
                })
              }
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {item.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            ¿O alguno de estos?
          </p>
          {item.alternatives.map((c, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={picked === c}
              onClick={() => pick(c)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-accent",
                picked === c ? "border-primary bg-accent" : "border-border",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {c.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {(c.authors ?? []).join(", ")}
                  {c.publishedYear ? ` · ${c.publishedYear}` : ""}
                </span>
              </span>
              {picked === c && (
                <Check
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2.5 border-t pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl border px-4 font-semibold hover:bg-accent"
        >
          <X className="size-4" aria-hidden="true" />
          Descartar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(book, picked.coverUrl ?? null)}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
        >
          <Check className="size-4" aria-hidden="true" />
          Confirmar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── small pieces ─────────────────────────

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
      <Label htmlFor="shelf-batch">Estante para todo el lote</Label>
      <div className="relative">
        <select
          id="shelf-batch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 pr-10 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
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
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "solid" | "text";
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 font-semibold",
        variant === "solid"
          ? "h-11 rounded-2xl bg-primary px-5 text-primary-foreground"
          : "text-sm text-muted-foreground hover:text-foreground",
      )}
    >
      <RotateCcw className="size-4" aria-hidden="true" />
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
