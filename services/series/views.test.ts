import { describe, it, expect } from "vitest";
import { isMissing, seriesForBook, volumeCounts } from "./views";
import type { Series } from "../../lib/types/series";

function series(o: Partial<Series>): Series {
  return {
    id: "s1",
    name: "El Señor de los Anillos",
    volumes: [
      {
        position: 1,
        title: "La Comunidad del Anillo",
        authors: [],
        bookId: "b1",
      },
      { position: 2, title: "Las Dos Torres", authors: [], bookId: null },
    ],
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    ...o,
  };
}

describe("isMissing", () => {
  it("is missing without a bookId, owned with one", () => {
    expect(
      isMissing({ position: 1, title: "x", authors: [], bookId: null }),
    ).toBe(true);
    expect(
      isMissing({ position: 1, title: "x", authors: [], bookId: "b1" }),
    ).toBe(false);
  });
});

describe("seriesForBook", () => {
  it("finds the series containing a volume linked to the book", () => {
    const s = series({});
    expect(seriesForBook("b1", [s])?.id).toBe("s1");
  });

  it("returns null for a book in no series", () => {
    expect(seriesForBook("b9", [series({})])).toBeNull();
  });
});

describe("volumeCounts", () => {
  it("counts owned vs total volumes", () => {
    expect(volumeCounts(series({}))).toEqual({ owned: 1, total: 2 });
  });

  it("counts a fully-owned series", () => {
    const s = series({
      volumes: [
        { position: 1, title: "A", authors: [], bookId: "b1" },
        { position: 2, title: "B", authors: [], bookId: "b2" },
      ],
    });
    expect(volumeCounts(s)).toEqual({ owned: 2, total: 2 });
  });
});
