import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runCreate,
  runCleanup,
  cleanupTotal,
  filterBackupForRetry,
  mergeRetryOutcomes,
} from "./restore-run";
import { creationSucceeded } from "./restore-summary";
import type { RestoreOutcome } from "./restore-summary";
import type { Backup } from "./backup";

function backup(overrides: Partial<Backup> = {}): Backup {
  return {
    exportedAt: "t",
    books: [
      {
        id: "b1",
        title: "Rayuela",
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
        pageCount: null,
        language: null,
        description: null,
        workKey: null,
        titleKey: null,
        source: null,
        coverSource: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    copies: [
      {
        id: "c1",
        bookId: "b1",
        shelfId: "s1",
        condition: null,
        acquiredAt: null,
        notes: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    readingEvents: [
      {
        id: "e1",
        readerId: "r1",
        bookId: "b1",
        copyId: "c1",
        status: "finished",
        dateStarted: null,
        dateFinished: null,
        rating: null,
        review: null,
        publishPending: false,
        bookTitle: "Rayuela",
        bookAuthors: [],
        isbn13: null,
        coverUrl: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    readers: [
      {
        id: "r1",
        name: "Frank",
        avatar: null,
        displayColor: null,
        goodreadsUrl: null,
        email: "frank@example.com",
        preferences: {},
        uid: "uid-1",
        pinHash: null,
        hasPin: false,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    shelves: [
      {
        id: "s1",
        name: "Estante A",
        location: null,
        description: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    wishlistItems: [
      {
        id: "w1",
        readerId: "r1",
        bookId: "b1",
        status: "wanted",
        priority: "normal",
        addedVia: "manual",
        bookTitle: "Sula",
        bookAuthors: [],
        isbn13: null,
        coverUrl: null,
        titleKey: null,
        authorKeys: [],
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    loans: [
      {
        id: "l1",
        copyId: "c1",
        borrowerName: "Juan",
        borrowerKey: "juan",
        loanedAt: "2026-01-01",
        dueDate: null,
        returnedAt: null,
        notes: null,
        bookId: "b1",
        bookTitle: "Rayuela",
        bookAuthors: [],
        coverUrl: null,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    series: [
      {
        id: "se1",
        name: "Una saga",
        volumes: [
          {
            position: 1,
            title: "Tomo 1",
            authors: [],
            isbn13: null,
            coverUrl: null,
            bookId: "b1",
          },
        ],
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    ...overrides,
  };
}

let idCounter = 0;
function jsonRes(body: unknown, ok = true, status = ok ? 200 : 500) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

/** A fetch mock that creates every POST with a fresh `new-N` id and always succeeds. */
function happyPathFetch() {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "GET" && url === "/api/readers") {
      return jsonRes([{ id: "existing-r1", email: "frank@example.com" }]);
    }
    if (method === "PATCH") return jsonRes({ ok: true });
    if (method === "DELETE") return jsonRes({ ok: true });
    if (method === "POST") {
      idCounter++;
      return jsonRes({ id: `new-${idCounter}` }, true, 201);
    }
    return jsonRes({}, false);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  idCounter = 0;
});

describe("runCreate", () => {
  it("creates every entity and remaps cross-references to the new ids", async () => {
    const calls: { url: string; body: unknown }[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (init?.body) {
        calls.push({ url, body: JSON.parse(String(init.body)) });
      }
      if (method === "GET" && url === "/api/readers") {
        return jsonRes([{ id: "existing-r1", email: "frank@example.com" }]);
      }
      if (method === "PATCH") return jsonRes({ ok: true });
      if (method === "POST") {
        idCounter++;
        return jsonRes({ id: `new-${idCounter}` }, true, 201);
      }
      return jsonRes({}, false);
    }) as unknown as typeof fetch;

    const { outcomes, idMap } = await runCreate(backup(), () => {});

    expect(creationSucceeded(outcomes)).toBe(true);
    expect(idMap.readers.get("r1")).toBe("existing-r1");
    expect(idMap.books.get("b1")).toBeDefined();
    expect(idMap.shelves.get("s1")).toBeDefined();
    expect(idMap.copies.get("c1")).toBeDefined();

    const copyCall = calls.find((c) => c.url === "/api/copies");
    expect((copyCall?.body as { bookId: string }).bookId).toBe(
      idMap.books.get("b1"),
    );
    expect((copyCall?.body as { shelfId: string }).shelfId).toBe(
      idMap.shelves.get("s1"),
    );

    const eventCall = calls.find((c) => c.url === "/api/reading-events");
    expect((eventCall?.body as { readerId: string }).readerId).toBe(
      "existing-r1",
    );
    expect((eventCall?.body as { copyId: string }).copyId).toBe(
      idMap.copies.get("c1"),
    );

    const seriesCall = calls.find((c) => c.url === "/api/series");
    const volumes = (seriesCall?.body as { volumes: { bookId: string }[] })
      .volumes;
    expect(volumes[0].bookId).toBe(idMap.books.get("b1"));
  });

  it("skips a reader with no email match, without creating one", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url === "/api/readers") return jsonRes([]);
      if (method === "POST") return jsonRes({ id: "new-1" }, true, 201);
      return jsonRes({}, false);
    }) as unknown as typeof fetch;

    const { outcomes, idMap } = await runCreate(
      backup({
        copies: [],
        readingEvents: [],
        wishlistItems: [],
        loans: [],
        series: [],
      }),
      () => {},
    );

    const readerOutcome = outcomes.find((o) => o.entityType === "reader");
    expect(readerOutcome?.result).toBe("skipped");
    expect(idMap.readers.has("r1")).toBe(false);
    // Skips don't block cleanup — only real failures do.
    expect(creationSucceeded(outcomes)).toBe(true);
  });

  it("fails a copy whose book failed to restore, without attempting the request", async () => {
    let bookPostAttempted = false;
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url === "/api/readers") return jsonRes([]);
      if (method === "POST" && url === "/api/books") {
        bookPostAttempted = true;
        return jsonRes({ error: "boom" }, false);
      }
      if (method === "POST" && url === "/api/copies") {
        throw new Error(
          "should not attempt to create a copy for a failed book",
        );
      }
      return jsonRes({ id: "new-x" }, true, 201);
    }) as unknown as typeof fetch;

    const { outcomes, idMap } = await runCreate(
      backup({ readingEvents: [], wishlistItems: [], loans: [], series: [] }),
      () => {},
    );

    expect(bookPostAttempted).toBe(true);
    expect(idMap.books.has("b1")).toBe(false);
    const copyOutcome = outcomes.find((o) => o.entityType === "copy");
    expect(copyOutcome?.result).toBe("failed");
    expect(copyOutcome?.reason).toMatch(/libro/);
    expect(creationSucceeded(outcomes)).toBe(false);
  });

  it("issues a second call to close a loan that was already returned in the backup", async () => {
    const posted: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url === "/api/readers") return jsonRes([]);
      if (method === "POST") {
        posted.push(url);
        return jsonRes({ id: "new-loan" }, true, 201);
      }
      return jsonRes({}, false);
    }) as unknown as typeof fetch;

    const b = backup({
      readingEvents: [],
      wishlistItems: [],
      series: [],
    });
    b.loans[0].returnedAt = "2026-02-01";

    const { outcomes } = await runCreate(b, () => {});

    expect(posted).toContain("/api/loans");
    expect(posted).toContain("/api/loans/new-loan/return");
    const loanOutcome = outcomes.find((o) => o.entityType === "loan");
    expect(loanOutcome?.result).toBe("created");
  });

  it("reports progress as entities are processed", async () => {
    global.fetch = happyPathFetch();
    const ticks: number[] = [];
    await runCreate(backup(), (done) => ticks.push(done));
    expect(ticks[ticks.length - 1]).toBe(ticks.length);
    expect(ticks.length).toBe(8); // 1 of each of the 8 entity types in the fixture
  });
});

describe("runCleanup", () => {
  it("deletes every snapshot id via the matching endpoint", async () => {
    const deleted: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "DELETE") deleted.push(String(input));
      return jsonRes({}, true, 204);
    }) as unknown as typeof fetch;

    const snapshot = {
      loans: ["l1"],
      readingEvents: ["e1"],
      wishlistItems: ["w1"],
      copies: ["c1"],
      books: ["b1"],
      series: ["se1"],
      shelves: ["s1"],
    };
    const outcomes = await runCleanup(snapshot, () => {});

    expect(deleted).toEqual([
      "/api/loans/l1",
      "/api/reading-events/e1",
      "/api/wishlist-items/w1",
      "/api/copies/c1",
      "/api/books/b1",
      "/api/series/se1",
      "/api/shelves/s1",
    ]);
    expect(outcomes.every((o) => o.result === "deleted")).toBe(true);
  });

  it("reports a failed delete instead of throwing", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === "/api/books/b1") return jsonRes({}, false, 409);
      return jsonRes({}, true, 204);
    }) as unknown as typeof fetch;

    const outcomes = await runCleanup(
      {
        loans: [],
        readingEvents: [],
        wishlistItems: [],
        copies: [],
        books: ["b1"],
        series: [],
        shelves: [],
      },
      () => {},
    );

    expect(outcomes[0].result).toBe("failed");
  });
});

