import { describe, it, expect } from "vitest";
import {
  createWishlistItem,
  acquireWishlistItem,
  ReferenceNotFoundError,
} from "./service";
import { getWishlistItem } from "./repository";
import { createReader } from "../readers/repository";
import { createBook } from "../books/repository";
import { listCopiesByBook } from "../copies/repository";
import { listBooks } from "../books/repository";

/**
 * Emulator-backed tests for the wishlist service (#37): reference validation on
 * create, key derivation, and the two acquisition paths (design D12).
 */
describe("wishlist service (emulator)", () => {
  it("validates the reader on create and derives match keys", async () => {
    const reader = await createReader({ name: "Frank" });
    const created = await createWishlistItem({
      readerId: reader.id,
      addedVia: "manual",
      bookTitle: "Cien Años de Soledad",
      bookAuthors: ["Gabriel García Márquez"],
    });
    expect(created.titleKey).toBe("cien-anos-de-soledad");
    expect(created.authorKeys).toEqual(["gabriel-garcia-marquez"]);
    expect(created.bookId ?? null).toBeNull();
  });

  it("rejects an unknown reader or book reference", async () => {
    await expect(
      createWishlistItem({
        readerId: "nope",
        addedVia: "manual",
        bookTitle: "X",
      }),
    ).rejects.toBeInstanceOf(ReferenceNotFoundError);

    const reader = await createReader({ name: "Sofía" });
    await expect(
      createWishlistItem({
        readerId: reader.id,
        bookId: "nope",
        addedVia: "catalog",
        bookTitle: "X",
      }),
    ).rejects.toMatchObject({ field: "bookId" });
  });

  it("acquiring an item with no bookId creates one book + one copy and backfills the link", async () => {
    const reader = await createReader({ name: "Frank" });
    const item = await createWishlistItem({
      readerId: reader.id,
      addedVia: "isbn",
      bookTitle: "Kindred",
      bookAuthors: ["Octavia E. Butler"],
      isbn13: "9780807083697",
    });

    const booksBefore = (await listBooks()).length;
    const { book, copy } = await acquireWishlistItem(item.id, {
      condition: "good",
    });
    const booksAfter = (await listBooks()).length;

    expect(booksAfter).toBe(booksBefore + 1);
    expect(copy.bookId).toBe(book.id);
    expect(await listCopiesByBook(book.id)).toHaveLength(1);

    const linked = await getWishlistItem(item.id);
    expect(linked?.bookId).toBe(book.id);
  });

  it("acquiring an already-linked item creates a copy but no second book", async () => {
    const reader = await createReader({ name: "Sofía" });
    const book = await createBook({ title: "Parable of the Sower" });
    const item = await createWishlistItem({
      readerId: reader.id,
      bookId: book.id,
      addedVia: "catalog",
      bookTitle: book.title,
    });

    const booksBefore = (await listBooks()).length;
    const { copy } = await acquireWishlistItem(item.id);
    const booksAfter = (await listBooks()).length;

    expect(booksAfter).toBe(booksBefore);
    expect(copy.bookId).toBe(book.id);

    // The wish survives acquisition (design D12).
    expect(await getWishlistItem(item.id)).not.toBeNull();
  });
});
