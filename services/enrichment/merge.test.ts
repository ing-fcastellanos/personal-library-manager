import { describe, it, expect } from "vitest";
import { mergeCandidates } from "./merge";
import type { Candidate } from "./types";

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    title: "Title",
    subtitle: null,
    authors: [],
    authorKeys: [],
    publisher: null,
    publishedYear: null,
    isbn13: null,
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: null,
    coverWidth: null,
    pageCount: null,
    language: null,
    description: null,
    titleKey: "title",
    source: "google-books",
    ...overrides,
  };
}

describe("mergeCandidates", () => {
  it("returns the only present source when one is null", () => {
    const ol = candidate({ source: "open-library" });
    expect(mergeCandidates(null, ol)).toBe(ol);
    expect(mergeCandidates(ol, null)).toBe(ol);
  });

  it("fills a Google Books gap from Open Library and unions authors", () => {
    const gb = candidate({
      authors: [],
      authorKeys: [],
      publisher: null,
    });
    const ol = candidate({
      source: "open-library",
      authors: ["Gabriel García Márquez"],
      authorKeys: ["gabriel-garcia-marquez"],
      publisher: "Sudamericana",
    });
    const merged = mergeCandidates(gb, ol)!;
    expect(merged.authors).toEqual(["Gabriel García Márquez"]);
    expect(merged.publisher).toBe("Sudamericana");
    expect(merged.source).toBe("google-books");
  });

  it("de-duplicates unioned authors by slug", () => {
    const gb = candidate({
      authors: ["Gabriel Garcia Marquez"],
      authorKeys: ["gabriel-garcia-marquez"],
    });
    const ol = candidate({
      source: "open-library",
      authors: ["Gabriel García Márquez"],
      authorKeys: ["gabriel-garcia-marquez"],
    });
    expect(mergeCandidates(gb, ol)!.authors).toEqual([
      "Gabriel Garcia Marquez",
    ]);
  });

  it("selects the higher-resolution cover", () => {
    const gb = candidate({ coverUrl: "gb.jpg", coverWidth: 128 });
    const ol = candidate({
      source: "open-library",
      coverUrl: "ol-L.jpg",
      coverWidth: 500,
    });
    expect(mergeCandidates(gb, ol)!.coverUrl).toBe("ol-L.jpg");
  });

  it("keeps categories from the primary (Google Books) only", () => {
    const gb = candidate({
      categories: ["Fiction"],
      categoryKeys: ["fiction"],
    });
    const ol = candidate({
      source: "open-library",
      categories: ["should-be-ignored"],
      categoryKeys: ["should-be-ignored"],
    });
    expect(mergeCandidates(gb, ol)!.categories).toEqual(["Fiction"]);
  });
});
