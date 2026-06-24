"use client";

import * as React from "react";
import {
  Search,
  ArrowRight,
  FilePen,
  ChevronDown,
  Info,
  RotateCw,
  BookOpen,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { TokenField } from "./token-field";
import { DuplicateDialog } from "./duplicate-dialog";
import { EnrichSkeleton, CoverPreview } from "./enrich-skeleton";
import {
  type BookData,
  type CopyData,
  type BookCandidate,
  type ExistingBook,
  type Shelf,
  type SearchMode,
  CONDITIONS,
  LANGUAGES,
  emptyBook,
} from "./types";

export type Phase = "search" | "loading" | "form" | "error" | "success";

export interface AddBookFormProps {
  shelves?: Shelf[];
  /** Resolve metadata for an ISBN. Reject to surface the error/empty path. */
  onEnrichIsbn: (isbn: string) => Promise<BookData>;
  /** Resolve up to 5 ranked candidates for a title/author query. */
  onSearchTitle: (query: string) => Promise<BookCandidate[]>;
  /** Hydrate a chosen candidate into full book metadata. */
  onResolveCandidate: (id: string) => Promise<BookData>;
  /** Check for an existing book; return it (or null) before saving. */
  onCheckDuplicate: (book: BookData) => Promise<ExistingBook | null>;
  /** Persist. `asCopy` is true when adding to an existing book. */
  onSave: (
    book: BookData,
    copy: CopyData,
    asCopy: boolean,
  ) => Promise<{ id: string; copies: number }>;
  onViewBook?: (id: string) => void;
}

/**
 * Manual "agregar libro" form. Drives the full flow:
 * search → loading → form (prefilled / candidates / validation) → save →
 * duplicate dialog → error / success. Mobile-first single column; at md+ the
 * book fields and the copy/shelf panel sit side by side.
 *
 * All UI composes existing primitives (Input, Label, Select, Button, Card,
 * Dialog, Badge, Skeleton, Toast, Avatar). No new widgets invented.
 */
export function AddBookForm({
  shelves = [],
  onEnrichIsbn,
  onSearchTitle,
  onResolveCandidate,
  onCheckDuplicate,
  onSave,
  onViewBook,
}: AddBookFormProps) {
  const { toast } = useToast();

  const [phase, setPhase] = React.useState<Phase>("search");
  const [mode, setMode] = React.useState<SearchMode>("isbn");
  const [query, setQuery] = React.useState("");

  const [book, setBook] = React.useState<BookData>(emptyBook);
  const [copy, setCopy] = React.useState<CopyData>({ condition: "Bueno" });
  const [candidates, setCandidates] = React.useState<BookCandidate[]>([]);
  const [chosen, setChosen] = React.useState<string | null>(null);

  const [errors, setErrors] = React.useState<{ title?: string }>({});
  const [inlineDup, setInlineDup] = React.useState<ExistingBook | null>(null);
  const [dupModal, setDupModal] = React.useState<ExistingBook | null>(null);
  const [saved, setSaved] = React.useState<{
    id: string;
    copies: number;
  } | null>(null);
  const [copyOpen, setCopyOpen] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof BookData>(k: K, v: BookData[K]) =>
    setBook((b) => ({ ...b, [k]: v }));

  // ---- search → loading → form -------------------------------------------
  async function runSearch() {
    if (!query.trim()) return;
    setPhase("loading");
    try {
      if (mode === "isbn") {
        const data = await onEnrichIsbn(query.trim());
        setBook(data);
        await earlyDuplicateCheck(data);
        setPhase("form");
      } else {
        const list = (await onSearchTitle(query.trim())).slice(0, 5);
        setCandidates(list);
        setPhase("form");
      }
    } catch {
      // fall back to a manual, empty form so the user is never stuck
      setBook(emptyBook);
      setPhase("form");
      toast({
        variant: "destructive",
        title: "No encontramos metadata",
        description: "Cargá los datos manualmente.",
      });
    }
  }

  async function pickCandidate(id: string) {
    setChosen(id);
    setPhase("loading");
    try {
      const data = await onResolveCandidate(id);
      setBook(data);
      setCandidates([]);
      await earlyDuplicateCheck(data);
    } finally {
      setPhase("form");
    }
  }

  async function earlyDuplicateCheck(data: BookData) {
    const existing = await onCheckDuplicate(data).catch(() => null);
    setInlineDup(existing);
  }

  function startManual() {
    setBook(emptyBook);
    setCandidates([]);
    setInlineDup(null);
    setPhase("form");
  }

  // ---- save ---------------------------------------------------------------
  function validate() {
    const next: { title?: string } = {};
    if (!book.title.trim()) next.title = "El título es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function trySave(asCopy = false) {
    if (!validate()) return;
    setSaving(true);
    try {
      if (!asCopy) {
        const existing = await onCheckDuplicate(book);
        if (existing) {
          setDupModal(existing);
          setSaving(false);
          return;
        }
      }
      const result = await onSave(book, copy, asCopy);
      setSaved(result);
      setDupModal(null);
      setPhase("success");
    } catch {
      setPhase("error");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setPhase("search");
    setQuery("");
    setBook(emptyBook);
    setCopy({ condition: "Bueno" });
    setCandidates([]);
    setChosen(null);
    setErrors({});
    setInlineDup(null);
    setDupModal(null);
    setSaved(null);
  }

  // ---- render -------------------------------------------------------------
  if (phase === "search") {
    return (
      <FieldShell>
        <div
          role="radiogroup"
          aria-label="Tipo de búsqueda"
          className="mb-4 flex gap-1 rounded-lg bg-muted p-1"
        >
          {(["isbn", "title"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {m === "isbn" ? "ISBN" : "Título / autor"}
            </button>
          ))}
        </div>

        <Label htmlFor="add-search" className="mb-1.5 block">
          {mode === "isbn" ? "Código ISBN" : "Título o autor"}
        </Label>
        <form
          className="flex gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="add-search"
              inputMode={mode === "isbn" ? "numeric" : "text"}
              placeholder={
                mode === "isbn"
                  ? "978… o escaneá el código"
                  : "Ej.: El nombre del viento"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="size-11"
            aria-label="Buscar"
          >
            <ArrowRight />
          </Button>
        </form>
        <p className="mx-0.5 mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {mode === "isbn"
            ? "Prellenamos los datos automáticamente desde el ISBN."
            : "Te mostramos hasta 5 coincidencias para elegir."}
        </p>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={startManual}
        >
          <FilePen className="size-[17px]" />
          Cargar manualmente sin buscar
        </Button>
      </FieldShell>
    );
  }

  if (phase === "loading") {
    return (
      <FieldShell>
        <EnrichSkeleton />
      </FieldShell>
    );
  }

  if (phase === "error") {
    return (
      <FieldShell className="flex flex-col items-center py-10 text-center">
        <span className="grid size-[62px] place-items-center rounded-full bg-destructive/15 text-destructive">
          <RotateCw className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold">No se pudo guardar</h2>
        <p className="mt-2 max-w-60 text-sm leading-relaxed text-muted-foreground">
          Hubo un problema de conexión con el servidor. Tus datos siguen acá —
          probá de nuevo.
        </p>
        <Button className="mt-6 h-11 gap-2" onClick={() => trySave()}>
          <RotateCw className="size-[17px]" />
          Reintentar
        </Button>
        <Button
          variant="ghost"
          className="mt-2.5"
          onClick={() => setPhase("form")}
        >
          Volver al formulario
        </Button>
      </FieldShell>
    );
  }

  if (phase === "success" && saved) {
    return (
      <FieldShell className="flex flex-col items-center py-8 text-center">
        <span className="grid size-[72px] place-items-center rounded-full bg-success text-success-foreground">
          <Check className="size-9" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold">¡Libro agregado!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          “{book.title}” está en tu biblioteca.
        </p>
        <div className="mt-5 flex items-center gap-3.5">
          <CoverPreview
            url={book.coverUrl}
            title={book.title}
            className="h-[84px] w-[58px]"
          />
          <div className="text-left">
            <p className="text-sm font-semibold">{book.title}</p>
            <p className="text-xs text-muted-foreground">
              {book.authors.join(", ")}
            </p>
            <span className="mt-1.5 inline-flex items-center rounded-full bg-success px-2 py-0.5 text-[11px] font-semibold text-success-foreground">
              {saved.copies} {saved.copies === 1 ? "ejemplar" : "ejemplares"}
            </span>
          </div>
        </div>
        <Button
          className="mt-6 w-full max-w-60"
          onClick={() => onViewBook?.(saved.id)}
        >
          Ver libro
        </Button>
        <Button
          variant="outline"
          className="mt-2.5 w-full max-w-60"
          onClick={reset}
        >
          Agregar otro
        </Button>
      </FieldShell>
    );
  }

  // phase === "form"
  return (
    <>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
        {/* Book column */}
        <div className="flex-1 md:max-w-xl">
          {candidates.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2.5 text-sm font-semibold">
                Elegí el libro{" "}
                <span className="font-normal text-muted-foreground">
                  · {candidates.length} resultados
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {candidates.map((c) => {
                  const active = chosen === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickCandidate(c.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex gap-3 rounded-xl border-[1.5px] p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-accent"
                          : "border-border bg-card hover:bg-accent/40",
                      )}
                    >
                      <CoverPreview
                        url={c.coverUrl}
                        title={c.title}
                        className="h-[58px] w-10 rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.authors.join(", ")}
                          {c.year ? ` · ${c.year}` : ""}
                        </p>
                      </div>
                      {active && (
                        <Check
                          className="mt-0.5 size-[17px] shrink-0 text-primary"
                          strokeWidth={2.6}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Early, non-blocking duplicate notice */}
          {inlineDup && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/35 bg-accent/55 px-3 py-2.5"
            >
              <Info
                className="mt-0.5 size-[17px] shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-xs leading-snug text-foreground">
                Ya tenés <strong>“{inlineDup.title}”</strong> en tu biblioteca.
                Podés agregarlo igual como otra copia.
              </p>
            </div>
          )}

          <div className="mb-5 flex gap-3.5">
            <CoverPreview
              url={book.coverUrl}
              title={book.title || "Sin título"}
            />
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Portada
              </p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Vista previa desde metadata. No editable.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Field id="f-title" label="Título" required error={errors.title}>
              <Input
                id="f-title"
                value={book.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (errors.title) setErrors({});
                }}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "f-title-error" : undefined}
                className={cn("h-11", errors.title && "border-destructive")}
              />
            </Field>

            <Field id="f-sub" label="Subtítulo">
              <Input
                id="f-sub"
                value={book.subtitle ?? ""}
                onChange={(e) => set("subtitle", e.target.value)}
                className="h-11"
                placeholder="—"
              />
            </Field>

            <Field id="f-authors" label="Autores">
              <TokenField
                value={book.authors}
                ariaLabel="Agregar autor"
                onChange={(v) => set("authors", v)}
              />
            </Field>

            <div className="flex gap-3">
              <Field id="f-pub" label="Editorial" className="flex-1">
                <Input
                  id="f-pub"
                  value={book.publisher ?? ""}
                  onChange={(e) => set("publisher", e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field id="f-year" label="Año" className="w-24 shrink-0">
                <Input
                  id="f-year"
                  inputMode="numeric"
                  value={book.year ?? ""}
                  onChange={(e) => set("year", e.target.value)}
                  className="h-11"
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <Field id="f-i13" label="ISBN-13" className="flex-1">
                <Input
                  id="f-i13"
                  inputMode="numeric"
                  value={book.isbn13 ?? ""}
                  onChange={(e) => set("isbn13", e.target.value)}
                  className="h-11 font-mono text-sm"
                />
              </Field>
              <Field id="f-i10" label="ISBN-10" className="flex-1">
                <Input
                  id="f-i10"
                  inputMode="numeric"
                  value={book.isbn10 ?? ""}
                  onChange={(e) => set("isbn10", e.target.value)}
                  className="h-11 font-mono text-sm"
                />
              </Field>
            </div>

            <Field id="f-cats" label="Categorías">
              <TokenField
                value={book.categories}
                ariaLabel="Agregar categoría"
                onChange={(v) => set("categories", v)}
              />
            </Field>

            <div className="flex gap-3">
              <Field id="f-lang" label="Idioma" className="flex-1">
                <Select
                  value={book.language}
                  onValueChange={(v) => set("language", v)}
                >
                  <SelectTrigger id="f-lang" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="f-pages" label="Páginas" className="w-24 shrink-0">
                <Input
                  id="f-pages"
                  inputMode="numeric"
                  value={book.pages ?? ""}
                  onChange={(e) => set("pages", e.target.value)}
                  className="h-11"
                />
              </Field>
            </div>

            <Field id="f-desc" label="Descripción">
              <textarea
                id="f-desc"
                rows={3}
                value={book.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </Field>
          </div>
        </div>

        {/* Copy / shelf — collapsible on mobile, fixed panel at md+ */}
        <div className="md:w-72 md:shrink-0">
          <div className="overflow-hidden rounded-xl border border-border md:bg-accent/30">
            <button
              type="button"
              onClick={() => setCopyOpen((o) => !o)}
              aria-expanded={copyOpen}
              className="flex w-full items-center gap-2.5 bg-card p-3.5 text-left md:cursor-default md:bg-transparent"
            >
              <BookOpen
                className="size-[17px] text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Este ejemplar</p>
                <p className="text-xs text-muted-foreground">
                  Estante, condición, fecha, notas
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "size-[18px] text-muted-foreground transition-transform md:hidden",
                  copyOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            <div
              className={cn(
                "flex-col gap-4 border-t border-border p-3.5 md:flex md:border-t-0",
                copyOpen ? "flex" : "hidden",
              )}
            >
              <Field id="f-shelf" label="Estante">
                <Select
                  value={copy.shelfId}
                  onValueChange={(v) => setCopy((c) => ({ ...c, shelfId: v }))}
                >
                  <SelectTrigger id="f-shelf" className="h-11">
                    <SelectValue placeholder="Elegí un estante (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {shelves.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field id="f-cond" label="Condición">
                <Select
                  value={copy.condition}
                  onValueChange={(v) =>
                    setCopy((c) => ({ ...c, condition: v }))
                  }
                >
                  <SelectTrigger id="f-cond" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field id="f-acq" label="Adquirido">
                <Input
                  id="f-acq"
                  type="date"
                  value={copy.acquiredAt ?? ""}
                  onChange={(e) =>
                    setCopy((c) => ({ ...c, acquiredAt: e.target.value }))
                  }
                  className="h-11"
                />
              </Field>

              <Field id="f-notes" label="Notas">
                <Input
                  id="f-notes"
                  value={copy.notes ?? ""}
                  onChange={(e) =>
                    setCopy((c) => ({ ...c, notes: e.target.value }))
                  }
                  className="h-11"
                  placeholder="Edición firmada, regalo de…"
                />
              </Field>
            </div>
          </div>

          {/* Save: sticky bar on mobile, inline button at md+ */}
          <div className="sticky bottom-0 -mx-4 mt-5 border-t border-border bg-card p-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <Button
              className="h-12 w-full text-[15px] font-semibold"
              loading={saving}
              onClick={() => trySave()}
            >
              Guardar libro
            </Button>
          </div>
        </div>
      </div>

      {dupModal && (
        <DuplicateDialog
          open={!!dupModal}
          onOpenChange={(o) => !o && setDupModal(null)}
          existing={dupModal}
          onAddCopy={() => trySave(true)}
          onSkip={() => setDupModal(null)}
          // onEditExisting omitted → disabled with "Próximamente" tooltip
        />
      )}
    </>
  );
}

/* ---- small local layout helpers ---------------------------------------- */

function FieldShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>{children}</div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
