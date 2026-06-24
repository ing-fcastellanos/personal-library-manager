"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the enrich call: cover + field skeletons. */
export function EnrichSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      <div
        className="mb-5 flex items-center gap-2.5 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span
          className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
        Buscando metadata del libro…
      </div>

      <div className="mb-5 flex gap-3.5">
        <Skeleton className="h-[124px] w-[84px] rounded-[10px]" />
        <div className="flex flex-1 flex-col gap-2.5 pt-1">
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-[72%]" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3 w-1/3" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Book cover preview (from metadata, not uploadable). */
export function CoverPreview({
  url,
  title,
  className,
}: {
  url?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-[124px] w-[84px] shrink-0 overflow-hidden rounded-[10px] shadow-md",
        !url && "bg-gradient-to-br from-primary to-accent",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title ? `Portada de ${title}` : ""}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            className="absolute inset-y-0 left-0 w-[5px] bg-black/20"
            aria-hidden="true"
          />
          <span className="absolute left-3.5 right-2 top-3.5 text-[9px] font-bold uppercase leading-tight text-white/90">
            {title}
          </span>
        </>
      )}
    </div>
  );
}
