import { describe, it, expect, vi } from "vitest";
import { fetchBackup, backupFilename } from "./backup";

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const books = [{ id: "b1", title: "Rayuela" }];
const copies = [{ id: "c1", bookId: "b1" }];
const readingEvents = [{ id: "e1", bookId: "b1" }];
const readers = [{ id: "r1", name: "Sofía", hasPin: true }];
const shelves = [{ id: "s1", name: "Estante A" }];

describe("fetchBackup", () => {
  it("assembles all five collections plus a timestamp", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/books") return json(books);
      if (url === "/api/copies") return json(copies);
      if (url === "/api/reading-events") return json(readingEvents);
      if (url === "/api/readers") return json(readers);
      if (url === "/api/shelves") return json(shelves);
      return json({}, false);
    }) as unknown as typeof fetch;

    const backup = await fetchBackup();

    expect(backup.books).toEqual(books);
    expect(backup.copies).toEqual(copies);
    expect(backup.readingEvents).toEqual(readingEvents);
    expect(backup.readers).toEqual(readers);
    expect(backup.shelves).toEqual(shelves);
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does not reintroduce a pinHash for a reader with hasPin: true", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/readers") return json(readers);
      return json([]);
    }) as unknown as typeof fetch;

    const backup = await fetchBackup();
    expect(backup.readers[0]).not.toHaveProperty("pinHash");
    expect(backup.readers[0].hasPin).toBe(true);
  });

  it("degrades a failing collection to an empty array instead of throwing", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/books") return json({ error: "internal" }, false);
      return json([]);
    }) as unknown as typeof fetch;

    const backup = await fetchBackup();
    expect(backup.books).toEqual([]);
  });

  it("degrades to an empty array when fetch itself rejects", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/shelves") return Promise.reject(new Error("network"));
      return json([]);
    }) as unknown as typeof fetch;

    const backup = await fetchBackup();
    expect(backup.shelves).toEqual([]);
  });
});

describe("backupFilename", () => {
  it("formats as backup-biblioteca-YYYY-MM-DD.json", () => {
    expect(backupFilename(new Date("2026-07-09T12:00:00.000Z"))).toBe(
      "backup-biblioteca-2026-07-09.json",
    );
  });
});
