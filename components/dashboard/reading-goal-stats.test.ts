import { describe, it, expect } from "vitest";
import {
  finishedThisYear,
  projectedTotal,
  readingGoalFor,
  withReadingGoal,
} from "./reading-goal-stats";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/** Unit tests for the annual reading-goal helpers (#30). */

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
  id: "r1",
  name: "R",
  preferences: {},
  createdAt: "",
  updatedAt: "",
  ...p,
});

const now = new Date("2026-07-15T12:00:00");

describe("finishedThisYear", () => {
  it("counts only this reader's finished events in the current year", () => {
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: "2026-01-10" }),
      event({ id: "e2", readerId: "r1", dateFinished: "2025-12-30" }), // last year
      event({ id: "e3", readerId: "r2", dateFinished: "2026-02-01" }), // other reader
      event({
        id: "e4",
        readerId: "r1",
        status: "reading",
        dateFinished: "2026-03-01",
      }), // not finished
    ];
    expect(finishedThisYear(events, "r1", now)).toBe(1);
  });

  it("returns 0 with no matching events", () => {
    expect(finishedThisYear([], "r1", now)).toBe(0);
  });
});

describe("projectedTotal", () => {
  it("projects using calendar months elapsed", () => {
    // July = month 7 elapsed; 6 finished so far -> 6/7*12
    expect(projectedTotal(6, now)).toBeCloseTo((6 / 7) * 12);
  });

  it("returns null with 0 finished", () => {
    expect(projectedTotal(0, now)).toBeNull();
  });

  it("handles January (1 month elapsed)", () => {
    const jan = new Date("2026-01-15T12:00:00");
    expect(projectedTotal(2, jan)).toBeCloseTo(24);
  });
});

describe("readingGoalFor", () => {
  it("reads a set goal for the year", () => {
    const r = reader({ preferences: { readingGoals: { "2026": 24 } } });
    expect(readingGoalFor(r, "2026")).toBe(24);
  });

  it("returns null when unset", () => {
    expect(readingGoalFor(reader({ preferences: {} }), "2026")).toBeNull();
  });

  it("returns null for a malformed value", () => {
    const r = reader({
      preferences: { readingGoals: { "2026": "twenty-four" } },
    });
    expect(readingGoalFor(r, "2026")).toBeNull();
  });

  it("returns null when readingGoals itself is missing/malformed", () => {
    expect(
      readingGoalFor(reader({ preferences: { readingGoals: "nope" } }), "2026"),
    ).toBeNull();
  });
});

describe("withReadingGoal", () => {
  it("sets the goal for the given year", () => {
    const r = reader({ preferences: {} });
    expect(withReadingGoal(r, 24, "2026")).toEqual({
      readingGoals: { "2026": 24 },
    });
  });

  it("preserves unrelated preference keys", () => {
    const r = reader({ preferences: { theme: "dark" } });
    expect(withReadingGoal(r, 24, "2026")).toEqual({
      theme: "dark",
      readingGoals: { "2026": 24 },
    });
  });

  it("preserves other years' goals, overwriting only the target year", () => {
    const r = reader({
      preferences: { readingGoals: { "2025": 12, "2026": 20 } },
    });
    expect(withReadingGoal(r, 30, "2026")).toEqual({
      readingGoals: { "2025": 12, "2026": 30 },
    });
  });
});
