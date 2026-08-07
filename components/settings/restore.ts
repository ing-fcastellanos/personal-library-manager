import { z } from "zod";
import { bookSchema } from "@/lib/types/book";
import { copySchema } from "@/lib/types/copy";
import { readingEventSchema } from "@/lib/types/reading-event";
import { readerSchema } from "@/lib/types/reader";
import { shelfSchema } from "@/lib/types/shelf";
import { wishlistItemSchema } from "@/lib/types/wishlist-item";
import { loanSchema } from "@/lib/types/loan";
import { seriesSchema } from "@/lib/types/series";
import type { Backup } from "./backup";

/**
 * Validation and snapshot helpers for restoring a JSON backup (#93). Reuses
 * the same entity schemas as the live app (`lib/types/*`) so a file that
 * isn't a real backup of this app is rejected before any data is touched —
 * `restore-run.ts` only ever receives an already-validated `Backup`.
 */
const backupSchema = z.object({
  exportedAt: z.string(),
  books: z.array(bookSchema),
  copies: z.array(copySchema),
  readingEvents: z.array(readingEventSchema),
  readers: z.array(readerSchema),
  shelves: z.array(shelfSchema),
  wishlistItems: z.array(wishlistItemSchema),
  loans: z.array(loanSchema),
  series: z.array(seriesSchema),
});

export type ParsedBackup =
  { ok: true; backup: Backup } | { ok: false; errors: string[] };

/** Parses and validates an uploaded backup file's JSON content. */
export function parseBackupFile(json: unknown): ParsedBackup {
  const result = backupSchema.safeParse(json);
  if (result.success) return { ok: true, backup: result.data };
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}

export interface EntityCounts {
  readers: number;
  shelves: number;
  books: number;
  copies: number;
  series: number;
  readingEvents: number;
  wishlistItems: number;
  loans: number;
}

/** Per-entity-type counts, used for both the impact preview and progress totals. */
export function entityCounts(backup: Backup): EntityCounts {
  return {
    readers: backup.readers.length,
    shelves: backup.shelves.length,
    books: backup.books.length,
    copies: backup.copies.length,
    series: backup.series.length,
    readingEvents: backup.readingEvents.length,
    wishlistItems: backup.wishlistItems.length,
    loans: backup.loans.length,
  };
}

export interface CleanupSnapshot {
  loans: string[];
  readingEvents: string[];
  wishlistItems: string[];
  copies: string[];
  books: string[];
  series: string[];
  shelves: string[];
}

/**
 * The ids that exist right now, captured before restoring — this is what the
 * cleanup phase deletes once the create phase succeeds in full. Readers are
 * excluded: restore never creates or deletes a reader (design.md).
 */
export function snapshotFromBackup(current: Backup): CleanupSnapshot {
  return {
    loans: current.loans.map((l) => l.id),
    readingEvents: current.readingEvents.map((e) => e.id),
    wishlistItems: current.wishlistItems.map((w) => w.id),
    copies: current.copies.map((c) => c.id),
    books: current.books.map((b) => b.id),
    series: current.series.map((s) => s.id),
    shelves: current.shelves.map((s) => s.id),
  };
}
