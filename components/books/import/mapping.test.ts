import { describe, it, expect } from "vitest";
import { filterFinishedRows, normalizeIsbn } from "./mapping";
import { defaultMapping } from "./format";

const goodreadsMapping = defaultMapping("goodreads");
const storygraphMapping = defaultMapping("storygraph");

function goodreadsRow(overrides: Record<string, string> = {}) {
  return {
    Title: "Rayuela",
    Author: "Julio Cortázar",
    ISBN13: '="9780307474728"',
    "My Rating": "4",
    "My Review": "Great structure",
    "Date Read": "2026/06/01",
    "Exclusive Shelf": "read",
    ...overrides,
  };
}

function storygraphRow(overrides: Record<string, string> = {}) {
  return {
    Title: "Ficciones",
    Authors: "Jorge Luis Borges",
    "ISBN/UID": "9788499089946",
    "Star Rating": "5",
    Review: "Every story a universe",
    "Last Date Read": "2026-06-14",
    "Read Status": "read",
    ...overrides,
  };
}

describe("normalizeIsbn", () => {
  it("strips the Goodreads Excel-escape wrapper", () => {
    expect(normalizeIsbn('="9780307474728"')).toBe("9780307474728");
  });

  it("passes through a plain ISBN unchanged", () => {
    expect(normalizeIsbn("9788499089946")).toBe("9788499089946");
  });

  it("returns null for an empty escaped value", () => {
    expect(normalizeIsbn('=""')).toBeNull();
  });

  it("returns null for a blank value", () => {
    expect(normalizeIsbn("   ")).toBeNull();
  });
});

describe("filterFinishedRows", () => {
  it("keeps a Goodreads 'read' row and maps its fields", () => {
    const result = filterFinishedRows([goodreadsRow()], goodreadsMapping);
    expect(result).toEqual([
      {
        title: "Rayuela",
        authors: ["Julio Cortázar"],
        isbn: "9780307474728",
        rating: 4,
        review: "Great structure",
        dateFinished: "2026-06-01",
      },
    ]);
  });

  it("keeps a StoryGraph 'read' row and maps its fields", () => {
    const result = filterFinishedRows([storygraphRow()], storygraphMapping);
    expect(result).toEqual([
      {
        title: "Ficciones",
        authors: ["Jorge Luis Borges"],
        isbn: "9788499089946",
        rating: 5,
        review: "Every story a universe",
        dateFinished: "2026-06-14",
      },
    ]);
  });

  it("drops to-read, currently-reading, and did-not-finish rows", () => {
    const rows = [
      goodreadsRow({ "Exclusive Shelf": "to-read" }),
      goodreadsRow({ "Exclusive Shelf": "currently-reading" }),
      storygraphRow({ "Read Status": "did-not-finish" }),
    ];
    expect(filterFinishedRows(rows, goodreadsMapping)).toEqual([]);
  });

  it("maps a Goodreads 0 rating (unrated) to null, not 0", () => {
    const result = filterFinishedRows(
      [goodreadsRow({ "My Rating": "0" })],
      goodreadsMapping,
    );
    expect(result[0].rating).toBeNull();
  });

  it("splits multiple comma-separated authors", () => {
    const result = filterFinishedRows(
      [goodreadsRow({ Author: "Julio Cortázar, Otro Autor" })],
      goodreadsMapping,
    );
    expect(result[0].authors).toEqual(["Julio Cortázar", "Otro Autor"]);
  });

  it("normalizes a Goodreads YYYY/MM/DD date to ISO", () => {
    const result = filterFinishedRows(
      [goodreadsRow({ "Date Read": "2026/01/09" })],
      goodreadsMapping,
    );
    expect(result[0].dateFinished).toBe("2026-01-09");
  });

  it("passes through an already-ISO StoryGraph date unchanged", () => {
    const result = filterFinishedRows(
      [storygraphRow({ "Last Date Read": "2026-06-14" })],
      storygraphMapping,
    );
    expect(result[0].dateFinished).toBe("2026-06-14");
  });
});
