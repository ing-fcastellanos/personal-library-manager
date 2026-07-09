import type { ReadingEvent } from "@/lib/types/reading-event";

/**
 * Goodreads search + CSV export helpers (#34, ADR-0005). No write API exists
 * for Goodreads/StoryGraph, so the app never publishes automatically — it
 * only builds a search link (for the reader to publish manually) and an
 * importable CSV.
 */

/** A Goodreads search URL for a book, preferring ISBN (more precise) over title. */
export function goodreadsSearchUrl(
  isbn13: string | null | undefined,
  title: string,
): string {
  const q = isbn13 || title;
  return `https://www.goodreads.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * RFC 4180 field escaping: wraps in double quotes (doubling any internal
 * quotes) when the value contains a comma, quote, or newline.
 */
export function toCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADER = [
  "Title",
  "Author",
  "ISBN",
  "My Rating",
  "My Review",
  "Date Read",
];

/** Builds a Goodreads/StoryGraph-importable CSV (header + one row per event). */
export function eventsToCsv(events: ReadingEvent[]): string {
  const rows = events.map((e) =>
    [
      e.bookTitle,
      e.bookAuthors.join(", "),
      e.isbn13 ?? "",
      e.rating != null ? String(e.rating) : "",
      e.review ?? "",
      e.dateFinished ?? "",
    ]
      .map(toCsvField)
      .join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\n");
}
