import type { ColumnMapping } from "./format";
import { isFinishedStatus } from "./format";

/** A CSV row after the confirmed mapping has been applied (design D3/D9). */
export interface MappedRow {
  title: string;
  authors: string[];
  isbn: string | null;
  rating: number | null;
  review: string | null;
  dateFinished: string | null;
}

/**
 * Strips Goodreads' `="9780307474728"` Excel-formula escape (used to stop
 * spreadsheet apps from mangling leading zeros) from an ISBN value.
 */
export function normalizeIsbn(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const escaped = /^="(.*)"$/.exec(trimmed);
  const value = (escaped ? escaped[1] : trimmed).trim();
  return value || null;
}

/** Goodreads uses `0` for "unrated"; anything else is clamped to 1-5. */
function parseRating(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Normalizes a date-finished value into ISO (`YYYY-MM-DD`), matching how the
 * rest of the app stores dates. Goodreads exports `YYYY/MM/DD`; StoryGraph
 * already exports ISO. Anything else passes through unchanged rather than
 * being dropped, since a slightly odd date string is still better than losing
 * the reading's date entirely.
 */
function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const slash = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(trimmed);
  return slash ? `${slash[1]}-${slash[2]}-${slash[3]}` : trimmed;
}

function mapRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
): MappedRow {
  const title = (row[mapping.title] ?? "").trim();
  const authorRaw = (row[mapping.author] ?? "").trim();
  const authors = authorRaw
    ? authorRaw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];
  const isbn = mapping.isbn ? normalizeIsbn(row[mapping.isbn] ?? "") : null;
  const rating = mapping.rating ? parseRating(row[mapping.rating] ?? "") : null;
  const review = mapping.review ? (row[mapping.review] ?? "").trim() : "";
  const dateFinished = mapping.dateFinished
    ? normalizeDate(row[mapping.dateFinished] ?? "")
    : null;

  return {
    title,
    authors,
    isbn,
    rating,
    review: review || null,
    dateFinished,
  };
}

/**
 * Applies the confirmed column mapping to every parsed row and keeps only the
 * ones whose mapped status indicates a finished reading — `currently-reading`,
 * `to-read`, `did-not-finish`, and anything else are dropped before enrichment
 * (design D3).
 */
export function filterFinishedRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): MappedRow[] {
  return rows
    .filter((row) => isFinishedStatus(row[mapping.status] ?? ""))
    .map((row) => mapRow(row, mapping));
}
