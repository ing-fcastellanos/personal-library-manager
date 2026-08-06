import { describe, it, expect, vi } from "vitest";
import { mergeActivity, fetchBookActivity } from "./activity";
import type { AuditLogEntry } from "@/lib/types/audit-log";

function entry(o: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "a1",
    readerId: "r1",
    action: "update",
    entityType: "book",
    entityId: "b1",
    entityLabel: "Rayuela",
    changedFields: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...o,
  };
}

describe("mergeActivity", () => {
  it("merges and sorts most-recent-first", () => {
    const merged = mergeActivity([
      [entry({ id: "a1", createdAt: "2026-07-01T00:00:00.000Z" })],
      [entry({ id: "a2", createdAt: "2026-07-03T00:00:00.000Z" })],
    ]);
    expect(merged.map((e) => e.id)).toEqual(["a2", "a1"]);
  });
});

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("fetchBookActivity", () => {
  it("queries the book and each copy/event id, merged", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("entityType=book"))
        return jsonResponse([
          entry({ id: "book-edit", createdAt: "2026-07-01T00:00:00.000Z" }),
        ]);
      if (url.includes("entityType=copy"))
        return jsonResponse([
          entry({
            id: "copy-edit",
            entityType: "copy",
            createdAt: "2026-07-05T00:00:00.000Z",
          }),
        ]);
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    const result = await fetchBookActivity("b1", ["c1"], ["e1"]);
    expect(calls).toEqual([
      "/api/audit-log?entityType=book&entityId=b1",
      "/api/audit-log?entityType=copy&entityId=c1",
      "/api/audit-log?entityType=readingEvent&entityId=e1",
    ]);
    expect(result.map((e) => e.id)).toEqual(["copy-edit", "book-edit"]);
  });

  it("degrades a failing query to empty instead of throwing", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false } as Response),
    ) as unknown as typeof fetch;
    expect(await fetchBookActivity("b1", [], [])).toEqual([]);
  });
});
