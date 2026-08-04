import { Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddToWishlistButton } from "@/components/wishlist/add-to-wishlist-button";
import { isMissing } from "@/services/series/views";
import type { SeriesVolume } from "@/lib/types/series";

/**
 * One volume of a series: position, cover swatch, title/authors, and its
 * owned/missing status (#38, Claude Design handoff "Series.dc.html") — a
 * missing volume offers a full-width "Agregar a deseos" (same weight as the
 * loan card's Prestar/Devolver actions), an owned one shows a "Tenés" badge.
 * Shared by the book detail's inline "Serie" section and the series dialog's
 * view mode so both render identically.
 */
export function VolumeRow({
  volume,
  highlight,
}: {
  volume: SeriesVolume;
  highlight?: boolean;
}) {
  const missing = isMissing(volume);
  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-card p-2.5",
        highlight &&
          "border-primary bg-accent shadow-[inset_3px_0_0_rgb(var(--primary))]",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold",
            highlight
              ? "bg-primary text-primary-foreground"
              : missing
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {volume.position}
        </span>
        <div
          aria-hidden="true"
          className={cn(
            "flex h-[50px] w-[34px] shrink-0 items-center justify-center rounded-md",
            missing
              ? "border border-dashed border-border bg-muted text-muted-foreground"
              : "bg-gradient-to-br from-primary to-accent",
          )}
        >
          {missing && <Bookmark className="size-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {volume.title}
          </p>
          {volume.authors.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {volume.authors.join(", ")}
            </p>
          )}
          {highlight && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-accent-foreground">
              <Bookmark className="size-3" aria-hidden="true" />
              Este libro
            </span>
          )}
        </div>
        {!missing && (
          <Badge variant="secondary" className="shrink-0">
            <Check aria-hidden="true" />
            Tenés
          </Badge>
        )}
      </div>
      {missing && (
        <AddToWishlistButton
          snapshot={{
            bookTitle: volume.title,
            bookAuthors: volume.authors,
            isbn13: volume.isbn13,
            coverUrl: volume.coverUrl,
          }}
          // Reuses the "catalog" origin: this add happens from a catalog-adjacent
          // surface (the series section/dialog), not a manual/ISBN/AI entry point.
          addedVia="catalog"
          label={`Agregar «${volume.title}» a deseos`}
          variant="secondary"
          className="h-11 w-full"
        />
      )}
    </li>
  );
}
