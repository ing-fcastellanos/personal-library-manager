import { describe, it, expect } from "vitest";
import {
  shelfEnrichUrl,
  shelfEnrichTitleUrl,
  duplicatesUrl,
  classifyProcessed,
  splitBuckets,
  shelfIntakePayload,
  type ProcessedBook,
  type ShelfAICandidate,
} from "./shelf-add";

const ai = (over: Partial<ShelfAICandidate> = {}): ShelfAICandidate => ({
  title: "Dune",
  authors: ["Frank Herbert"],
  confidence: 0.95,
  sourceProvider: "openai",
  ...over,
});

describe("shelfEnrichUrl", () => {
  it("uses the ISBN path when present", () => {
    expect(shelfEnrichUrl(ai({ isbn13: "9780441172719" }))).toBe(
      "/api/enrich?isbn=9780441172719",
    );
  });
  it("uses a text query of title + authors otherwise", () => {
    expect(shelfEnrichUrl(ai())).toBe("/api/enrich?q=Dune%20Frank%20Herbert");
  });
});

describe("shelfEnrichTitleUrl", () => {
  it("queries the title only, dropping the authors", () => {
    expect(shelfEnrichTitleUrl(ai())).toBe("/api/enrich?q=Dune");
  });
  it("trims and encodes the title", () => {
    expect(shelfEnrichTitleUrl(ai({ title: "  Territorio Comanche " }))).toBe(
      "/api/enrich?q=Territorio%20Comanche",
    );
  });
});

describe("duplicatesUrl", () => {
  it("includes isbn, title and repeated authors", () => {
    const url = duplicatesUrl({
      isbn13: "9780441172719",
      title: "Dune",
      authors: ["Frank Herbert", "B"],
    });
    expect(url).toContain("isbn=9780441172719");
    expect(url).toContain("title=Dune");
    expect(url).toContain("authors=Frank+Herbert");
    expect(url).toContain("authors=B");
  });
});

describe("classifyProcessed", () => {
  it("auto when confident, enriched, and not a duplicate", () => {
    expect(
      classifyProcessed({ ai: ai(), best: { title: "Dune" }, duplicate: null })
        .bucket,
    ).toBe("auto");
  });
  it("review:no_match when nothing enriched", () => {
    expect(
      classifyProcessed({ ai: ai(), best: null, duplicate: null }).reason,
    ).toBe("no_match");
  });
  it("review:low_confidence when the AI was unsure", () => {
    expect(
      classifyProcessed({
        ai: ai({ confidence: 0.4 }),
        best: { title: "x" },
        duplicate: null,
      }).reason,
    ).toBe("low_confidence");
  });
});

describe("splitBuckets", () => {
  const make = (
    reason: ProcessedBook["classification"]["reason"],
    bucket: "auto" | "review",
  ): ProcessedBook => ({
    ai: ai(),
    best: null,
    alternatives: [],
    duplicate: null,
    classification: { bucket, reason },
  });

  it("splits into auto / queue / duplicates", () => {
    const books = [
      make("ok", "auto"),
      make("low_confidence", "review"),
      make("no_match", "review"),
      make("duplicate", "review"),
    ];
    const b = splitBuckets(books);
    expect(b.auto).toHaveLength(1);
    expect(b.queue).toHaveLength(2); // low_confidence + no_match
    expect(b.duplicates).toHaveLength(1);
  });
});

describe("shelfIntakePayload", () => {
  it("carries the enrichment cover and the batch shelf", () => {
    const payload = shelfIntakePayload(
      {
        title: " Dune ",
        authors: ["Frank Herbert"],
        categories: [],
        year: "1965",
      },
      "s1",
      "https://covers/dune.jpg",
    ) as {
      book: Record<string, unknown>;
      copy: { shelfId: string };
      coverSourceUrl: string;
    };
    expect(payload.book.title).toBe("Dune");
    expect(payload.book.publishedYear).toBe(1965);
    expect(payload.copy.shelfId).toBe("s1");
    expect(payload.coverSourceUrl).toBe("https://covers/dune.jpg");
  });
});
