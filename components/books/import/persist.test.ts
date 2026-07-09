import { describe, it, expect, vi } from "vitest";
import { persistRow } from "./persist";
import type { ProcessedRow } from "./process";
import type { MappedRow } from "./mapping";

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const source: MappedRow = {
  title: "Rayuela",
  authors: ["Julio Cortázar"],
  isbn: "9780307474728",
  rating: 4,
  review: "Great structure",
  dateFinished: "2026-06-01",
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
  coverUrl: "https://covers.example/rayuela.jpg",
  coverWidth: 300,
  pageCount: 400,
  language: "es",
  description: null,
  titleKey: "rayuela",
  source: "google-books" as const,
};

function processedRow(overrides: Partial<ProcessedRow> = {}): ProcessedRow {
  return {
    key: "row-0",
    source,
    candidate,
    duplicate: null,
    recommendation: "add-new",
    include: true,
    physical: true,
    action: "create-new",
    ...overrides,
  };
}

describe("persistRow", () => {
  it("create-new + physical: intake with a copy, then a reading event", async () => {
    const calls: { url: string; body: unknown }[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (url === "/api/books/intake")
        return json({ book: { id: "b1" }, copy: { id: "c1" } }, true);
      if (url === "/api/reading-events") return json({ id: "e1" }, true);
      return json({}, false);
    }) as unknown as typeof fetch;

    const outcome = await persistRow(processedRow(), "r1");

    expect(outcome).toMatchObject({
      result: "added",
      bookId: "b1",
      copyId: "c1",
    });
    const intakeCall = calls.find((c) => c.url === "/api/books/intake");
    expect(intakeCall?.body).toMatchObject({ copy: { shelfId: null } });
    const eventCall = calls.find((c) => c.url === "/api/reading-events");
    expect(eventCall?.body).toMatchObject({
      readerId: "r1",
      bookId: "b1",
      copyId: "c1",
      status: "finished",
      rating: 4,
      review: "Great structure",
      dateFinished: "2026-06-01",
    });
  });

  it("create-new + digital: intake with no copy field", async () => {
    const calls: { url: string; body: unknown }[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (url === "/api/books/intake")
        return json({ book: { id: "b1" } }, true);
      if (url === "/api/reading-events") return json({ id: "e1" }, true);
      return json({}, false);
    }) as unknown as typeof fetch;

    const outcome = await persistRow(processedRow({ physical: false }), "r1");

    expect(outcome).toMatchObject({
      result: "added",
      bookId: "b1",
      copyId: undefined,
    });
    const intakeCall = calls.find((c) => c.url === "/api/books/intake");
    expect((intakeCall?.body as { copy?: unknown }).copy).toBeUndefined();
  });

  it("use-existing + physical: adds a copy against the matched book, then a reading event", async () => {
    const calls: { url: string; body: unknown }[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (url === "/api/copies") return json({ id: "c2" }, true);
      if (url === "/api/reading-events") return json({ id: "e1" }, true);
      return json({}, false);
    }) as unknown as typeof fetch;

    const duplicate = {
      book: {
        id: "b9",
        title: "Rayuela",
        authors: ["Julio Cortázar"],
        isbn13: "9780307474728",
      },
      tier: "exact" as const,
      score: 1,
      existingCopies: 1,
      suggestedAction: "add-copy" as const,
    };
    const outcome = await persistRow(
      processedRow({
        action: "use-existing",
        duplicate,
        recommendation: "add-copy",
      }),
      "r1",
    );

    expect(outcome).toMatchObject({
      result: "added_as_copy",
      bookId: "b9",
      copyId: "c2",
    });
    expect(calls.some((c) => c.url === "/api/books/intake")).toBe(false);
    const copyCall = calls.find((c) => c.url === "/api/copies");
    expect(copyCall?.body).toMatchObject({ bookId: "b9" });
  });

  it("use-existing + digital: no copy call, only a reading event against the matched book", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url === "/api/reading-events") return json({ id: "e1" }, true);
      return json({}, false);
    }) as unknown as typeof fetch;

    const duplicate = {
      book: {
        id: "b9",
        title: "Rayuela",
        authors: ["Julio Cortázar"],
        isbn13: "9780307474728",
      },
      tier: "exact" as const,
      score: 1,
      existingCopies: 1,
      suggestedAction: "add-copy" as const,
    };
    const outcome = await persistRow(
      processedRow({ action: "use-existing", physical: false, duplicate }),
      "r1",
    );

    expect(outcome).toMatchObject({
      result: "added_as_copy",
      bookId: "b9",
      copyId: undefined,
    });
    expect(calls).not.toContain("/api/copies");
  });

  it("marks the row failed (with a retry payload) when intake fails", async () => {
    global.fetch = vi.fn(() => json({}, false)) as unknown as typeof fetch;
    const outcome = await persistRow(processedRow(), "r1");
    expect(outcome.result).toBe("failed");
    expect(outcome.retry).toBeDefined();
  });

  it("marks the row failed with no retry when the book is created but the reading event fails", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/books/intake")
        return json({ book: { id: "b1" }, copy: { id: "c1" } }, true);
      return json({}, false); // reading-events fails
    }) as unknown as typeof fetch;

    const outcome = await persistRow(processedRow(), "r1");
    expect(outcome).toMatchObject({
      result: "failed",
      bookId: "b1",
      copyId: "c1",
    });
    expect(outcome.retry).toBeUndefined();
  });

  it("rest of the import is unaffected by one row failing (caller-level concern, sanity check independence)", async () => {
    let call = 0;
    global.fetch = vi.fn(() => {
      call += 1;
      return call === 1 ? json({}, false) : json({ book: { id: "b2" } }, true);
    }) as unknown as typeof fetch;

    const first = await persistRow(processedRow({ key: "row-0" }), "r1");
    expect(first.result).toBe("failed");
    // A fresh row, independent of the first's failure.
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/books/intake")
        return json({ book: { id: "b2" } }, true);
      if (url === "/api/reading-events") return json({ id: "e2" }, true);
      return json({}, false);
    }) as unknown as typeof fetch;
    const second = await persistRow(processedRow({ key: "row-1" }), "r1");
    expect(second.result).toBe("added");
  });
});
