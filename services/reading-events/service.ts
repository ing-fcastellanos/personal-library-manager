import type {
  ReadingEvent,
  ReadingEventCreateInput,
} from "../../lib/types/reading-event";
import { getReader } from "../readers/repository";
import { getBook } from "../books/repository";
import { getCopy } from "../copies/repository";
import { createReadingEvent as insertReadingEvent } from "./repository";

/**
 * Thrown when a reading event references a `readerId`/`bookId`/`copyId` that does
 * not exist (#12 D3). Routes map this to a 400.
 */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly field: "readerId" | "bookId" | "copyId") {
    super(`referenced ${field} does not exist`);
    this.name = "ReferenceNotFoundError";
  }
}

/**
 * Creates a reading event: validates the reader, book, and optional copy exist,
 * then composes the denormalized book snapshot (#12 D1/D3, ADR-0007). The reader
 * is attributed from the supplied `readerId` (ADR-0013), not the session.
 */
export async function createReadingEvent(
  input: ReadingEventCreateInput,
): Promise<ReadingEvent> {
  if (!(await getReader(input.readerId))) {
    throw new ReferenceNotFoundError("readerId");
  }
  const book = await getBook(input.bookId);
  if (!book) {
    throw new ReferenceNotFoundError("bookId");
  }
  if (input.copyId && !(await getCopy(input.copyId))) {
    throw new ReferenceNotFoundError("copyId");
  }

  return insertReadingEvent({
    readerId: input.readerId,
    bookId: input.bookId,
    copyId: input.copyId ?? null,
    status: input.status,
    dateStarted: input.dateStarted ?? null,
    dateFinished: input.dateFinished ?? null,
    rating: input.rating ?? null,
    review: input.review ?? null,
    publishPending: false,
    // Denormalized snapshot of the book at event time (ADR-0007).
    bookTitle: book.title,
    bookAuthors: book.authors,
    isbn13: book.isbn13 ?? null,
    coverUrl: book.coverUrl ?? null,
  });
}
