"use client";

import * as React from "react";
import { RefreshCw, RotateCw, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { FieldShell } from "./field";
import { BookFields } from "./book-fields";
import { CopyFields } from "./copy-fields";
import { CoverField } from "./cover-field";
import { EnrichSkeleton } from "./enrich-skeleton";
import {
  ReEnrichDialog,
  type FieldDiff,
  type DiffChoice,
} from "./re-enrich-dialog";
import { type BookData, type CopyData, type Shelf, emptyBook } from "./types";

export type EditPhase = "loading" | "form" | "saving" | "error" | "success";

export interface EditBookFormProps {
  bookId: string;
  shelves?: Shelf[];
  /** Load the current Book + Copy for the id. */
  onLoad: (id: string) => Promise<{ book: BookData; copy: CopyData }>;
  /** Upload a new cover image, resolve with its URL. */
  onUploadCover: (file: File) => Promise<string>;
  /** Fetch source metadata and return only the differing fields. */
  onReEnrich: (book: BookData) => Promise<FieldDiff[]>;
  /** Persist edits. */
  onSave: (id: string, book: BookData, copy: CopyData) => Promise<void>;
  onDone?: () => void;
}

/**
 * Edit an existing library book (`/libros/[id]/editar`). Same visual language
 * as the add screen (#14) — reuses BookFields / CopyFields / CoverField — but
 * with a load → edit → save flow plus a re-enrich diff panel.
 *
 * Mobile: single column, sticky save bar. md+: two columns (book left, copy
 * right) consistent with #14.
 */
export function EditBookForm({
  bookId,
  shelves = [],
  onLoad,
  onUploadCover,
  onReEnrich,
  onSave,
  onDone,
}: EditBookFormProps) {
  const { toast } = useToast();

  const [phase, setPhase] = React.useState<EditPhase>("loading");
  const [book, setBook] = React.useState<BookData>(emptyBook);
  const [copy, setCopy] = React.useState<CopyData>({});
  const [errors, setErrors] = React.useState<{ title?: string }>({});

  const [reOpen, setReOpen] = React.useState(false);
  const [diffs, setDiffs] = React.useState<FieldDiff[]>([]);
  const [reLoading, setReLoading] = React.useState(false);

  // initial load — `phase` already defaults to "loading" so the effect only
  // resolves into form/error (no synchronous setState on mount).
  React.useEffect(() => {
    let alive = true;
    onLoad(bookId)
      .then(({ book, copy }) => {
        if (!alive) return;
        setBook(book);
        setCopy(copy);
        setPhase("form");
      })
      .catch(() => alive && setPhase("error"));
    return () => {
      alive = false;
    };
  }, [bookId, onLoad]);

  function validate() {
    const next: { title?: string } = {};
    if (!book.title.trim()) next.title = "El título es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setPhase("saving");
    try {
      await onSave(bookId, book, copy);
      setPhase("success");
      toast({
        variant: "success",
        title: "Cambios guardados",
        description: "El libro se actualizó.",
      });
      onDone?.();
    } catch {
      setPhase("error");
    }
  }

  async function openReEnrich() {
    setReLoading(true);
    try {
      const d = await onReEnrich(book);
      setDiffs(d);
      setReOpen(true);
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo re-enriquecer",
        description: "Probá más tarde.",
      });
    } finally {
      setReLoading(false);
    }
  }

  function applyDiffs(choices: DiffChoice, applied: FieldDiff[]) {
    const next: BookData = { ...book };
    for (const d of applied) {
      if (choices[d.key as string] === "source" && d.key !== "cover") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (next as any)[d.key] = d.sourceValue;
      } else if (choices[d.key as string] === "source" && d.key === "cover") {
        next.coverUrl = d.sourceValue as string;
      }
    }
    setBook(next);
    setReOpen(false);
  }

  // ---- non-form phases ----------------------------------------------------
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
          Hubo un problema al guardar los cambios. Tus ediciones siguen acá —
          probá de nuevo.
        </p>
        <Button className="mt-6 h-11 gap-2" onClick={() => setPhase("form")}>
          <RotateCw className="size-[17px]" />
          Volver e intentar
        </Button>
      </FieldShell>
    );
  }

  if (phase === "success") {
    return (
      <FieldShell className="flex flex-col items-center py-10 text-center">
        <span className="grid size-[72px] place-items-center rounded-full bg-success text-success-foreground">
          <Check className="size-9" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold">Cambios guardados</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Actualizamos “{book.title}”.
        </p>
        <Button className="mt-6 w-full max-w-60" onClick={onDone}>
          Volver al libro
        </Button>
      </FieldShell>
    );
  }

  // ---- form / saving ------------------------------------------------------
  const busy = phase === "saving";

  return (
    <>
      {/* Re-enrich trigger — place in the page header in real use */}
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          loading={reLoading}
          onClick={openReEnrich}
        >
          <RefreshCw className="size-[15px]" />
          Re-enriquecer desde fuentes
        </Button>
      </div>

      <fieldset
        disabled={busy}
        className={cn(
          "flex flex-col gap-5 border-0 p-0 md:flex-row md:items-start md:gap-8",
          busy && "opacity-70",
        )}
      >
        {/* Book column */}
        <div className="flex-1 md:max-w-xl">
          <div className="mb-5">
            <CoverField
              url={book.coverUrl}
              title={book.title}
              onUpload={onUploadCover}
              onChange={(url) => setBook((b) => ({ ...b, coverUrl: url }))}
            />
          </div>
          <BookFields
            value={book}
            onChange={setBook}
            errors={errors}
            onClearError={() => setErrors({})}
            idPrefix="eb"
          />
        </div>

        {/* Copy column */}
        <div className="md:w-72 md:shrink-0">
          <CopyFields
            value={copy}
            onChange={setCopy}
            shelves={shelves}
            idPrefix="ec"
          />

          <div className="sticky bottom-0 -mx-4 mt-5 flex gap-2.5 border-t border-border bg-card p-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={onDone}
            >
              Cancelar
            </Button>
            <Button
              className="h-12 flex-1 text-[15px] font-semibold"
              loading={busy}
              onClick={save}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </fieldset>

      <ReEnrichDialog
        open={reOpen}
        onOpenChange={setReOpen}
        diffs={diffs}
        onApply={applyDiffs}
      />
    </>
  );
}
