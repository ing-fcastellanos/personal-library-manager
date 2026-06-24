import { describe, it, expect } from "vitest";
import { bookSchema } from "./book";
import { copySchema } from "./copy";
import { readingEventSchema } from "./reading-event";
import { shelfSchema } from "./shelf";

const now = "2026-06-23T00:00:00.000Z";
const ts = { createdAt: now, updatedAt: now };

describe("bookSchema", () => {
  it("accepts a valid book", () => {
    expect(
      bookSchema.safeParse({
        id: "b1",
        title: "El nombre del viento",
        authors: ["Patrick Rothfuss"],
        authorKeys: ["patrick-rothfuss"],
        categories: ["Fantasía"],
        categoryKeys: ["fantasia"],
        ...ts,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing/empty title", () => {
    expect(bookSchema.safeParse({ id: "b1", title: "", ...ts }).success).toBe(
      false,
    );
  });

  it("treats ISBN as an optional field (a book without ISBN is valid)", () => {
    expect(
      bookSchema.safeParse({ id: "b1", title: "Sin ISBN", ...ts }).success,
    ).toBe(true);
  });

  it("accepts a coverSource of metadata or user and rejects others (#15)", () => {
    expect(
      bookSchema.safeParse({
        id: "b1",
        title: "Con portada",
        coverSource: "user",
        ...ts,
      }).success,
    ).toBe(true);
    expect(
      bookSchema.safeParse({
        id: "b1",
        title: "Con portada",
        coverSource: "scanner",
        ...ts,
      }).success,
    ).toBe(false);
  });
});

describe("copySchema", () => {
  it("requires a bookId", () => {
    expect(copySchema.safeParse({ id: "c1", ...ts }).success).toBe(false);
  });

  it("allows an unshelved copy (no shelfId)", () => {
    expect(
      copySchema.safeParse({ id: "c1", bookId: "b1", ...ts }).success,
    ).toBe(true);
  });
});

describe("readingEventSchema", () => {
  const valid = {
    id: "e1",
    readerId: "r1",
    bookId: "b1",
    status: "finished" as const,
    bookTitle: "El nombre del viento",
    bookAuthors: ["Patrick Rothfuss"],
    ...ts,
  };

  it("requires readerId and bookId", () => {
    expect(
      readingEventSchema.safeParse({ ...valid, readerId: undefined }).success,
    ).toBe(false);
    expect(
      readingEventSchema.safeParse({ ...valid, bookId: undefined }).success,
    ).toBe(false);
  });

  it("is valid without a copyId (imported reading)", () => {
    expect(readingEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a rating outside 1–5", () => {
    expect(readingEventSchema.safeParse({ ...valid, rating: 6 }).success).toBe(
      false,
    );
    expect(readingEventSchema.safeParse({ ...valid, rating: 0 }).success).toBe(
      false,
    );
  });
});

describe("shelfSchema", () => {
  it("accepts a valid shelf and rejects a missing name", () => {
    expect(
      shelfSchema.safeParse({ id: "s1", name: "Sala", ...ts }).success,
    ).toBe(true);
    expect(shelfSchema.safeParse({ id: "s1", name: "", ...ts }).success).toBe(
      false,
    );
  });
});
