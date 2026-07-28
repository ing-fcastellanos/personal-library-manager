import { describe, it, expect } from "vitest";
import {
  createWishlistItem,
  getWishlistItem,
  listWishlistItems,
  updateWishlistItem,
  deleteWishlistItem,
  setWishlistItemBook,
  listWishlistItemsByReader,
  listWishlistItemsByBook,
  readerHasWishlistItems,
  unlinkWishlistItemsByBook,
  type WishlistItemData,
} from "./repository";
import { createReader } from "../readers/repository";
import { createBook } from "../books/repository";

/**
 * Emulator-backed tests for the wishlist repository (#37): CRUD, relationship
 * reads, and the delete-integrity helpers (the reader guard and the book-unlink).
 */
describe("wishlist repository (emulator)", () => {
  function data(o: Partial<WishlistItemData>): WishlistItemData {
    return {
      readerId: "r1",
      bookId: null,
      status: "wanted",
      priority: "normal",
      addedVia: "manual",
      bookTitle: "Rayuela",
      bookAuthors: ["Julio Cortázar"],
      isbn13: null,
      coverUrl: null,
      titleKey: "rayuela",
      authorKeys: ["julio-cortazar"],
      ...o,
    };
  }

  it("creates, reads, updates and deletes an item", async () => {
    const created = await createWishlistItem(data({}));
    expect(created.id).toBeTruthy();
    expect(created.status).toBe("wanted");

    const fetched = await getWishlistItem(created.id);
    expect(fetched?.bookTitle).toBe("Rayuela");

    const updated = await updateWishlistItem(created.id, {
      priority: "high",
      status: "dismissed",
    });
    expect(updated?.priority).toBe("high");
    expect(updated?.status).toBe("dismissed");

    expect(await deleteWishlistItem(created.id)).toBe(true);
    expect(await getWishlistItem(created.id)).toBeNull();
  });

  it("serves relationship reads by reader and by book", async () => {
    const reader = await createReader({ name: "Frank" });
    const book = await createBook({
      title: "Sula",
      authors: ["Toni Morrison"],
    });
    await createWishlistItem(data({ readerId: reader.id, bookId: book.id }));

    expect(await listWishlistItemsByReader(reader.id)).toHaveLength(1);
    expect(await listWishlistItemsByBook(book.id)).toHaveLength(1);
    expect((await listWishlistItems()).length).toBeGreaterThanOrEqual(1);
  });

  it("reports the reader-guard and unlinks items when a book is deleted", async () => {
    const reader = await createReader({ name: "Sofía" });
    const book = await createBook({
      title: "Beloved",
      authors: ["Toni Morrison"],
    });
    const created = await createWishlistItem(
      data({ readerId: reader.id, bookId: book.id }),
    );

    expect(await readerHasWishlistItems(reader.id)).toBe(true);

    const unlinked = await unlinkWishlistItemsByBook(book.id);
    expect(unlinked).toBe(1);
    const after = await getWishlistItem(created.id);
    expect(after?.bookId ?? null).toBeNull();
    // The item survives the book deletion as a valid wish on its own snapshot.
    expect(after?.bookTitle).toBe("Rayuela");
  });

  it("backfills bookId via setWishlistItemBook", async () => {
    const created = await createWishlistItem(data({ bookId: null }));
    const linked = await setWishlistItemBook(created.id, "b-new");
    expect(linked?.bookId).toBe("b-new");
  });
});