describe("cleanupTotal", () => {
  it("sums every collection except readers", () => {
    expect(
      cleanupTotal({
        loans: ["1"],
        readingEvents: ["1", "2"],
        wishlistItems: [],
        copies: ["1"],
        books: ["1"],
        series: ["1"],
        shelves: ["1", "2", "3"],
      }),
    ).toBe(1 + 2 + 0 + 1 + 1 + 1 + 3);
  });
});

describe("filterBackupForRetry", () => {
  it("keeps only the entities that failed, per type", () => {
    const b = backup();
    const outcomes: RestoreOutcome[] = [
      { entityType: "book", label: "Rayuela", result: "failed", oldId: "b1" },
      { entityType: "copy", label: "Ejemplar", result: "failed", oldId: "c1" },
      {
        entityType: "shelf",
        label: "Estante A",
        result: "created",
        oldId: "s1",
        newId: "new-s1",
      },
    ];
    const filtered = filterBackupForRetry(b, outcomes);
    expect(filtered.books.map((x) => x.id)).toEqual(["b1"]);
    expect(filtered.copies.map((x) => x.id)).toEqual(["c1"]);
    expect(filtered.shelves).toEqual([]);
  });
});

describe("mergeRetryOutcomes", () => {
  it("replaces only the retried outcomes, keeping the rest untouched", () => {
    const previous: RestoreOutcome[] = [
      { entityType: "book", label: "Rayuela", result: "failed", oldId: "b1" },
      {
        entityType: "shelf",
        label: "Estante A",
        result: "created",
        oldId: "s1",
        newId: "new-s1",
      },
    ];
    const retried: RestoreOutcome[] = [
      {
        entityType: "book",
        label: "Rayuela",
        result: "created",
        oldId: "b1",
        newId: "new-b1",
      },
    ];
    const merged = mergeRetryOutcomes(previous, retried);
    expect(merged[0]).toEqual(retried[0]);
    expect(merged[1]).toEqual(previous[1]);
  });
});
