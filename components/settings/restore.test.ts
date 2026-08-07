import { describe, it, expect } from "vitest";
import { parseBackupFile, entityCounts, snapshotFromBackup } from "./restore";

function validBackup() {
  return {
    exportedAt: "2026-08-07T00:00:00.000Z",
    books: [{ id: "b1", title: "Rayuela", createdAt: "t", updatedAt: "t" }],
    copies: [{ id: "c1", bookId: "b1", createdAt: "t", updatedAt: "t" }],
    readingEvents: [
      {
        id: "e1",
        readerId: "r1",
        bookId: "b1",
        status: "finished",
        bookTitle: "Rayuela",
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    readers: [
      {
        id: "r1",
        name: "Frank",
        email: "frank@example.com",
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    shelves: [{ id: "s1", name: "Estante A", createdAt: "t", updatedAt: "t" }],
    wishlistItems: [
      {
        id: "w1",
        readerId: "r1",
        addedVia: "manual",
        bookTitle: "Sula",
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
        bookTitle: "Rayuela",
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    series: [
      {
        id: "se1",
        name: "Una saga",
        volumes: [{ position: 1, title: "Tomo 1", bookId: "b1" }],
        createdAt: "t",
        updatedAt: "t",
      },
    ],
  };
}

describe("parseBackupFile", () => {
  it("accepts a valid backup and returns it typed", () => {
    const result = parseBackupFile(validBackup());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.books[0].title).toBe("Rayuela");
      expect(result.backup.loans[0].borrowerName).toBe("Juan");
    }
  });

  it("rejects an unrelated JSON file", () => {
    const result = parseBackupFile({ hello: "world" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a backup with an invalid entity, identifying which field failed", () => {
    const backup = validBackup();
    backup.books[0].title = "";
    const result = parseBackupFile(backup);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("books.0.title"))).toBe(true);
    }
  });

  it("rejects a non-object payload", () => {
    const result = parseBackupFile("not a backup");
    expect(result.ok).toBe(false);
  });
});

describe("entityCounts", () => {
  it("counts every collection", () => {
    const result = parseBackupFile(validBackup());
    if (!result.ok) throw new Error("expected valid backup");
    expect(entityCounts(result.backup)).toEqual({
      readers: 1,
      shelves: 1,
      books: 1,
      copies: 1,
      series: 1,
      readingEvents: 1,
      wishlistItems: 1,
      loans: 1,
    });
  });
});

describe("snapshotFromBackup", () => {
  it("captures ids for every deletable collection, excluding readers", () => {
    const result = parseBackupFile(validBackup());
    if (!result.ok) throw new Error("expected valid backup");
    const snapshot = snapshotFromBackup(result.backup);
    expect(snapshot).toEqual({
      loans: ["l1"],
      readingEvents: ["e1"],
      wishlistItems: ["w1"],
      copies: ["c1"],
      books: ["b1"],
      series: ["se1"],
      shelves: ["s1"],
    });
    expect(snapshot).not.toHaveProperty("readers");
  });
});
