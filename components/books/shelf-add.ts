import { classifyShelfBook, type Classification } from "@/services/ai/shelf";
import type { IdentifyCandidate } from "./photo-add";
import type { BookData, ExistingBook } from "./types";

/**
 * Pure helpers for the add-by-shelf batch flow (#21b). Kept out of the React
 * container so the query building, bucket splitting, and intake payload are
 * unit-testable. The container does the fetching; these shape the data.
 */

/** An AI-identified shelf book from `POST /api/ai/identify-shelf` (`books[]`). */
export interface ShelfAICandidate {
  title: string;
  authors?: string[];
  isbn13?: string | null;
  confidence: number;
  sourceProvider: "openai" | "gemini";
}

/** One shelf book after enrichment + duplicate check + classification. */
export interface ProcessedBook {
  ai: ShelfAICandidate;
  /** Enrichment best match, or null when nothing matched. */
  best: IdentifyCandidate | null;
  /** Other enrichment matches (for the low-confidence picker). */
  alternatives: IdentifyCandidate[];
  /** The existing book this duplicates, if any. */
  duplicate: ExistingBook | null;
  classification: Classification;
}

/** Builds the `/api/enrich` URL for a shelf book (ISBN when present, else text). */
export function shelfEnrichUrl(ai: ShelfAICandidate): string {
  if (ai.isbn13 && ai.isbn13.trim()) {
    return `/api/enrich?isbn=${encodeURIComponent(ai.isbn13.trim())}`;
  }
  const q = [ai.title, ...(ai.authors ?? [])].join(" ").trim();
  return `/api/enrich?q=${encodeURIComponent(q)}`;
}

/** Builds the `/api/books/duplicates` URL from a candidate's identity. */
export function duplicatesUrl(c: {
  isbn13?: string | null;
  title: string;
  authors?: string[];
}): string {
  const qs = new URLSearchParams();
  if (c.isbn13?.trim()) qs.set("isbn", c.isbn13.trim());
  if (c.title.trim()) qs.set("title", c.title.trim());
  (c.authors ?? []).forEach((a) => qs.append("authors", a));
  return `/api/books/duplicates?${qs.toString()}`;
}

/**
 * Classifies a processed book from its parts. `enriched` is whether enrichment
 * found a `best`; `duplicate` is whether a match exists. Thin wrapper over the
 * 21a rule so the container doesn't repeat the input shaping.
 */
export function classifyProcessed(input: {
  ai: ShelfAICandidate;
  best: IdentifyCandidate | null;
  duplicate: ExistingBook | null;
}): Classification {
  return classifyShelfBook({
    aiConfidence: input.ai.confidence,
    enriched: input.best !== null,
    duplicate: input.duplicate !== null,
  });
}

export interface ShelfBuckets {
  /** Confident, matched, non-duplicate — added after the preview. */
  auto: ProcessedBook[];
  /** Low-confidence or no-match — reviewed one by one. */
  queue: ProcessedBook[];
  /** Duplicates — handled in bulk. */
  duplicates: ProcessedBook[];
}

/** Splits processed books into the auto / one-by-one-review / duplicates buckets. */
export function splitBuckets(books: ProcessedBook[]): ShelfBuckets {
  const buckets: ShelfBuckets = { auto: [], queue: [], duplicates: [] };
  for (const b of books) {
    if (b.classification.bucket === "auto") buckets.auto.push(b);
    else if (b.classification.reason === "duplicate")
      buckets.duplicates.push(b);
    else buckets.queue.push(b);
  }
  return buckets;
}

/**
 * `POST /api/books/intake` payload for a shelf book: the book metadata plus the
 * enrichment cover (re-hosted by intake, #13) and the batch shelf. Unlike the
 * single-photo flow, the cover here is the enrichment cover, not a user photo.
 */
export function shelfIntakePayload(
  book: BookData,
  shelfId: string,
  coverSourceUrl: string | null,
): unknown {
  return {
    book: {
      title: book.title.trim(),
      subtitle: book.subtitle?.trim() || null,
      authors: book.authors,
      publisher: book.publisher?.trim() || null,
      publishedYear: book.year ? Number(book.year) : null,
      isbn13: book.isbn13?.trim() || null,
      isbn10: book.isbn10?.trim() || null,
      categories: book.categories,
      language: book.language?.trim() || null,
      pageCount: book.pages ? Number(book.pages) : null,
      description: book.description?.trim() || null,
    },
    copy: { shelfId: shelfId || null },
    coverSourceUrl: coverSourceUrl ?? null,
  };
}
