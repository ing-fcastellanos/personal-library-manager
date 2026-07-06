import type { ReadingEventCreateInput } from "@/lib/types/reading-event";

/**
 * Pure helpers for the mark-as-read flow (#24). Kept separate from the React
 * containers so date defaulting, the create payload, and the photo→library match
 * are unit-testable.
 */

/** The minimal book shape the confirm sheet needs (from search, photo, or detail). */
export interface MarkTarget {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string | null;
  isbn13?: string | null;
}

/** A library-book match as returned by `GET /api/books/duplicates`. */
export interface DuplicateMatch {
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl?: string | null;
  };
  existingCopies: number;
}

/** Local (not UTC) `YYYY-MM-DD` for today — the default finish date. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Builds the `POST /api/reading-events` body for a finished reading. `copyId` and
 * `dateStarted` are only included when set; an empty finish date is omitted so the
 * server keeps it null rather than storing "".
 */
export function readingEventCreateBody(input: {
  readerId: string;
  bookId: string;
  copyId?: string | null;
  dateFinished?: string;
  dateStarted?: string;
}): ReadingEventCreateInput {
  return {
    readerId: input.readerId,
    bookId: input.bookId,
    status: "finished",
    copyId: input.copyId || null,
    dateFinished: input.dateFinished || null,
    dateStarted: input.dateStarted || null,
  };
}

/**
 * Resolves an identified candidate to a book already in the library from the
 * duplicate-check matches. `/leido` can only mark library books, so a null result
 * means "not in the library" (offer to add first).
 */
export function matchToLibrary(
  matches: DuplicateMatch[] | undefined,
): MarkTarget | null {
  const m = matches?.[0];
  if (!m) return null;
  return {
    id: m.book.id,
    title: m.book.title,
    authors: m.book.authors ?? [],
    coverUrl: m.book.coverUrl ?? null,
  };
}
