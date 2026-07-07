import { describe, it, expect } from "vitest";
import { eventDate, filterEvents, formatReadingDate } from "./history";
import type { ReadingEvent } from "@/lib/types/reading-event";

/** Unit tests for the reading-history helpers (#26). */

const mk = (p: Partial<ReadingEvent>): ReadingEvent => ({
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
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "",
  ...p,
});

describe("eventDate", () => {
  it("uses dateFinished when set, else createdAt", () => {
    expect(eventDate(mk({ dateFinished: "2026-07-06" }))).toBe("2026-07-06");
    expect(
      eventDate(mk({ dateFinished: null, createdAt: "2026-03-02T10:00:00Z" })),
    ).toBe("2026-03-02");
  });
});

describe("filterEvents", () => {
  const events = [
    mk({ id: "a", readerId: "r1", rating: 5, dateFinished: "2026-07-06" }),
    mk({ id: "b", readerId: "r2", rating: 3, dateFinished: "2026-05-01" }),
    mk({ id: "c", readerId: "r1", rating: 3, dateFinished: "2026-01-15" }),
  ];

  it("filters by reader", () => {
    expect(filterEvents(events, { readerId: "r1" }).map((e) => e.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("filters by exact rating", () => {
    expect(filterEvents(events, { rating: 3 }).map((e) => e.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("filters by date range (inclusive)", () => {
    expect(
      filterEvents(events, { from: "2026-05-01", to: "2026-07-06" }).map(
        (e) => e.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("combines filters (AND)", () => {
    expect(
      filterEvents(events, { readerId: "r1", rating: 3 }).map((e) => e.id),
    ).toEqual(["c"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterEvents(events, { readerId: "r1", rating: 1 })).toHaveLength(0);
  });

  it("returns all with no filters", () => {
    expect(filterEvents(events)).toHaveLength(3);
  });
});

describe("formatReadingDate", () => {
  it("formats a valid date and empties on blank", () => {
    expect(formatReadingDate("2026-07-06")).toMatch(/2026/);
    expect(formatReadingDate("")).toBe("");
  });
});
