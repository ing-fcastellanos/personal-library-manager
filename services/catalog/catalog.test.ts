import { describe, it, expect, vi } from "vitest";
import { joinCatalog } from "./join";
import { filterCatalog } from "./filter";
import { sortCatalog } from "./sort";
import { computeFacets } from "./facets";
import { searchCatalog } from "./service";
import type { Book } from "../../lib/types/book";
import type { Copy } from "../../lib/types/copy";
import type { ReadingEvent } from "../../lib/types/reading-event";
import type { Shelf } from "../../lib/types/shelf";

const TS = {
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function book(o: Partial<Book>): Book {
  return {
    id: "b1",
    title: "Cien Años de Soledad",
    subtitle: null,
    authors: ["Gabriel García Márquez"],
    authorKeys: ["gabriel-garcia-marquez"],
    publisher: "Sudamericana",
    publishedYear: 1967,
    isbn13: "9780307474728",
    isbn10: null,
    categories: ["Realismo Mágico"],
    categoryKeys: ["realismo-magico"],
    coverUrl: null,
    pageCount: null,
    language: null,
    description: null,
    workKey: null,
    titleKey: "cien-anos-de-soledad",
    source: null,
    coverSource: null,
    ...TS,
    ...o,
  };
}
function copy(o: Partial<Copy>): Copy {
  return {
    id: "c1",
    bookId: "b1",
    shelfId: null,
    condition: null,
    acquiredAt: null,
    notes: null,
    ...TS,
    ...o,
  };
}
function event(o: Partial<ReadingEvent>): ReadingEvent {
  return {
    id: "e1",
    readerId: "r1",
    bookId: "b1",
    copyId: null,
    status: "finished",
    dateStarted: null,
    dateFinished: null,
    rating: null,
    review: null,
    bookTitle: "Cien Años de Soledad",
    bookAuthors: ["Gabriel García Márquez"],
    isbn13: null,
    coverUrl: null,
    ...TS,
    ...o,
  };
}

describe("joinCatalog", () => {
  it("derives shelfIds and per-reader statuses", () => {
    const joined = joinCatalog(
      [book({})],
      [copy({ shelfId: "s1" }), copy({ id: "c2", shelfId: "s2" })],
      [event({ status: "reading" })],
    );
    expect(joined[0].shelfIds.sort()).toEqual(["s1", "s2"]);
    expect(joined[0].statusByReader.r1).toEqual(["reading"]);
  });
});

describe("filterCatalog", () => {
  const joined = joinCatalog(
    [
      book({}),
      book({
        id: "b2",
        title: "Otra",
        titleKey: "otra",
        authors: [],
        authorKeys: [],
        categoryKeys: ["novela"],
        categories: ["Novela"],
        publisher: "X",
        isbn13: null,
      }),
    ],
    [copy({ shelfId: "s1" })],
    [event({ status: "reading" })],
  );

  it("matches an author accent-insensitively", () => {
    expect(
      filterCatalog(joined, { q: "garcia marquez" }).map((j) => j.book.id),
    ).toEqual(["b1"]);
  });
  it("matches by ISBN digits", () => {
    expect(
      filterCatalog(joined, { q: "978-0-307-47472-8" }).map((j) => j.book.id),
    ).toEqual(["b1"]);
  });
  it("combines category and shelf", () => {
    expect(
      filterCatalog(joined, { category: "realismo-magico", shelf: "s1" }).map(
        (j) => j.book.id,
      ),
    ).toEqual(["b1"]);
  });
  it("applies reader-scoped status, ignores it without a reader", () => {
    expect(
      filterCatalog(joined, { status: "reading", reader: "r1" }).map(
        (j) => j.book.id,
      ),
    ).toEqual(["b1"]);
    expect(filterCatalog(joined, { status: "reading" })).toHaveLength(2); // no reader → ignored
  });
});

describe("sortCatalog", () => {
  it("sorts by title ascending and addedAt descending", () => {
    const a = book({
      id: "a",
      titleKey: "alfa",
      createdAt: "2026-01-01T00:00:00Z",
    });
    const z = book({
      id: "z",
      titleKey: "zeta",
      createdAt: "2026-12-01T00:00:00Z",
    });
    const joined = joinCatalog([z, a], [], []);
    expect(sortCatalog(joined, "title").map((j) => j.book.id)).toEqual([
      "a",
      "z",
    ]);
    expect(sortCatalog(joined, "addedAt").map((j) => j.book.id)).toEqual([
      "z",
      "a",
    ]);
  });
});

describe("computeFacets", () => {
  it("counts categories/authors/publishers and labels shelves", () => {
    const joined = joinCatalog([book({})], [copy({ shelfId: "s1" })], []);
    const facets = computeFacets(joined, [
      { id: "s1", name: "Estante A" } as Shelf,
    ]);
    expect(facets.categories[0]).toMatchObject({
      value: "realismo-magico",
      label: "Realismo Mágico",
      count: 1,
    });
    expect(facets.shelves[0]).toMatchObject({
      value: "s1",
      label: "Estante A",
    });
  });
});

describe("searchCatalog", () => {
  it("paginates with total and returns facets", async () => {
    const books = Array.from({ length: 5 }, (_, i) =>
      book({ id: `b${i}`, titleKey: `t-${i}` }),
    );
    const result = await searchCatalog(
      { limit: 2, page: 1 },
      {
        loadBooks: vi.fn().mockResolvedValue(books),
        loadCopies: vi.fn().mockResolvedValue([]),
        loadEvents: vi.fn().mockResolvedValue([]),
        loadShelves: vi.fn().mockResolvedValue([]),
      },
    );
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
  });
});
