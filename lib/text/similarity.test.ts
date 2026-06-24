import { describe, it, expect } from "vitest";
import {
  tokenize,
  countOverlap,
  jaccard,
  sharedAuthorKeys,
  titleAuthorSimilarity,
} from "./similarity";

describe("tokenize", () => {
  it("splits a slug into tokens and handles empty input", () => {
    expect(tokenize("cien-anos-de-soledad")).toEqual([
      "cien",
      "anos",
      "de",
      "soledad",
    ]);
    expect(tokenize("")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe("countOverlap / jaccard / sharedAuthorKeys", () => {
  it("counts overlapping tokens by occurrence", () => {
    expect(countOverlap(["a", "b", "c"], new Set(["b", "c", "d"]))).toBe(2);
  });

  it("computes Jaccard over token sets", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
    expect(jaccard(["a", "b"], ["a", "c"])).toBeCloseTo(1 / 3);
    expect(jaccard([], [])).toBe(0);
  });

  it("counts distinct shared author keys", () => {
    expect(sharedAuthorKeys(["gabo", "anon"], ["gabo", "other"])).toBe(1);
  });
});

describe("titleAuthorSimilarity", () => {
  it("is deterministic for the same inputs", () => {
    const a = { titleKey: "cien-anos", authorKeys: ["gabo"] };
    const b = { titleKey: "cien-anos", authorKeys: ["gabo"] };
    expect(titleAuthorSimilarity(a, b)).toBe(titleAuthorSimilarity(a, b));
  });

  it("scores identical title + author above title-only", () => {
    const withAuthor = titleAuthorSimilarity(
      { titleKey: "cien-anos", authorKeys: ["gabo"] },
      { titleKey: "cien-anos", authorKeys: ["gabo"] },
    );
    const titleOnly = titleAuthorSimilarity(
      { titleKey: "cien-anos", authorKeys: [] },
      { titleKey: "cien-anos", authorKeys: ["gabo"] },
    );
    expect(withAuthor).toBeGreaterThan(titleOnly);
  });
});
