import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processRow,
  processRows,
  defaultActionFor,
  enrichUrl,
  duplicatesUrl,
} from "./process";
import type { MappedRow } from "./mapping";

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const row: MappedRow = {
  title: "Rayuela",
  authors: ["Julio Cortázar"],
  isbn: "9780307474728",
  rating: 4,
  review: "Great structure",
  dateFinished: "2026/06/01",
};

const candidate = {
  title: "Rayuela",
  subtitle: null,
  authors: ["Julio Cortázar"],
  authorKeys: ["julio-cortazar"],
  publisher: "Sudamericana",
  publishedYear: 1963,
  isbn13: "9780307474728",
  isbn10: null,
  categories: [],
  categoryKeys: [],
  coverUrl: null,
  coverWidth: null,
  pageCount: null,
  language: null,
  description: null,
  titleKey: "rayuela",
  source: "google-books" as const,
};

describe("enrichUrl / duplicatesUrl", () => {
  it("builds an ISBN enrich URL when present", () => {
    expect(enrichUrl("9780307474728", "Rayuela", [])).toBe(
      "/api/enrich?isbn=9780307474728",
    );
  });

  it("falls back to a text query when there is no ISBN", () => {
    expect(enrichUrl(null, "Rayuela", ["Julio Cortázar"])).toBe(
      "/api/enrich?q=" + encodeURIComponent("Rayuela Julio Cortázar"),
    );
  });

  it("builds a duplicates URL from isbn/title/authors", () => {
    const url = duplicatesUrl({
      isbn13: "9780307474728",
      title: "Rayuela",
      authors: ["Julio Cortázar"],
    });
    expect(url).toBe(
      "/api/books/duplicates?isbn=9780307474728&title=Rayuela&authors=Julio+Cort%C3%A1zar",
    );
  });
});

describe("defaultActionFor", () => {
  it("matches design D5's table", () => {
    expect(defaultActionFor("add-new")).toBe("create-new");
    expect(defaultActionFor("add-copy")).toBe("use-existing");
    expect(defaultActionFor("add-new-edition")).toBe("create-new");
    expect(defaultActionFor("review")).toBe("create-new");
  });
});

describe("processRow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enriches by ISBN and defaults to create-new with no duplicate match", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/enrich")) return json({ candidate });
      if (url.startsWith("/api/books/duplicates"))
        return json({ recommendation: "add-new", matches: [] });
      return json({});
    }) as unknown as typeof fetch;

    const result = await processRow(row, "row-0");
    expect(result.candidate).toEqual(candidate);
    expect(result.duplicate).toBeNull();
    expect(result.recommendation).toBe("add-new");
    expect(result.action).toBe("create-new");
    expect(result.include).toBe(true);
    expect(result.physical).toBe(true);
  });

  it("falls back to a text search when the row has no ISBN", async () => {
    const noIsbnRow: MappedRow = { ...row, isbn: null };
    const calls: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("/api/enrich"))
        return json({ candidates: [candidate] });
      if (url.startsWith("/api/books/duplicates"))
        return json({ recommendation: "add-new", matches: [] });
      return json({});
    }) as unknown as typeof fetch;

    await processRow(noIsbnRow, "row-0");
    expect(calls[0]).toContain("/api/enrich?q=");
  });

  it("produces a valid row using only CSV fields when enrichment finds nothing", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/enrich")) return json({ candidate: null });
      if (url.startsWith("/api/books/duplicates"))
        return json({ recommendation: "add-new", matches: [] });
      return json({});
    }) as unknown as typeof fetch;

    const result = await processRow(row, "row-0");
    expect(result.candidate).toBeNull();
    expect(result.source.title).toBe("Rayuela");
    expect(result.action).toBe("create-new");
  });

  it("defaults to use-existing when the duplicate check returns add-copy", async () => {
    const match = {
      book: {
        id: "b1",
        title: "Rayuela",
        authors: ["Julio Cortázar"],
        isbn13: "9780307474728",
      },
      tier: "exact" as const,
      score: 1,
      existingCopies: 1,
      suggestedAction: "add-copy" as const,
    };
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/enrich")) return json({ candidate });
      if (url.startsWith("/api/books/duplicates"))
        return json({ recommendation: "add-copy", matches: [match] });
      return json({});
    }) as unknown as typeof fetch;

    const result = await processRow(row, "row-0");
    expect(result.duplicate).toEqual(match);
    expect(result.action).toBe("use-existing");
  });
});

describe("processRows", () => {
  it("processes rows sequentially and reports progress after each", async () => {
    global.fetch = vi.fn(() =>
      json({ candidate: null }),
    ) as unknown as typeof fetch;
    const rows: MappedRow[] = [row, { ...row, title: "Ficciones" }];
    const progressCalls: Array<[number, number]> = [];

    const result = await processRows(rows, (done, total) =>
      progressCalls.push([done, total]),
    );

    expect(result).toHaveLength(2);
    expect(progressCalls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
