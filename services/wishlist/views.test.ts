import { describe, it, expect } from "vitest";
import { wantToReadFor, wantToBuy } from "./views";
import type { WishlistItem } from "../../lib/types/wishlist-item";
import type { ReadingEvent } from "../../lib/types/reading-event";
import type { Copy } from "../../lib/types/copy";

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

function event(o: Partial<ReadingEvent>): ReadingEvent {
  return {
    id: "e",
    readerId: "r1",
    bookId: "b1",
    copyId: null,
    status: "finished",
    dateStarted: null,
    dateFinished: null,
    rating: null,
    review: null,
    publishPending: false,
    bookTitle: "T",
    bookAuthors: [],
    isbn13: null,
    coverUrl: null,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...o,
  };
}

function copy(o: Partial<Copy>): Copy {
  return {
    id: "c",
    bookId: "b1",
    shelfId: null,
    condition: null,
    acquiredAt: null,
    notes: null,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...o,
  };
}

describe("wantToReadFor", () => {
  it("drops an item once the reader finishes that book", () => {
    const items = [item({ id: "w1", bookId: "b1" })];
    const events = [
      event({ readerId: "r1", bookId: "b1", status: "finished" }),
    ];
    expect(wantToReadFor("r1", items, events)).toHaveLength(0);
  });

  it("keeps the item when the OTHER reader finished it", () => {
    const items = [item({ id: "w1", readerId: "r1", bookId: "b1" })];
    const events = [
      event({ readerId: "r2", bookId: "b1", status: "finished" }),
    ];
    expect(wantToReadFor("r1", items, events)).toHaveLength(1);
  });

  it("matches an item with no bookId by ISBN, then by title+author", () => {
    const byIsbn = [item({ id: "w1", isbn13: "9780441478125" })];
    expect(
      wantToReadFor("r1", byIsbn, [
        event({ bookId: "bX", isbn13: "9780441478125" }),
      ]),
    ).toHaveLength(0);

    const byTitle = [
      item({ id: "w2", titleKey: "rayuela", authorKeys: ["julio-cortazar"] }),
    ];
    expect(
      wantToReadFor("r1", byTitle, [
        event({
          bookId: "bY",
          bookTitle: "Rayuela",
          bookAuthors: ["Julio Cortázar"],
        }),
      ]),
    ).toHaveLength(0);
  });

  it("treats abandoned as resolved but keeps a book in progress (reading) visible", () => {
    const items = [item({ id: "w1", bookId: "b1" })];
    expect(
      wantToReadFor("r1", items, [
        event({ bookId: "b1", status: "abandoned" }),
      ]),
    ).toHaveLength(0);
    expect(
      wantToReadFor("r1", items, [event({ bookId: "b1", status: "reading" })]),
    ).toHaveLength(1);
  });

  it("excludes dismissed items", () => {
    const items = [item({ id: "w1", status: "dismissed", bookId: "b1" })];
    expect(wantToReadFor("r1", items, [])).toHaveLength(0);
  });

  it("orders by priority then recency", () => {
    const items = [
      item({
        id: "low",
        priority: "low",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      item({
        id: "high",
        priority: "high",
        createdAt: "2026-06-01T00:00:00.000Z",
      }),
      item({
        id: "normNew",
        priority: "normal",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
      item({
        id: "normOld",
        priority: "normal",
        createdAt: "2026-07-05T00:00:00.000Z",
      }),
    ];
    expect(wantToReadFor("r1", items, []).map((i) => i.id)).toEqual([
      "high",
      "normNew",
      "normOld",
      "low",
    ]);
  });
});

describe("wantToBuy", () => {
  it("omits a book the household owns (a copy exists)", () => {
    const items = [item({ id: "w1", bookId: "b1" })];
    expect(wantToBuy(items, [copy({ bookId: "b1" })])).toHaveLength(0);
  });

  it("lists an unowned wanted book", () => {
    const items = [item({ id: "w1", bookId: "b1" })];
    expect(wantToBuy(items, [])).toHaveLength(1);
  });

  it("drops a loose (no-bookId) wish once a matching book is owned", () => {
    // Frank's loose wish (no bookId) for a book Sofía just bought (now catalogued).
    const items = [
      item({ id: "loose", isbn13: "9780441478125", titleKey: "kindred" }),
    ];
    const books = [
      {
        id: "b1",
        isbn13: "9780441478125",
        title: "Kindred",
        titleKey: "kindred",
        authorKeys: [],
      },
    ] as unknown as Parameters<typeof wantToBuy>[2];
    // Without books: not detected as owned (only bookId-linked ownership).
    expect(wantToBuy(items, [copy({ bookId: "b1" })])).toHaveLength(1);
    // With books: matched by ISBN and dropped.
    expect(wantToBuy(items, [copy({ bookId: "b1" })], books)).toHaveLength(0);
  });

  it("groups a book both readers want into one entry", () => {
    const items = [
      item({ id: "w1", readerId: "r1", bookId: "b1" }),
      item({ id: "w2", readerId: "r2", bookId: "b1" }),
    ];
    const groups = wantToBuy(items, []);
    expect(groups).toHaveLength(1);
    expect(groups[0].readerIds).toEqual(["r1", "r2"]);
  });

  it("excludes dismissed items and orders groups by highest priority", () => {
    const items = [
      item({ id: "d", status: "dismissed", bookId: "bd" }),
      item({ id: "low", priority: "low", bookId: "bl" }),
      item({ id: "hi", priority: "high", bookId: "bh" }),
    ];
    const groups = wantToBuy(items, []);
    expect(groups.map((g) => g.representative.id)).toEqual(["hi", "low"]);
  });
});
