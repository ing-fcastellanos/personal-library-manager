import { describe, it, expect } from "vitest";
import {
  normalizeRating,
  normalizeReview,
  readingEventCreateBody,
  readingEventUpdateBody,
  matchToLibrary,
} from "./mark-read";

/** Unit tests for the mark-as-read payload helpers (#24 + #25). */

describe("normalizeRating", () => {
  it("keeps integers 1–5", () => {
    expect(normalizeRating(1)).toBe(1);
    expect(normalizeRating(5)).toBe(5);
  });
  it("rounds and rejects out-of-range / null", () => {
    expect(normalizeRating(3.4)).toBe(3);
    expect(normalizeRating(0)).toBeNull();
    expect(normalizeRating(6)).toBeNull();
    expect(normalizeRating(null)).toBeNull();
    expect(normalizeRating(undefined)).toBeNull();
  });
});

describe("normalizeReview", () => {
  it("trims and nulls empty", () => {
    expect(normalizeReview("  hola  ")).toBe("hola");
    expect(normalizeReview("   ")).toBeNull();
    expect(normalizeReview("")).toBeNull();
    expect(normalizeReview(null)).toBeNull();
  });
});

describe("readingEventCreateBody", () => {
  it("includes normalized rating/review and a finished status", () => {
    const body = readingEventCreateBody({
      readerId: "r1",
      bookId: "b1",
      dateFinished: "2026-07-06",
      rating: 4,
      review: "  buenísima  ",
    });
    expect(body).toMatchObject({
      readerId: "r1",
      bookId: "b1",
      status: "finished",
      dateFinished: "2026-07-06",
      rating: 4,
      review: "buenísima",
    });
  });

  it("nulls unset optional fields", () => {
    const body = readingEventCreateBody({ readerId: "r1", bookId: "b1" });
    expect(body.copyId).toBeNull();
    expect(body.dateFinished).toBeNull();
    expect(body.rating).toBeNull();
    expect(body.review).toBeNull();
  });
});

describe("readingEventUpdateBody", () => {
  it("omits status and normalizes fields", () => {
    const body = readingEventUpdateBody({
      dateFinished: "2026-07-06",
      rating: 3,
      review: "ok",
    });
    expect(body).toMatchObject({
      dateFinished: "2026-07-06",
      rating: 3,
      review: "ok",
    });
    expect("status" in body).toBe(false);
  });

  it("clears rating/review to null", () => {
    const body = readingEventUpdateBody({ rating: null, review: "" });
    expect(body.rating).toBeNull();
    expect(body.review).toBeNull();
  });
});

describe("matchToLibrary", () => {
  it("maps the first match", () => {
    expect(
      matchToLibrary([
        {
          book: { id: "b1", title: "Dune", authors: ["Frank Herbert"] },
          existingCopies: 1,
        },
      ]),
    ).toMatchObject({ id: "b1", title: "Dune" });
  });
  it("returns null with no matches", () => {
    expect(matchToLibrary([])).toBeNull();
    expect(matchToLibrary(undefined)).toBeNull();
  });
});
