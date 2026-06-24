import { describe, it, expect } from "vitest";
import { rankCandidates, scoreCandidate } from "./rank";
import type { Candidate } from "./types";

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    title: "Title",
    subtitle: null,
    authors: ["Author Name"],
    authorKeys: ["author-name"],
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

describe("rankCandidates", () => {
  it("ranks an exact title match above a partial match", () => {
    const exact = candidate({
      title: "Cien Años de Soledad",
      titleKey: "cien-anos-de-soledad",
    });
    const partial = candidate({
      title: "Cien Sonetos",
      titleKey: "cien-sonetos",
    });
    const ranked = rankCandidates("cien-anos-de-soledad", [partial, exact]);
    expect(ranked[0]).toBe(exact);
  });

  it("is pure and repeatable for the same input", () => {
    const items = [
      candidate({ titleKey: "a", title: "A" }),
      candidate({ titleKey: "b", title: "B" }),
    ];
    const first = rankCandidates("a", items);
    const second = rankCandidates("a", items);
    expect(first).toEqual(second);
  });

  it("discards candidates without a title or without authors", () => {
    const noAuthors = candidate({ authors: [], authorKeys: [] });
    const ok = candidate({ title: "Real", titleKey: "real" });
    const ranked = rankCandidates("real", [noAuthors, ok]);
    expect(ranked).toEqual([ok]);
  });

  it("breaks ties by original source order", () => {
    const a = candidate({ title: "Zero One", titleKey: "zero-one" });
    const b = candidate({ title: "Zero Two", titleKey: "zero-two" });
    // Both share one token with the query → equal score → original order.
    const ranked = rankCandidates("zero", [a, b]);
    expect(ranked).toEqual([a, b]);
  });

  it("caps results at the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      candidate({ title: `T${i}`, titleKey: `t-${i}` }),
    );
    expect(rankCandidates("t", many, 5)).toHaveLength(5);
  });
});

describe("scoreCandidate", () => {
  it("rewards completeness (isbn, cover, year)", () => {
    const bare = candidate({ titleKey: "x", title: "X" });
    const complete = candidate({
      titleKey: "x",
      title: "X",
      isbn13: "9780307474728",
      coverUrl: "c.jpg",
      publishedYear: 1967,
    });
    expect(scoreCandidate("x", complete)).toBeGreaterThan(
      scoreCandidate("x", bare),
    );
  });
});
