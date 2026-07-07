import { describe, it, expect } from "vitest";
import { computeKpis, recentReads, readerTrend } from "./dashboard-stats";
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

describe("recentReads", () => {
  it("returns finished events newest-first, sliced to n", () => {
    const events = [
      event({ id: "e1", dateFinished: "2026-01-10" }),
      event({ id: "e2", dateFinished: "2026-03-05" }),
      event({ id: "e3", dateFinished: "2026-02-01" }),
      event({ id: "e4", status: "reading", dateFinished: "2026-04-01" }),
    ];
    expect(recentReads(events, 2).map((e) => e.id)).toEqual(["e2", "e3"]);
  });

  it("returns empty with no finished events", () => {
    expect(recentReads([event({ status: "reading" })])).toEqual([]);
  });
});

describe("readerTrend", () => {
  const now = new Date("2026-07-15T12:00:00");

  it("returns null/zero stats for a reader with no finished readings", () => {
    const t = readerTrend([], "r1", now);
    expect(t).toEqual({
      finished: 0,
      activeMonths: 0,
      booksPerMonth: null,
      currentStreak: 0,
      longestStreak: 0,
      avgDaysBetween: null,
    });
  });

  it("computes books/month across active months", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-05-01" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-05-15" }),
      event({ id: "e3", readerId: "r1", dateFinished: "2026-06-01" }),
    ];
    const t = readerTrend(events, "r1", now);
    expect(t.finished).toBe(3);
    expect(t.activeMonths).toBe(2); // 2026-05, 2026-06
    expect(t.booksPerMonth).toBeCloseTo(1.5);
  });

  it("computes an active current streak up to the present month", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-05-10" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-06-10" }),
      event({ id: "e3", readerId: "r1", dateFinished: "2026-07-01" }), // current month
    ];
    const t = readerTrend(events, "r1", now); // now = 2026-07
    expect(t.currentStreak).toBe(3);
    expect(t.longestStreak).toBe(3);
  });

  it("shows a broken streak (0) when nothing finished in the current month", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-05-10" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-06-10" }),
      // nothing in 2026-07 (now)
    ];
    const t = readerTrend(events, "r1", now);
    expect(t.currentStreak).toBe(0);
    expect(t.longestStreak).toBe(2); // the May-June run still counts historically
  });

  it("tracks a longest streak that differs from the (broken) current one", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-01-01" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-02-01" }),
      event({ id: "e3", readerId: "r1", dateFinished: "2026-03-01" }),
      event({ id: "e4", readerId: "r1", dateFinished: "2026-05-01" }), // gap in April
    ];
    const t = readerTrend(events, "r1", now); // now = July, nothing since May
    expect(t.currentStreak).toBe(0);
    expect(t.longestStreak).toBe(3); // Jan-Feb-Mar
  });

  it("computes the average days between consecutive finishes", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-01-01" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-01-11" }),
      event({ id: "e3", readerId: "r1", dateFinished: "2026-01-31" }),
    ];
    const t = readerTrend(events, "r1", now);
    // gaps: 10 days, 20 days -> avg 15
    expect(t.avgDaysBetween).toBeCloseTo(15);
  });

  it("returns null avgDaysBetween with fewer than 2 finished readings", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-01-01" }),
    ];
    expect(readerTrend(events, "r1", now).avgDaysBetween).toBeNull();
  });

  it("collapses same-day finishes to a 0-day gap without error", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-01-01" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2026-01-01" }),
    ];
    expect(readerTrend(events, "r1", now).avgDaysBetween).toBe(0);
  });

  it("only counts the given reader's finished events", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-07-01" }),
      event({ id: "e2", readerId: "r2", dateFinished: "2026-07-05" }),
      event({
        id: "e3",
        readerId: "r1",
        status: "reading",
        dateFinished: "2026-07-10",
      }),
    ];
    expect(readerTrend(events, "r1", now).finished).toBe(1);
  });
});
