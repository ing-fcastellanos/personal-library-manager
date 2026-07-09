"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { StarRating } from "./star-rating";
import { eventDate, formatReadingDate } from "./history";
import { goodreadsSearchUrl } from "./goodreads";

/**
 * One reading event, shared by the global history timeline and the per-book
 * history on the book detail (#26, Claude Design handoff). With `showBook`
 * (default) it leads with the book (cover/title/authors from the event's
 * denormalized snapshot); without it, it leads with the reader (for a book's own
 * history where the book is implied). The optional icon "Editar" appears only when
 * `editable`; the "pendiente de publicar" toggle and "Publicar en Goodreads" link
 * (#34) share that same own-event gate — publishing only makes sense for a
 * reading the active reader themselves recorded.
 */
export function ReadingEventCard({
  event,
  readerName,
  showBook = true,
  editable = false,
  goodreadsUrl,
  onEdit,
  onTogglePublishPending,
}: {
  event: ReadingEvent;
  readerName?: string;
  showBook?: boolean;
  editable?: boolean;
  /** The active reader's own Goodreads profile URL, if configured (ADR-0005). */
  goodreadsUrl?: string | null;
  onEdit?: () => void;
  onTogglePublishPending?: (next: boolean) => void;
}) {
  const name = readerName ?? "Lector";
  const date = formatReadingDate(eventDate(event));

  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <div className="flex gap-3">
        {showBook ? (
          <BookThumb url={event.coverUrl} />
        ) : (
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          {showBook ? (
            <>
              <p className="truncate text-[15px] font-bold leading-tight">
                {event.bookTitle}
              </p>
              <p className="truncate text-[12.5px] text-muted-foreground">
                {event.bookAuthors.join(", ")}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <span className="font-semibold text-foreground">{name}</span>
                {date && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{date}</span>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="truncate text-sm font-semibold">{name}</p>
              {date && <p className="text-xs text-muted-foreground">{date}</p>}
            </>
          )}
        </div>

        {editable && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar tu lectura"
            className="grid size-10 shrink-0 place-items-center rounded-xl border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="size-[15px]" aria-hidden="true" />
          </button>
        )}
      </div>

      {(event.rating != null || event.review) && (
        <div
          className={cn("space-y-1.5", showBook ? "mt-2.5" : "mt-2.5 pl-12")}
        >
          {event.rating != null && (
            <div className="flex items-center gap-2">
              <StarRating
                value={event.rating}
                readOnly
                size={15}
                label={`Calificación de ${name}`}
              />
              <span className="text-xs font-bold">{event.rating}</span>
              <span className="text-xs text-muted-foreground">/ 5</span>
            </div>
          )}
          {event.review && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {event.review}
            </p>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
          {onTogglePublishPending && (
            <label className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={event.publishPending}
                onChange={(e) => onTogglePublishPending(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              Pendiente de publicar
            </label>
          )}
          {goodreadsUrl && (
            <a
              href={goodreadsSearchUrl(event.isbn13, event.bookTitle)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-[12.5px] font-semibold text-primary hover:underline"
            >
              Publicar en Goodreads
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function BookThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-[66px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
      <span
        className="absolute inset-y-0 left-0 w-[2.5px] bg-black/15"
        aria-hidden="true"
      />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
