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

/**
 * Distribution helpers (#28). All computed client-side from the same data the
 * dashboard already loads — no aggregation endpoint. "Categoría" and "género"
 * are the same axis (`categoryKeys`); the model has no separate genre field.
 */

export interface DistributionEntry {
  key: string;
  label: string;
  count: number;
}

/**
 * Keeps the top `n` entries by count (desc); collapses the remainder into a
 * single `{ key: "otros", label: "Otros", count }` bucket. Omits the bucket
 * when there is nothing left to collapse.
 */
export function topN(entries: DistributionEntry[], n = 6): DistributionEntry[] {
  const sorted = [...entries].sort((a, b) => b.count - a.count);
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const restCount = sorted.slice(n).reduce((sum, e) => sum + e.count, 0);
  return [...top, { key: "otros", label: "Otros", count: restCount }];
}

/** Counts + first-seen label per key, from parallel `labels`/`keys` arrays across books. */
function countByKey(
  books: Book[],
  keys: (b: Book) => string[],
  labels: (b: Book) => string[],
): DistributionEntry[] {
  const labelByKey = new Map<string, string>();
  const countByKeyMap = new Map<string, number>();
  for (const b of books) {
    const ks = keys(b);
    const ls = labels(b);
    ks.forEach((k, i) => {
      if (!labelByKey.has(k)) labelByKey.set(k, ls[i] ?? k);
      countByKeyMap.set(k, (countByKeyMap.get(k) ?? 0) + 1);
    });
  }
  return [...countByKeyMap.entries()].map(([key, count]) => ({
    key,
    label: labelByKey.get(key) ?? key,
    count,
  }));
}

export function booksByCategory(books: Book[]): DistributionEntry[] {
  return topN(
    countByKey(
      books,
      (b) => b.categoryKeys ?? [],
      (b) => b.categories ?? [],
    ),
  );
}

export function booksByAuthor(books: Book[]): DistributionEntry[] {
  return topN(
    countByKey(
      books,
      (b) => b.authorKeys ?? [],
      (b) => b.authors ?? [],
    ),
  );
}

export function booksByPublisher(books: Book[]): DistributionEntry[] {
  // Publisher has no separate key/label pair — the lowercased name is the key,
  // the first-seen trimmed name is the label.
  const labelByKey = new Map<string, string>();
  const countByKeyMap = new Map<string, number>();
  for (const b of books) {
    const p = b.publisher?.trim();
    if (!p) continue;
    const key = p.toLowerCase();
    if (!labelByKey.has(key)) labelByKey.set(key, p);
    countByKeyMap.set(key, (countByKeyMap.get(key) ?? 0) + 1);
  }
  return topN(
    [...countByKeyMap.entries()].map(([key, count]) => ({
      key,
      label: labelByKey.get(key) ?? key,
      count,
    })),
  );
}

/**
 * Finished-reading counts per category: for each `finished` event, looks up its
 * book by `bookId` and counts each of the book's categories. Events whose book
 * isn't found (e.g. deleted) are skipped.
 */
export function readingsByCategory(
  books: Book[],
  events: ReadingEvent[],
): DistributionEntry[] {
  const bookById = new Map(books.map((b) => [b.id, b]));
  const labelByKey = new Map<string, string>();
  const countByKeyMap = new Map<string, number>();
  for (const e of events) {
    if (e.status !== "finished") continue;
    const book = bookById.get(e.bookId);
    if (!book) continue;
    const keys = book.categoryKeys ?? [];
    const labels = book.categories ?? [];
    keys.forEach((k, i) => {
      if (!labelByKey.has(k)) labelByKey.set(k, labels[i] ?? k);
      countByKeyMap.set(k, (countByKeyMap.get(k) ?? 0) + 1);
    });
  }
  return topN(
    [...countByKeyMap.entries()].map(([key, count]) => ({
      key,
      label: labelByKey.get(key) ?? key,
      count,
    })),
  );
}
