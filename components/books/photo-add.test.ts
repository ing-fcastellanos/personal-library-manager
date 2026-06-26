import { describe, it, expect } from "vitest";
import {
  candidateToBookData,
  isLowConfidence,
  intakePayload,
  type IdentifyCandidate,
} from "./photo-add";

describe("candidateToBookData", () => {
  it("maps an identified candidate to editable book data", () => {
    const c: IdentifyCandidate = {
      title: "Dune",
      authors: ["Frank Herbert"],
      publishedYear: 1965,
      isbn13: "9780441172719",
      language: "en",
      pageCount: 412,
    };
    const b = candidateToBookData(c);
    expect(b.title).toBe("Dune");
    expect(b.authors).toEqual(["Frank Herbert"]);
    expect(b.year).toBe("1965");
    expect(b.language).toBe("Inglés");
    expect(b.pages).toBe("412");
  });

  it("never carries a metadata cover (the photo is the cover)", () => {
    const b = candidateToBookData({
      title: "x",
      coverUrl: "https://covers/x.jpg",
    });
    expect(b.coverUrl).toBeUndefined();
  });
});

describe("isLowConfidence", () => {
  it("flags low confidence at or below the threshold", () => {
    expect(isLowConfidence(0.6)).toBe(true);
    expect(isLowConfidence(0.3)).toBe(true);
  });
  it("does not flag high confidence or null", () => {
    expect(isLowConfidence(0.9)).toBe(false);
    expect(isLowConfidence(null)).toBe(false);
  });
});

describe("intakePayload", () => {
  it("builds the book payload and trims, with no cover", () => {
    const payload = intakePayload(
      {
        title: "  Dune  ",
        authors: ["Frank Herbert"],
        categories: [],
        year: "1965",
        isbn13: "9780441172719",
      },
      { shelfId: "s1" },
    ) as { book: Record<string, unknown>; copy: { shelfId: string } };
    expect(payload.book.title).toBe("Dune");
    expect(payload.book.publishedYear).toBe(1965);
    expect(payload.copy.shelfId).toBe("s1");
    expect("coverUrl" in payload.book).toBe(false);
  });
});
