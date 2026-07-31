import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import type { Shelf } from "@/lib/types/shelf";
import type { WishlistItem } from "@/lib/types/wishlist-item";
import type { Loan } from "@/lib/types/loan";
import type { Series } from "@/lib/types/series";

/**
 * Full JSON backup (#36, design D1-D3). Pure client-side aggregation of the
 * app's existing public list endpoints — no new backend route. `/api/readers`
 * already strips `pinHash` via `toClientReader()`, so this carries no auth
 * secrets without any extra filtering here.
 */
export interface Backup {
  exportedAt: string;
  books: Book[];
  copies: Copy[];
  readingEvents: ReadingEvent[];
  readers: Reader[];
  shelves: Shelf[];
  wishlistItems: WishlistItem[];
  loans: Loan[];
  series: Series[];
}

async function listOrEmpty<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/** Fetches every collection in parallel and assembles the backup object. */
export async function fetchBackup(): Promise<Backup> {
  const [
    books,
    copies,
    readingEvents,
    readers,
    shelves,
    wishlistItems,
    loans,
    series,
  ] = await Promise.all([
    listOrEmpty<Book>("/api/books"),
    listOrEmpty<Copy>("/api/copies"),
    listOrEmpty<ReadingEvent>("/api/reading-events"),
    listOrEmpty<Reader>("/api/readers"),
    listOrEmpty<Shelf>("/api/shelves"),
    listOrEmpty<WishlistItem>("/api/wishlist-items"),
    listOrEmpty<Loan>("/api/loans"),
    listOrEmpty<Series>("/api/series"),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    books,
    copies,
    readingEvents,
    readers,
    shelves,
    wishlistItems,
    loans,
    series,
  };
}

/** `backup-biblioteca-<YYYY-MM-DD>.json`, date-stamped (design D6). */
export function backupFilename(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  return `backup-biblioteca-${iso}.json`;
}
