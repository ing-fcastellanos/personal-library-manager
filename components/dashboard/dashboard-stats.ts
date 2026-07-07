import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/**
 * Pure dashboard aggregation (#27). All KPIs derive from the existing list
 * endpoints (books, copies, reading-events, readers) — no backend aggregation —
 * so they stay unit-testable and free of I/O. A book is "read" when it has any
 * `finished` reading event; "pending" otherwise.
 */

export interface PerReaderStat {
  readerId: string;
  name: string;
  finished: number;
}

export interface Kpis {
  books: number;
  copies: number;
  read: number;
  pending: number;
  authors: number;
  publishers: number;
  categories: number;
  perReader: PerReaderStat[];
}

/** Distinct book ids that have at least one `finished` event (optionally by one reader). */
function finishedBookIds(
  events: ReadingEvent[],
  readerId?: string,
): Set<string> {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.status !== "finished") continue;
    if (readerId && e.readerId !== readerId) continue;
    ids.add(e.bookId);
  }
  return ids;
}

export function computeKpis(
  books: Book[],
  copies: Copy[],
  events: ReadingEvent[],
  readers: Reader[],
): Kpis {
  const read = finishedBookIds(events).size;

  const authors = new Set<string>();
  const categories = new Set<string>();
  const publishers = new Set<string>();
  for (const b of books) {
    (b.authorKeys ?? []).forEach((k) => authors.add(k));
    (b.categoryKeys ?? []).forEach((k) => categories.add(k));
    const p = b.publisher?.trim().toLowerCase();
    if (p) publishers.add(p);
  }

  return {
    books: books.length,
    copies: copies.length,
    read,
    // Guard against events referencing books not in the list.
    pending: Math.max(0, books.length - read),
    authors: authors.size,
    publishers: publishers.size,
    categories: categories.size,
    perReader: readers.map((r) => ({
      readerId: r.id,
      name: r.name,
      finished: finishedBookIds(events, r.id).size,
    })),
  };
}
