"use client";

import * as React from "react";
import { ChevronDown, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The captured shelf photo, kept on hand while reading the results (#21b
 * follow-up). Judging whether an identified book is really the one on the shelf
 * means checking it against what was in frame, and the photo was previously
 * discarded the moment it was sent.
 *
 * Collapsed by default on purpose: a shelf photo is tall, and opening expanded
 * would push the auto/review buckets — the reason the reader is on this screen —
 * off a phone viewport.
 *
 * Tapping the photo opens it full screen. Inline it is roughly 330px wide on a
 * phone, which is enough to orient yourself but not to read a spine, and reading
 * a spine is the entire point of looking. The full-screen view deliberately has
 * no custom pan/zoom: it renders at viewport width and mobile browsers already
 * pinch-zoom an image better than a hand-rolled viewer would.
 */
export function ShelfPhotoPanel({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);
  const panelId = React.useId();

  return (
    <div className={cn("rounded-xl border border-border", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
      >
        <ImageIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="flex-1">Foto del estante</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={panelId} className="px-3 pb-3">
          {/* Labelled by what it does, not by the image it wraps: without this
              its accessible name is inherited from the `alt` and collides with
              the toggle above, leaving two controls announced almost alike. */}
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Ver la foto del estante más grande"
            className="block w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Foto del estante que se analizó"
              className="w-full"
            />
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Tocá la foto para verla más grande.
          </p>
        </div>
      )}

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        {/* Edge-to-edge on phones: the primitive's `p-6` + `max-w-lg` left the
            "enlarged" photo narrower than the inline one, which defeats the
            point of opening it. Padding and the width cap come back from `sm`. */}
        <DialogContent className="max-w-none p-0 sm:max-w-3xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Foto del estante</DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-auto">
            {/* Rendered at its natural width and scrollable rather than shrunk
                to fit: a shelf photo is wide, so fitting it to a portrait phone
                is exactly what makes spines unreadable. Panning a large image
                beats a perfectly framed thumbnail nobody can read. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Foto del estante que se analizó, ampliada"
              className="max-w-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
