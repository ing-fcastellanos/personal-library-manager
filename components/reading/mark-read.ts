import type {
  ReadingEventCreateInput,
  ReadingEventUpdateInput,
} from "@/lib/types/reading-event";

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

/** Normalizes a raw rating to an int 1–5, or null when unset/out of range (#25). */
export function normalizeRating(rating?: number | null): number | null {
  if (rating == null) return null;
  const r = Math.round(rating);
  return r >= 1 && r <= 5 ? r : null;
}

/** Normalizes review text: trimmed, or null when empty (#25). */
export function normalizeReview(review?: string | null): string | null {
  const r = review?.trim();
  return r ? r : null;
}

/**
 * Builds the `POST /api/reading-events` body for a finished reading. `copyId`,
 * `dateStarted`, `rating`, and `review` are normalized so unset values become
 * null (the server keeps them null rather than storing "" or an invalid rating).
 */
export function readingEventCreateBody(input: {
  readerId: string;
  bookId: string;
  copyId?: string | null;
  dateFinished?: string;
  dateStarted?: string;
  rating?: number | null;
  review?: string | null;
}): ReadingEventCreateInput {
  return {
    readerId: input.readerId,
    bookId: input.bookId,
    status: "finished",
    copyId: input.copyId || null,
    dateFinished: input.dateFinished || null,
    dateStarted: input.dateStarted || null,
    rating: normalizeRating(input.rating),
    review: normalizeReview(input.review),
  };
}

/**
 * Builds the `PATCH /api/reading-events/:id` body when editing a reading (#25).
 * Omits `status` (the edit never changes it) and normalizes dates/rating/review;
 * a cleared rating or empty review is sent as null so the change persists.
 */
export function readingEventUpdateBody(input: {
  dateFinished?: string;
  dateStarted?: string;
  rating?: number | null;
  review?: string | null;
}): ReadingEventUpdateInput {
  return {
    dateFinished: input.dateFinished || null,
    dateStarted: input.dateStarted || null,
    rating: normalizeRating(input.rating),
    review: normalizeReview(input.review),
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
