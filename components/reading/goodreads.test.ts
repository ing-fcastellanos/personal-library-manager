import { describe, it, expect } from "vitest";
import { goodreadsSearchUrl, toCsvField, eventsToCsv } from "./goodreads";
import type { ReadingEvent } from "@/lib/types/reading-event";

/** Unit tests for the Goodreads search + CSV export helpers (#34). */

const event = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: "2026-07-06",
  rating: 4,
  review: "Buenísima.",
  publishPending: false,
  bookTitle: "Rayuela",
  bookAuthors: ["Julio Cortázar"],
  isbn13: "9788437604572",
  coverUrl: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

describe("goodreadsSearchUrl", () => {
  it("prefers the ISBN when present", () => {
    expect(goodreadsSearchUrl("9788437604572", "Rayuela")).toBe(
      "https://www.goodreads.com/search?q=9788437604572",
    );
  });

  it("falls back to the title with no ISBN", () => {
    expect(goodreadsSearchUrl(null, "Rayuela")).toBe(
      "https://www.goodreads.com/search?q=Rayuela",
    );
  });

  it("URL-encodes the query", () => {
    expect(goodreadsSearchUrl(null, "Cien años de soledad")).toBe(
      "https://www.goodreads.com/search?q=Cien%20a%C3%B1os%20de%20soledad",
    );
  });
});

describe("toCsvField", () => {
  it("leaves a plain value untouched", () => {
    expect(toCsvField("Rayuela")).toBe("Rayuela");
  });

  it("quotes a value containing a comma", () => {
    expect(toCsvField("Cortázar, Julio")).toBe('"Cortázar, Julio"');
  });

  it("quotes and doubles internal quotes", () => {
    expect(toCsvField('Dijo "genial"')).toBe('"Dijo ""genial"""');
  });

  it("quotes a value containing a newline", () => {
    expect(toCsvField("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
  });

  it("quotes a value with comma AND quotes together", () => {
    expect(toCsvField('Dijo "hola", y se fue')).toBe(
      '"Dijo ""hola"", y se fue"',
    );
  });
});

describe("eventsToCsv", () => {
  it("builds a header row plus one row per event", () => {
    const csv = eventsToCsv([event({})]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Title,Author,ISBN,My Rating,My Review,Date Read");
    expect(lines[1]).toBe(
      "Rayuela,Julio Cortázar,9788437604572,4,Buenísima.,2026-07-06",
    );
  });

  it("joins multiple authors with a comma, quoted", () => {
    const csv = eventsToCsv([
      event({ bookAuthors: ["Jorge Luis Borges", "Adolfo Bioy Casares"] }),
    ]);
    expect(csv).toContain('"Jorge Luis Borges, Adolfo Bioy Casares"');
  });

  it("renders missing rating/review/isbn/date as empty fields", () => {
    const csv = eventsToCsv([
      event({ rating: null, review: null, isbn13: null, dateFinished: null }),
    ]);
    expect(csv.split("\n")[1]).toBe("Rayuela,Julio Cortázar,,,,");
  });

  it("returns just the header for no events", () => {
    expect(eventsToCsv([])).toBe(
      "Title,Author,ISBN,My Rating,My Review,Date Read",
    );
  });
});
