import type { ReadingEvent } from "@/lib/types/reading-event";

/**
 * Pure helpers for the reading history (#26). The timeline loads all events and
 * filters them client-side, so these stay unit-testable and free of I/O.
 */

/** Filters applied together (AND) over the loaded events. */
export interface HistoryFilters {
  readerId?: string;
  /** Exact rating 1–5. */
  rating?: number;
  /** Inclusive `YYYY-MM-DD` bounds over the event's date. */
  from?: string;
  to?: string;
}

/**
 * The date an event is placed at / filtered by: the finish date when set,
 * falling back to `createdAt` so undated events still appear. Returned as
 * `YYYY-MM-DD` (both sources are ISO, so a lexical compare is chronological).
 */
export function eventDate(ev: ReadingEvent): string {
  return (ev.dateFinished ?? ev.createdAt ?? "").slice(0, 10);
}

/** Formats an ISO date (`YYYY-MM-DD` or full ISO) as es-AR "6 jul 2026" (local, no TZ shift). */
export function formatReadingDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!day) return "";
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Applies every active filter; an event is kept only if it matches all of them. */
export function filterEvents(
  events: ReadingEvent[],
  filters: HistoryFilters = {},
): ReadingEvent[] {
  const { readerId, rating, from, to } = filters;
  return events.filter((ev) => {
    if (readerId && ev.readerId !== readerId) return false;
    if (rating != null && ev.rating !== rating) return false;
    if (from || to) {
      const d = eventDate(ev);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }
    return true;
  });
}
