import { describe, it, expect } from "vitest";
import { sameBook, groupWishlistItems } from "./match";
import type { WishlistItem } from "../../lib/types/wishlist-item";

function item(o: Partial<WishlistItem>): WishlistItem {
  return {
    id: "w",
    readerId: "r1",
    bookId: null,
    status: "wanted",
    priority: "normal",
    addedVia: "manual",
    bookTitle: "T",
    bookAuthors: [],
    isbn13: null,
    coverUrl: null,
    titleKey: null,
    authorKeys: [],
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...o,
  };
}

describe("sameBook", () => {
  it("matches two items linked to the same bookId", () => {
    expect(sameBook({ bookId: "b1" }, { bookId: "b1" })).toBe(true);
    expect(sameBook({ bookId: "b1" }, { bookId: "b2" })).toBe(false);
  });

  it("matches by ISBN-13 even when titles differ", () => {
    expect(
      sameBook(
        { isbn13: "9780441478125", titleKey: "left-hand" },
        { isbn13: "9780441478125", titleKey: "la-mano-izquierda" },
      ),
    ).toBe(true);
  });

  it("canonicalizes ISBN-10 to ISBN-13 before comparing", () => {
    expect(
      sameBook({ isbn13: "0441478123" }, { isbn13: "9780441478125" }),
    ).toBe(true);
  });

  it("matches by equal titleKey with a shared author", () => {
    expect(
      sameBook(
        { titleKey: "rayuela", authorKeys: ["julio-cortazar"] },
        { titleKey: "rayuela", authorKeys: ["julio-cortazar"] },
      ),
    ).toBe(true);
  });

  it("does NOT match equal titleKey with disjoint authors", () => {
    expect(
      sameBook(
        { titleKey: "sula", authorKeys: ["toni-morrison"] },
        { titleKey: "sula", authorKeys: ["someone-else"] },
      ),
    ).toBe(false);
  });

  it("does not match when nothing lines up", () => {
    expect(sameBook({ titleKey: "a" }, { titleKey: "b" })).toBe(false);
    expect(sameBook({}, {})).toBe(false);
  });
});

describe("groupWishlistItems", () => {
  it("merges two readers wanting the same book into one group", () => {
    const groups = groupWishlistItems([
      item({ id: "w1", readerId: "r1", bookId: "b1" }),
      item({ id: "w2", readerId: "r2", bookId: "b1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].readerIds).toEqual(["r1", "r2"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("keeps genuinely different same-titled books apart", () => {
    const groups = groupWishlistItems([
      item({ id: "w1", titleKey: "sula", authorKeys: ["toni-morrison"] }),
      item({ id: "w2", titleKey: "sula", authorKeys: ["someone-else"] }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("does not duplicate a reader who has two items for the same book", () => {
    const groups = groupWishlistItems([
      item({ id: "w1", readerId: "r1", bookId: "b1" }),
      item({ id: "w2", readerId: "r1", bookId: "b1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].readerIds).toEqual(["r1"]);
  });
});
