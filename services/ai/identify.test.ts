import { describe, it, expect, vi } from "vitest";
import { identifyAndEnrich } from "./identify";
import { toAICandidate } from "./normalize";
import type { AIImage } from "./types";
import type { Candidate } from "../enrichment/types";

const IMG: AIImage = { base64: "AAAA", mimeType: "image/jpeg" };

function enrichCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    title: "Dune",
    subtitle: null,
    authors: ["Frank Herbert"],
    authorKeys: ["frank-herbert"],
    publisher: null,
    publishedYear: 1965,
    isbn13: "9780441172719",
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: "https://covers/dune.jpg",
    coverWidth: 256,
    pageCount: null,
    language: "en",
    description: null,
    titleKey: "dune",
    source: "google-books",
    ...overrides,
  };
}

describe("identifyAndEnrich", () => {
  it("returns empty when the AI recognizes nothing", async () => {
    const result = await identifyAndEnrich(IMG, { identify: async () => null });
    expect(result).toEqual({
      aiConfidence: null,
      sourceProvider: null,
      best: null,
      alternatives: [],
    });
  });

  it("ISBN path: enriches by ISBN, no alternatives", async () => {
    const byIsbn = vi.fn().mockResolvedValue(enrichCandidate());
    const byText = vi.fn();
    const result = await identifyAndEnrich(IMG, {
      identify: async () =>
        toAICandidate({ title: "Dune", isbn13: "9780441172719" }, "openai"),
      byIsbn,
      byText,
    });
    expect(byIsbn).toHaveBeenCalledWith("9780441172719");
    expect(byText).not.toHaveBeenCalled();
    expect(result.best?.isbn13).toBe("9780441172719");
    expect(result.alternatives).toEqual([]);
    expect(result.aiConfidence).toBeTypeOf("number");
    expect(result.sourceProvider).toBe("openai");
  });

  it("text path: top match is best, the rest are alternatives", async () => {
    const a = enrichCandidate({ title: "Dune", titleKey: "dune" });
    const b = enrichCandidate({
      title: "Dune Messiah",
      titleKey: "dune-messiah",
    });
    const result = await identifyAndEnrich(IMG, {
      identify: async () =>
        toAICandidate({ title: "Dune", authors: ["Herbert"] }, "gemini"),
      byText: async () => [a, b],
    });
    expect(result.best?.title).toBe("Dune");
    expect(result.alternatives.map((c) => c.title)).toEqual(["Dune Messiah"]);
    expect(result.sourceProvider).toBe("gemini");
  });

  it("falls back to text search when ISBN enrichment misses", async () => {
    const byIsbn = vi.fn().mockResolvedValue(null);
    const byText = vi.fn().mockResolvedValue([enrichCandidate()]);
    const result = await identifyAndEnrich(IMG, {
      identify: async () =>
        toAICandidate({ title: "Dune", isbn13: "9780441172719" }, "openai"),
      byIsbn,
      byText,
    });
    expect(byIsbn).toHaveBeenCalled();
    expect(byText).toHaveBeenCalled();
    expect(result.best?.title).toBe("Dune");
  });

  it("no-match path: degrades to the raw AI candidate", async () => {
    const ai = toAICandidate({ title: "Obscure Zine" }, "openai");
    const result = await identifyAndEnrich(IMG, {
      identify: async () => ai,
      byText: async () => [],
    });
    expect(result.best).toBe(ai);
    expect(result.best?.source).toBe("ai");
    expect(result.alternatives).toEqual([]);
  });
});
