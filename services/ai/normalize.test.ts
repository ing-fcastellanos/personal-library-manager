import { describe, it, expect } from "vitest";
import {
  toAICandidate,
  clampConfidence,
  NEUTRAL_CONFIDENCE,
} from "./normalize";
import { parseIdentifications } from "./prompt";

describe("clampConfidence", () => {
  it("passes through a value already in 0-1", () => {
    expect(clampConfidence(0.8)).toBe(0.8);
  });

  it("maps a 0-100 percentage into 0-1", () => {
    expect(clampConfidence(90)).toBeCloseTo(0.9);
  });

  it("clamps out-of-range values", () => {
    expect(clampConfidence(-5)).toBe(0);
    expect(clampConfidence(250)).toBe(1);
  });

  it("returns the neutral default for missing/non-finite input", () => {
    expect(clampConfidence(null)).toBe(NEUTRAL_CONFIDENCE);
    expect(clampConfidence(undefined)).toBe(NEUTRAL_CONFIDENCE);
    expect(clampConfidence(Number.NaN)).toBe(NEUTRAL_CONFIDENCE);
  });
});

describe("toAICandidate", () => {
  it("records ai provenance and the producing engine", () => {
    const c = toAICandidate({ title: "Dune", confidence: 0.9 }, "gemini");
    expect(c.source).toBe("ai");
    expect(c.sourceProvider).toBe("gemini");
    expect(c.confidence).toBe(0.9);
  });

  it("assigns a neutral confidence when none is provided", () => {
    const c = toAICandidate({ title: "Dune" }, "openai");
    expect(c.confidence).toBe(NEUTRAL_CONFIDENCE);
  });

  it("computes derived slug keys with the shared helper", () => {
    const c = toAICandidate(
      {
        title: "Cien Años de Soledad",
        authors: ["Gabriel García Márquez"],
        categories: ["Fiction"],
      },
      "openai",
    );
    expect(c.titleKey).toBe("cien-anos-de-soledad");
    expect(c.authorKeys).toContain("gabriel-garcia-marquez");
    expect(c.categoryKeys).toContain("fiction");
  });

  it("canonicalizes an ISBN-10 to ISBN-13", () => {
    const c = toAICandidate({ title: "x", isbn10: "0307474720" }, "openai");
    expect(c.isbn13).toBe("9780307474728");
  });

  it("drops blank authors/categories", () => {
    const c = toAICandidate(
      { title: "x", authors: ["", "  ", "Real"], categories: [""] },
      "openai",
    );
    expect(c.authors).toEqual(["Real"]);
    expect(c.categories).toEqual([]);
  });

  it("leaves cover fields null (AI provides no cover)", () => {
    const c = toAICandidate({ title: "x" }, "openai");
    expect(c.coverUrl).toBeNull();
    expect(c.coverWidth).toBeNull();
  });
});

describe("parseIdentifications", () => {
  it("parses a single-book { book } payload", () => {
    const out = parseIdentifications(
      JSON.stringify({ book: { title: "Dune", authors: ["Herbert"] } }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Dune");
    expect(out[0].authors).toEqual(["Herbert"]);
  });

  it("treats { book: null } as no result", () => {
    expect(parseIdentifications(JSON.stringify({ book: null }))).toEqual([]);
  });

  it("parses a multi-book { books: [] } payload", () => {
    const out = parseIdentifications(
      JSON.stringify({ books: [{ title: "A" }, { title: "B" }] }),
    );
    expect(out.map((b) => b.title)).toEqual(["A", "B"]);
  });

  it("strips code fences around the JSON", () => {
    const out = parseIdentifications(
      '```json\n{"book":{"title":"Fenced"}}\n```',
    );
    expect(out[0].title).toBe("Fenced");
  });

  it("splits a loose isbn field by length", () => {
    const out = parseIdentifications(
      JSON.stringify({ book: { title: "x", isbn: "978-0-307-47472-8" } }),
    );
    expect(out[0].isbn13).toBe("9780307474728");
    expect(out[0].isbn10).toBeNull();
  });

  it("maps year to publishedYear", () => {
    const out = parseIdentifications(
      JSON.stringify({ book: { title: "x", year: 1965 } }),
    );
    expect(out[0].publishedYear).toBe(1965);
  });

  it("discards books without a title", () => {
    const out = parseIdentifications(
      JSON.stringify({ books: [{ authors: ["x"] }, { title: "Keep" }] }),
    );
    expect(out.map((b) => b.title)).toEqual(["Keep"]);
  });

  it("returns [] on unparseable input", () => {
    expect(parseIdentifications("not json at all")).toEqual([]);
  });
});
