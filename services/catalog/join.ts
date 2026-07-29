import type { Book } from "../../lib/types/book";
import type { Copy } from "../../lib/types/copy";
import type {
  ReadingEvent,
  ReadingStatus,
} from "../../lib/types/reading-event";
import type { Loan } from "../../lib/types/loan";
import { loanStateForBook } from "../loans/views";
import type { JoinedBook } from "./types";

/**
 * Joins books with their copy-derived shelves, reader-derived reading statuses,
 * and loan state (#17, design D2; #39, design D8). Pure: the cross-collection
 * join Firestore can't do happens here in memory. Reading status and loan state
 * are both derived (data-model Decision D); no denormalized flag is read.
 */
export function joinCatalog(
  books: readonly Book[],
  copies: readonly Copy[],
  events: readonly ReadingEvent[],
  loans: readonly Loan[] = [],
  today?: string,
): JoinedBook[] {
  const shelvesByBook = new Map<string, Set<string>>();
  for (const copy of copies) {
    if (!copy.shelfId) continue;
    let set = shelvesByBook.get(copy.bookId);
    if (!set) shelvesByBook.set(copy.bookId, (set = new Set()));
    set.add(copy.shelfId);
  }

  const statusByBook = new Map<string, Map<string, Set<ReadingStatus>>>();
  for (const event of events) {
    let byReader = statusByBook.get(event.bookId);
    if (!byReader) statusByBook.set(event.bookId, (byReader = new Map()));
    let set = byReader.get(event.readerId);
    if (!set) byReader.set(event.readerId, (set = new Set()));
    set.add(event.status);
  }

  return books.map((book) => {
    const statusMap = statusByBook.get(book.id);
    const statusByReader: Record<string, ReadingStatus[]> = {};
    if (statusMap) {
      for (const [readerId, statuses] of statusMap) {
        statusByReader[readerId] = [...statuses];
      }
    }
    return {
      book,
      shelfIds: [...(shelvesByBook.get(book.id) ?? [])],
      statusByReader,
      loanState: loanStateForBook(book.id, copies, loans, today),
    };
  });
}
