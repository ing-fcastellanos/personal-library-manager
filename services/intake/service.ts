import { createBook, updateBook } from "../books/repository";
import { createCopy } from "../copies/service";
import { rehostCover } from "../enrichment/cover";
import { toIsbn13 } from "../enrichment/normalize";
import type { Book, BookCreateInput } from "../../lib/types/book";
import type { Copy, CopyCreateInput } from "../../lib/types/copy";

/**
 * Manual book intake (#14, design D1/D2). Orchestrates the "save a new book"
 * step: create the `Book` (#12), best-effort re-host its cover to Storage (#13 —
 * this is where `rehostCover` finally gets wired), then create the owned `Copy`
 * (#12). Server-mediated; the route enforces auth and validation.
 *
 * Re-hosting is best-effort: a failed cover download never fails the intake. The
 * cover dependency is injectable for network/Storage-free tests.
 */

/** Copy fields accepted on intake — `bookId` is set by the server. */
export type IntakeCopyInput = Omit<CopyCreateInput, "bookId">;

export interface IntakeInput {
  book: BookCreateInput;
  copy?: IntakeCopyInput;
  coverSourceUrl?: string | null;
}

export interface IntakeDeps {
  rehost?: typeof rehostCover;
}

export async function intakeBook(
  input: IntakeInput,
  deps: IntakeDeps = {},
): Promise<{ book: Book; copy: Copy }> {
  const rehost = deps.rehost ?? rehostCover;

  // The book always carries the external cover as a fallback (design D2); a
  // successful re-host overrides it with the internal Storage URL below.
  const coverUrl = input.coverSourceUrl ?? input.book.coverUrl ?? null;
  const book = await createBook({
    ...input.book,
    coverUrl,
    // A cover present at intake originates from metadata enrichment (#15 D5).
    coverSource: coverUrl ? "metadata" : null,
  });

  // Best-effort cover re-hosting: needs an ISBN-13 for the deterministic path.
  // A failed/absent re-host leaves the external (or null) coverUrl untouched.
  let finalBook = book;
  const isbn13 = book.isbn13 ?? toIsbn13(input.book.isbn13 ?? null);
  if (coverUrl && isbn13) {
    const internalUrl = await rehost(coverUrl, isbn13);
    if (internalUrl) {
      finalBook =
        (await updateBook(book.id, { coverUrl: internalUrl })) ?? book;
    }
  }

  // Copy creation validates an optional `shelfId` (copies service #12 D3); a
  // ReferenceNotFoundError propagates to the route as a 400.
  const copy = await createCopy({ bookId: book.id, ...(input.copy ?? {}) });

  return { book: finalBook, copy };
}
