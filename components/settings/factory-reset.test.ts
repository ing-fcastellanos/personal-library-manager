import { describe, it, expect } from "vitest";
import {
  planFactoryReset,
  hasAnythingToDelete,
  resetSucceeded,
  needsRetry,
} from "./factory-reset";
import type { Backup } from "./backup";
import type { RestoreOutcome } from "./restore-summary";

/**
 * Unit tests for the factory reset plan. The deletion itself is `runCleanup`,
 * already covered by the restore tests — what's specific here is *what* gets
 * planned for deletion, and above all what doesn't.
 */

/** Only the fields the plan reads (ids); cast keeps the fixture readable. */
function backupWith(counts: {
  books?: number;
  copies?: number;
  readingEvents?: number;
  wishlistItems?: number;
  loans?: number;
  series?: number;
  shelves?: number;
  readers?: number;
}): Backup {
  const ids = (n = 0, prefix = "x") =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}` }));
  return {
    exportedAt: "2026-08-10T00:00:00.000Z",
    books: ids(counts.books, "book"),
    copies: ids(counts.copies, "copy"),
    readingEvents: ids(counts.readingEvents, "event"),
    wishlistItems: ids(counts.wishlistItems, "wish"),
    loans: ids(counts.loans, "loan"),
    series: ids(counts.series, "series"),
    shelves: ids(counts.shelves, "shelf"),
    readers: ids(counts.readers, "reader"),
  } as unknown as Backup;
}

const outcome = (
  result: RestoreOutcome["result"],
  id = "a",
): RestoreOutcome => ({
  entityType: "book",
  label: id,
  result,
  oldId: id,
});

describe("planFactoryReset", () => {
  it("plans every resettable entity, with counts matching the ids", () => {
    const plan = planFactoryReset(
      backupWith({
        books: 11,
        copies: 11,
        readingEvents: 6,
        wishlistItems: 4,
        loans: 2,
        series: 3,
        shelves: 5,
      }),
    );

    expect(plan.counts).toEqual({
      books: 11,
      copies: 11,
      readingEvents: 6,
      wishlistItems: 4,
      loans: 2,
      series: 3,
      shelves: 5,
    });
    expect(plan.snapshot.books).toHaveLength(11);
    expect(plan.snapshot.shelves).toHaveLength(5);
    expect(plan.total).toBe(42);
  });

  it("never plans to delete readers, even when the library has them", () => {
    const plan = planFactoryReset(backupWith({ books: 2, readers: 3 }));

    // Readers must not appear in the snapshot, be counted, or reach the total.
    expect(plan.snapshot).not.toHaveProperty("readers");
    expect(plan.counts).not.toHaveProperty("readers");
    expect(plan.total).toBe(2);
  });

  it("reports an empty library as having nothing to delete", () => {
    const plan = planFactoryReset(backupWith({}));
    expect(plan.total).toBe(0);
    expect(hasAnythingToDelete(plan)).toBe(false);
  });

  it("reports a non-empty library as having something to delete", () => {
    expect(
      hasAnythingToDelete(planFactoryReset(backupWith({ shelves: 1 }))),
    ).toBe(true);
  });
});

describe("resetSucceeded / needsRetry", () => {
  it("treats an all-deleted run as a success with nothing to retry", () => {
    const outcomes = [outcome("deleted", "a"), outcome("deleted", "b")];
    expect(resetSucceeded(outcomes)).toBe(true);
    expect(needsRetry(outcomes)).toBe(false);
  });

  it("treats any failure as unsuccessful and retryable", () => {
    const outcomes = [outcome("deleted", "a"), outcome("failed", "b")];
    expect(resetSucceeded(outcomes)).toBe(false);
    expect(needsRetry(outcomes)).toBe(true);
  });

  it("treats an empty run as a success", () => {
    expect(resetSucceeded([])).toBe(true);
    expect(needsRetry([])).toBe(false);
  });
});
