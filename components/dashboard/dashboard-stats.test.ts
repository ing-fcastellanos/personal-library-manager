import { describe, it, expect } from "vitest";
import { computeKpis } from "./dashboard-stats";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/** Unit tests for the dashboard aggregation helpers (#27). */

const book = (p: Partial<Book>): Book => ({
  id: "b",
  title: "T",
  subtitle: null,
  authors: [],
  authorKeys: [],
  publisher: null,
  publishedYear: null,
  isbn13: null,
  isbn10: null,
  categories: [],
  categoryKeys: [],
  language: null,
  pageCount: null,
  description: null,
  coverUrl: null,
  coverSource: null,
  titleKey: null,
  workKey: null,
  source: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

const copy = (p: Partial<Copy>): Copy => ({
  id: "c",
  bookId: "b",
  shelfId: null,
  condition: null,
  acquiredAt: null,
  notes: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

const event = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: null,
  rating: null,
  review: null,
  bookTitle: "T",
  bookAuthors: [],
  isbn13: null,
  coverUrl: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

const reader = (p: Partial<Reader>): Reader => ({
  id: "r",
  name: "R",
  avatar: null,
  displayColor: null,
  goodreadsUrl: null,
  email: null,
  preferences: {},
  uid: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

describe("computeKpis", () => {
  it("returns all zeros for empty inputs", () => {
    const k = computeKpis([], [], [], []);
    expect(k).toMatchObject({
      books: 0,
      copies: 0,
      read: 0,
      pending: 0,
      authors: 0,
      publishers: 0,
      categories: 0,
      perReader: [],
    });
  });

  it("counts books and copies", () => {
    const books = [book({ id: "b1" }), book({ id: "b2" })];
    const copies = [copy({ id: "c1" }), copy({ id: "c2" }), copy({ id: "c3" })];
    const k = computeKpis(books, copies, [], []);
    expect(k.books).toBe(2);
    expect(k.copies).toBe(3);
  });

  it("splits read vs pending so they sum to the book total", () => {
    const books = [book({ id: "b1" }), book({ id: "b2" }), book({ id: "b3" })];
    const events = [
      event({ id: "e1", bookId: "b1", status: "finished" }),
      event({ id: "e2", bookId: "b2", status: "reading" }), // not finished → pending
    ];
    const k = computeKpis(books, [], events, []);
    expect(k.read).toBe(1);
    expect(k.pending).toBe(2);
    expect(k.read + k.pending).toBe(k.books);
  });

  it("de-dupes unique authors, publishers, and categories", () => {
    const books = [
      book({
        id: "b1",
        authorKeys: ["borges", "casares"],
        publisher: "Emecé",
        categoryKeys: ["ficcion"],
      }),
      book({
        id: "b2",
        authorKeys: ["borges"],
        publisher: "emecé", // case-insensitive de-dupe
        categoryKeys: ["ficcion", "ensayo"],
      }),
    ];
    const k = computeKpis(books, [], [], []);
    expect(k.authors).toBe(2); // borges, casares
    expect(k.publishers).toBe(1); // emecé
    expect(k.categories).toBe(2); // ficcion, ensayo
  });

  it("computes per-reader finished counts, including zero", () => {
    const readers = [
      reader({ id: "r1", name: "Frank" }),
      reader({ id: "r2", name: "Dani" }),
    ];
    const events = [
      event({ id: "e1", readerId: "r1", bookId: "b1", status: "finished" }),
      event({ id: "e2", readerId: "r1", bookId: "b2", status: "finished" }),
      event({ id: "e3", readerId: "r2", bookId: "b1", status: "reading" }),
    ];
    const k = computeKpis([], [], events, readers);
    expect(k.perReader).toEqual([
      { readerId: "r1", name: "Frank", finished: 2 },
      { readerId: "r2", name: "Dani", finished: 0 },
    ]);
  });
});
