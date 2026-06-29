"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IdentifyCandidate } from "./photo-add";

/**
 * Full-metadata preview for a shelf book (#21b cherry-pick). Shows the same info
 * as the catalog detail (cover, title/subtitle/authors, meta grid, categories,
 * description) for an enrichment candidate that hasn't been saved yet — so a
 * reader can decide whether to include it in the batch.
 */
export function ShelfBookDialog({
  candidate,
  onClose,
}: {
  candidate: IdentifyCandidate | null;
  onClose: () => void;
}) {
  const c = candidate;
  const meta = (
    [
      ["Editorial", c?.publisher],
      ["Año", c?.publishedYear],
      ["ISBN", c?.isbn13],
      ["Idioma", c?.language],
      ["Páginas", c?.pageCount],
    ] as [string, string | number | null | undefined][]
  ).filter(([, v]) => v != null && v !== "") as [string, string | number][];

  return (
    <Dialog open={c !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{c.title}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4">
              <span className="relative h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow">
                {c.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
                <span className="absolute inset-y-0 left-0 w-[3px] bg-black/15" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight tracking-tight">
                  {c.title}
                </h2>
                {c.subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.subtitle}
                  </p>
                )}
                {(c.authors ?? []).length > 0 && (
                  <p className="mt-2 text-sm font-semibold">
                    {(c.authors ?? []).join(", ")}
                  </p>
                )}
                {meta.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
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
              </div>
            </div>

            {(c.categories ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(c.categories ?? []).map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            {c.description && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Descripción
                </p>
                <p className="text-sm leading-relaxed">{c.description}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
