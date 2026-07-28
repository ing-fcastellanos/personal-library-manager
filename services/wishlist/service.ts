import { slugify, arraySlugs } from "../../lib/text/slug";
import type {
  WishlistItem,
  WishlistItemCreateInput,
} from "../../lib/types/wishlist-item";
import type { Copy, CopyCreateInput } from "../../lib/types/copy";
import type { Book, BookCreateInput } from "../../lib/types/book";
import { getReader } from "../readers/repository";
import { getBook } from "../books/repository";
import { createCopy } from "../copies/service";
import { intakeBook } from "../intake/service";
import { findBookDuplicates } from "../duplicates/service";
import type { DuplicateCandidate, DuplicateResult } from "../duplicates/types";
import {
  createWishlistItem as insertWishlistItem,
  getWishlistItem,
  setWishlistItemBook,
} from "./repository";

/**
 * Thrown when a wishlist item references a `readerId`/`bookId` that does not exist.
 * Mirrors the reading-events service; routes map this to a 400.
 */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly field: "readerId" | "bookId") {
    super(`referenced ${field} does not exist`);
    this.name = "ReferenceNotFoundError";
  }
}

/** Thrown by acquisition when the item id does not exist. */
export class WishlistItemNotFoundError extends Error {
  constructor() {
    super("wishlist item not found");
    this.name = "WishlistItemNotFoundError";
  }
}

/**
 * Creates a wishlist item: validates the reader exists (and the book when a
 * `bookId` is supplied), derives the `titleKey`/`authorKeys` match keys from the
 * snapshot server-side (design D6), then inserts. No `Copy` is created (design D2).
 */
export async function createWishlistItem(
  input: WishlistItemCreateInput,
): Promise<WishlistItem> {
  if (!(await getReader(input.readerId))) {
    throw new ReferenceNotFoundError("readerId");
  }
  if (input.bookId && !(await getBook(input.bookId))) {
    throw new ReferenceNotFoundError("bookId");
  }

  const bookAuthors = input.bookAuthors ?? [];
  return insertWishlistItem({
    readerId: input.readerId,
    bookId: input.bookId ?? null,
    status: input.status ?? "wanted",
    priority: input.priority ?? "normal",
    addedVia: input.addedVia,
    bookTitle: input.bookTitle,
    bookAuthors,
    isbn13: input.isbn13 ?? null,
    coverUrl: input.coverUrl ?? null,
    titleKey: slugify(input.bookTitle) || null,
    authorKeys: arraySlugs(bookAuthors),
  });
}

/**
 * Warns whether the wanted book already exists in the catalog and how many copies
 * the household holds — a thin pass-through to the existing duplicate detector
 * (#16), which already takes loose metadata and attaches the copy count. Read-only;
 * never blocks the add (design, "Warn when the wanted book is already owned").
 */
export async function checkAlreadyOwned(
  candidate: DuplicateCandidate,
): Promise<DuplicateResult> {
  return findBookDuplicates(candidate);
}

export interface AcquireResult {
  item: WishlistItem;
  book: Book;
  copy: Copy;
}

export interface AcquireDeps {
  intake?: typeof intakeBook;
}

/**
 * Marks a wished-for book as acquired (design D12): when the item is already linked
 * to a catalog book, create a `Copy` for it; otherwise run the full intake (create
 * the `Book` from the snapshot + its `Copy`, re-hosting the cover) and backfill the
 * item's `bookId`. The item is **not** deleted — it leaves the buy list because a
 * copy now exists, but legitimately remains a "want to read" until read (design D3).
 */
export async function acquireWishlistItem(
  id: string,
  copyInput: Omit<CopyCreateInput, "bookId"> = {},
  deps: AcquireDeps = {},
): Promise<AcquireResult> {
  const intake = deps.intake ?? intakeBook;
  const item = await getWishlistItem(id);
  if (!item) throw new WishlistItemNotFoundError();

  if (item.bookId) {
    const book = await getBook(item.bookId);
    if (!book) throw new ReferenceNotFoundError("bookId");
    const copy = await createCopy({ bookId: item.bookId, ...copyInput });
    return { item, book, copy };
  }

  const bookInput: BookCreateInput = {
    title: item.bookTitle,
    authors: item.bookAuthors,
    isbn13: item.isbn13 ?? null,
    coverUrl: item.coverUrl ?? null,
  };
  const { book, copy } = await intake({
    book: bookInput,
    copy: copyInput,
    coverSourceUrl: item.coverUrl ?? null,
  });
  const linked = (await setWishlistItemBook(id, book.id)) ?? {
    ...item,
    bookId: book.id,
  };
  return { item: linked, book, copy };
}
