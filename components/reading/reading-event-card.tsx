"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { StarRating } from "./star-rating";
import { eventDate, formatReadingDate } from "./history";

/**
 * One reading event, shared by the global history timeline and the per-book
 * history on the book detail (#26). With `showBook` (default) it leads with the
 * book (cover/title/authors from the event's denormalized snapshot); without it,
 * it leads with the reader (for a book's own history where the book is implied).
 * The optional "Editar" affordance appears only when `editable`.
 */
export function ReadingEventCard({
  event,
  readerName,
  showBook = true,
  editable = false,
  onEdit,
}: {
  event: ReadingEvent;
  readerName?: string;
  showBook?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const name = readerName ?? "Lector";
  const date = formatReadingDate(eventDate(event));

  return (
    <div className="flex gap-3 rounded-2xl border bg-card p-3.5">
      {showBook ? (
        <BookThumb url={event.coverUrl} />
      ) : (
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 flex-1">
        {showBook && (
          <>
            <p className="truncate text-sm font-bold leading-tight">
              {event.bookTitle}
            </p>
            <p className="truncate text-[12.5px] text-muted-foreground">
              {event.bookAuthors.join(", ")}
            </p>
          </>
        )}

        <p
          className={
            showBook
              ? "mt-1 text-xs text-muted-foreground"
              : "text-sm font-semibold"
          }
        >
          {showBook ? (
            <>
              {name}
              {date && ` · ${date}`}
            </>
          ) : (
            name
          )}
        </p>
        {!showBook && date && (
          <p className="text-xs text-muted-foreground">Finalizado el {date}</p>
        )}

        {event.rating != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating
              value={event.rating}
              readOnly
              size={16}
              label={`Calificación de ${name}`}
            />
            <span className="text-xs font-bold">{event.rating}</span>
            <span className="text-xs text-muted-foreground">/ 5</span>
          </div>
        )}
        {event.review && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {event.review}
          </p>
        )}
      </div>

      {editable && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar tu lectura"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-accent"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </button>
      )}
    </div>
  );
}

function BookThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-[70px] w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
      <span
        className="absolute inset-y-0 left-0 w-[3px] bg-black/15"
        aria-hidden="true"
      />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
