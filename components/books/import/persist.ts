import { toBookCreateInput } from "@/services/enrichment/types";
import type { BookCreateInput } from "@/lib/types/book";
import type { ProcessedRow } from "./process";
import type { ImportOutcome } from "../import-summary";

/**
 * Persistence for the CSV import wizard (#35, design D6). Two paths per row,
 * chosen by the row's resolved `action`:
 *
 * - `create-new`: `POST /api/books/intake` (book + optional copy in one call,
 *   #14), then `POST /api/reading-events` against the new book.
 * - `use-existing`: skip book creation — `POST /api/copies` against the
 *   matched book only when physical — then `POST /api/reading-events`
 *   against that same book.
 *
 * Both end at the same reading-event call. `use-existing` rows map to the
 * `added_as_copy` outcome bucket regardless of whether a `Copy` was actually
 * created (a digital "use existing" row still means "matched to your
 * existing library", which is what that bucket communicates) — reusing
 * `ImportOutcome` as-is rather than adding a new result value for one edge
 * case (design D8).
 */

/** Builds book fields from the CSV row alone, when enrichment found nothing. */
function bookFromRow(row: ProcessedRow["source"]): BookCreateInput {
  return {
    title: row.title,
    authors: row.authors,
    isbn13: row.isbn,
  };
}

function bookCreateInputFor(processed: ProcessedRow): BookCreateInput {
  return processed.candidate
    ? toBookCreateInput(processed.candidate)
    : bookFromRow(processed.source);
}

async function createReadingEvent(
  readerId: string,
  bookId: string,
  copyId: string | undefined,
  row: ProcessedRow["source"],
): Promise<boolean> {
  try {
    const res = await fetch("/api/reading-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        readerId,
        bookId,
        copyId: copyId ?? null,
        status: "finished",
        dateFinished: row.dateFinished,
        rating: row.rating,
        review: row.review,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Persists one reviewed row, returning its `ImportOutcome`. */
export async function persistRow(
  processed: ProcessedRow,
  readerId: string,
): Promise<ImportOutcome> {
  const base = {
    title: processed.source.title,
    author: processed.source.authors[0],
    coverUrl: processed.candidate?.coverUrl ?? null,
  };

  if (processed.action === "create-new") {
    const payload = {
      book: bookCreateInputFor(processed),
      copy: processed.physical ? { shelfId: null } : undefined,
      coverSourceUrl: processed.candidate?.coverUrl ?? null,
    };
    try {
      const res = await fetch("/api/books/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ...base, result: "failed", retry: { payload } };
      const created = (await res.json()) as {
        book: { id: string };
        copy?: { id: string };
      };
      const ok = await createReadingEvent(
        readerId,
        created.book.id,
        created.copy?.id,
        processed.source,
      );
      if (!ok) {
        // The book (and copy) already exist at this point — retrying via
        // `payload` would call intake again and create a *second* book. There
        // is no safe automatic retry for this narrow window, so this is
        // reported as failed with no `retry`; the book is still in the
        // catalog and can be marked as read normally from its detail page.
        return {
          ...base,
          result: "failed",
          bookId: created.book.id,
          copyId: created.copy?.id,
        };
      }
      return {
        ...base,
        result: "added",
        bookId: created.book.id,
        copyId: created.copy?.id,
      };
    } catch {
      return { ...base, result: "failed", retry: { payload } };
    }
  }

  // use-existing
  const bookId = processed.duplicate?.book.id;
  if (!bookId) return { ...base, result: "failed" };

  let copyId: string | undefined;
  if (processed.physical) {
    try {
      const res = await fetch("/api/copies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (!res.ok) return { ...base, result: "failed" };
      const copy = (await res.json()) as { id: string };
      copyId = copy.id;
    } catch {
      return { ...base, result: "failed" };
    }
  }

  const ok = await createReadingEvent(
    readerId,
    bookId,
    copyId,
    processed.source,
  );
  if (!ok) return { ...base, result: "failed" };
  return { ...base, result: "added_as_copy", bookId, copyId };
}
