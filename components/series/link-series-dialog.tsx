"use client";

import * as React from "react";
import { Book, ChevronLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { nextPosition, reconcileVolumes } from "@/components/series/link";
import { volumeCounts } from "@/services/series/views";
import type { Series } from "@/lib/types/series";

export interface LinkableBook {
  id: string;
  title: string;
  authors: string[];
  isbn13?: string | null;
  coverUrl?: string | null;
}

type Target = { kind: "new" } | { kind: "existing"; series: Series };

/**
 * Add a book to a series, creating one if none fits yet (#38, design D4). Opens
 * from the book detail when the book isn't part of any tracked series. A two-step
 * flow — pick "nueva serie" or an existing one, then confirm the position —
 * mirroring the wishlist's `ShelfSheet` pattern (a plain button list, then a
 * short form) rather than a dropdown.
 */
export function LinkSeriesDialog({
  open,
  onOpenChange,
  book,
  existingSeries,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: LinkableBook;
  existingSeries: Series[];
  onLinked: (series: Series) => void;
}) {
  const { toast } = useToast();
  const [target, setTarget] = React.useState<Target | null>(null);
  const [name, setName] = React.useState("");
  const [position, setPosition] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!open) {
      setTarget(null);
      setName("");
      setPosition(1);
      setBusy(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  function pick(t: Target) {
    setTarget(t);
    setPosition(t.kind === "existing" ? nextPosition(t.series.volumes) : 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      const snapshot = {
        title: book.title,
        authors: book.authors,
        isbn13: book.isbn13 ?? null,
        coverUrl: book.coverUrl ?? null,
        bookId: book.id,
      };
      let res: Response;
      if (target.kind === "new") {
        if (!name.trim()) return;
        res = await fetch("/api/series", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            volumes: [{ position, ...snapshot }],
          }),
        });
      } else {
        const volumes = reconcileVolumes(
          target.series.volumes,
          position,
          snapshot,
        );
        res = await fetch(`/api/series/${target.series.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ volumes }),
        });
      }
      if (!res.ok) throw new Error(String(res.status));
      const series = (await res.json()) as Series;
      onLinked(series);
      onOpenChange(false);
      toast({ title: `«${book.title}» agregado a «${series.name}»` });
    } catch {
      toast({
        title: "No se pudo agregar el libro a la serie",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {!target ? (
          <>
            <DialogHeader>
              <DialogTitle>Agregar «{book.title}» a una serie</DialogTitle>
              <DialogDescription>
                Creá una serie nueva o sumalo a una que ya tenés.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="h-12 justify-start gap-2"
                onClick={() => pick({ kind: "new" })}
              >
                <Plus aria-hidden="true" />
                Crear serie nueva
              </Button>
              {existingSeries.length > 0 && (
                <p className="mb-0.5 mt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Series del hogar
                </p>
              )}
              {existingSeries.map((s) => {
                const { owned, total } = volumeCounts(s);
                return (
                  <Button
                    key={s.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 py-3"
                    onClick={() => pick({ kind: "existing", series: s })}
                    aria-label={`Agregar a la serie «${s.name}»`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Book className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {owned === total
                          ? `Completa · ${total} ${total === 1 ? "tomo" : "tomos"}`
                          : `${owned} de ${total} ${total === 1 ? "tomo" : "tomos"}`}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <button
                type="button"
                onClick={() => setTarget(null)}
                aria-label="Volver"
                className="mb-1 inline-flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Volver
              </button>
              <DialogTitle>
                {target.kind === "new"
                  ? "Serie nueva"
                  : `Sumar a «${target.series.name}»`}
              </DialogTitle>
            </DialogHeader>
            {target.kind === "new" && (
              <div className="grid gap-1.5">
                <Label htmlFor="new-series-name">Nombre de la serie</Label>
                <Input
                  id="new-series-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="new-series-position">
                Posición de «{book.title}» en la serie
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Bajar la posición"
                  onClick={() => setPosition((p) => Math.max(1, p - 1))}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <Input
                  id="new-series-position"
                  type="number"
                  min={1}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value) || 1)}
                  className="text-center font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Subir la posición"
                  onClick={() => setPosition((p) => p + 1)}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                loading={busy}
                disabled={target.kind === "new" && !name.trim()}
              >
                Agregar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
