import { slugify, arraySlugs } from "../../lib/text/slug";
import type { Candidate } from "./types";

/**
 * Source-to-`Book` normalization (#13). This module owns the "richer
 * normalization" that #12 deferred here: ISBN canonicalization, BISAC category
 * splitting, and the derived slug keys (`titleKey`/`authorKeys`/`categoryKeys`)
 * computed with the shared, deterministic `slugify`/`arraySlugs` helper. Every
 * function here is pure and unit-tested in the emulator-free lane (design D3/D4).
 */

/** Approximate cover widths (px) per source size bucket, for merge comparison. */
const GB_THUMBNAIL_WIDTH = 128;
const GB_SMALL_THUMBNAIL_WIDTH = 80;
const OL_COVER_WIDTHS = { large: 500, medium: 180, small: 90 } as const;

/**
 * Canonicalizes an ISBN string to a 13-digit ISBN-13 (design D6 / risk:
 * ISBN-10/13 inconsistency). Strips separators, converts a valid-length ISBN-10
 * to ISBN-13 with the 978 prefix and recomputed check digit. Returns `null` when
 * the input is not a usable ISBN-10/13.
 */
export function toIsbn13(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s-]/g, "");
  if (/^[0-9]{13}$/.test(cleaned)) return cleaned;
  if (/^[0-9]{9}[0-9Xx]$/.test(cleaned)) {
    const core = "978" + cleaned.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * Number(core[i]);
    }
    const check = (10 - (sum % 10)) % 10;
    return core + String(check);
  }
  return null;
}

/**
 * Splits Google Books BISAC category strings on `/` into trimmed display levels
 * and normalized slug keys (design D3). E.g. `"Fiction / Science Fiction"` →
 * `categories: ["Fiction", "Science Fiction"]`,
 * `categoryKeys: ["fiction", "science-fiction"]`. Open Library `subjects` are not
 * used as categories.
 */
export function splitBisacCategories(raw?: readonly string[] | null): {
  categories: string[];
  categoryKeys: string[];
} {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const entry of raw ?? []) {
    for (const part of entry.split("/")) {
      const level = part.trim();
      const key = level.toLowerCase();
      if (level && !seen.has(key)) {
        seen.add(key);
        categories.push(level);
      }
    }
  }
  return { categories, categoryKeys: arraySlugs(categories) };
}

/** Parses a leading 4-digit year from a free-form date string. */
function parseYear(date?: string | null): number | null {
  const match = date?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/** Minimal shape of the Google Books `volumeInfo` fields we consume. */
export interface GoogleVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  industryIdentifiers?: { type?: string; identifier?: string }[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

/**
 * Normalizes a Google Books volume into a `Candidate`. Returns `null` when the
 * volume has no usable title (a candidate without a title is not rankable, D4).
 */
export function normalizeGoogleVolume(
  info: GoogleVolumeInfo | undefined,
): Candidate | null {
  const title = info?.title?.trim();
  if (!title) return null;

  const authors = (info?.authors ?? [])
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
  const ids = info?.industryIdentifiers ?? [];
  const isbn13 = toIsbn13(
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
      ids.find((i) => i.type === "ISBN_10")?.identifier,
  );
  const isbn10Raw = ids.find((i) => i.type === "ISBN_10")?.identifier ?? null;
  const cover =
    info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail ?? null;
  const coverWidth = info?.imageLinks?.thumbnail
    ? GB_THUMBNAIL_WIDTH
    : info?.imageLinks?.smallThumbnail
      ? GB_SMALL_THUMBNAIL_WIDTH
      : null;
  const { categories, categoryKeys } = splitBisacCategories(info?.categories);

  return {
    title,
    subtitle: info?.subtitle?.trim() || null,
    authors,
    authorKeys: arraySlugs(authors),
    publisher: info?.publisher?.trim() || null,
    publishedYear: parseYear(info?.publishedDate),
    isbn13,
    isbn10: isbn10Raw ? isbn10Raw.replace(/[\s-]/g, "") : null,
    categories,
    categoryKeys,
    coverUrl: cover,
    coverWidth,
    pageCount: info?.pageCount ?? null,
    language: info?.language?.trim() || null,
    description: info?.description?.trim() || null,
    titleKey: slugify(title),
    source: "google-books",
  };
}

/** Minimal shape of an Open Library `jscmd=data` record we consume. */
export interface OpenLibraryRecord {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
  identifiers?: { isbn_13?: string[]; isbn_10?: string[] };
}

/**
 * Normalizes an Open Library record into a `Candidate`. Open Library acts as the
 * complement source (design D2): it contributes authors, covers, and gap-filling
 * fields. Its `subjects` are intentionally not mapped to categories (D3).
 */
export function normalizeOpenLibrary(
  record: OpenLibraryRecord | undefined,
): Candidate | null {
  const title = record?.title?.trim();
  if (!title) return null;

  const authors = (record?.authors ?? [])
    .map((a) => a.name?.trim() ?? "")
    .filter((a) => a.length > 0);
  const cover =
    record?.cover?.large ??
    record?.cover?.medium ??
    record?.cover?.small ??
    null;
  const coverWidth = record?.cover?.large
    ? OL_COVER_WIDTHS.large
    : record?.cover?.medium
      ? OL_COVER_WIDTHS.medium
      : record?.cover?.small
        ? OL_COVER_WIDTHS.small
        : null;

  return {
    title,
    subtitle: record?.subtitle?.trim() || null,
    authors,
    authorKeys: arraySlugs(authors),
    publisher: record?.publishers?.[0]?.name?.trim() || null,
    publishedYear: parseYear(record?.publish_date),
    isbn13: toIsbn13(record?.identifiers?.isbn_13?.[0]),
    isbn10: record?.identifiers?.isbn_10?.[0]?.replace(/[\s-]/g, "") ?? null,
    categories: [],
    categoryKeys: [],
    coverUrl: cover,
    coverWidth,
    pageCount: record?.number_of_pages ?? null,
    language: null,
    description: null,
    titleKey: slugify(title),
    source: "open-library",
  };
}
