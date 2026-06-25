import type { BookCreateInput } from "../../lib/types/book";

/**
 * Metadata enrichment service (#13). A `Candidate` is normalized metadata from an
 * external source, shaped like a `Book` plus the derived slug keys used for
 * ranking and the originating `source`. Enrichment only *suggests* candidates —
 * persistence is the existing `POST /api/books` (two-step flow, design D1/Non-Goals).
 */

/**
 * Candidate provenance. The free metadata sources are listed in priority order
 * (design D2); `"ai"` marks a candidate produced by the AI vision layer
 * (`services/ai`, #19) so AI identifications flow through the same intake path.
 */
export type EnrichmentSource = "google-books" | "open-library" | "ai";

/**
 * A normalized metadata candidate. `coverUrl` is the *external* source URL (a
 * preview); it is re-hosted to Storage only when the book is persisted (design
 * D6). `coverWidth` is an approximate pixel width used solely to pick the
 * higher-resolution cover during merge — it is not persisted on the `Book`.
 */
export interface Candidate {
  title: string;
  subtitle: string | null;
  authors: string[];
  authorKeys: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn13: string | null;
  isbn10: string | null;
  categories: string[];
  categoryKeys: string[];
  coverUrl: string | null;
  coverWidth: number | null;
  pageCount: number | null;
  language: string | null;
  description: string | null;
  titleKey: string;
  source: EnrichmentSource;
}

/**
 * Projects a candidate into the `BookCreateInput` accepted by `POST /api/books`.
 * Derived `*Keys`/`titleKey` are dropped on purpose — the catalog server
 * recomputes them on write (#12 D2). `coverWidth` is a merge-only hint.
 */
export function toBookCreateInput(candidate: Candidate): BookCreateInput {
  return {
    title: candidate.title,
    subtitle: candidate.subtitle,
    authors: candidate.authors,
    publisher: candidate.publisher,
    publishedYear: candidate.publishedYear,
    isbn13: candidate.isbn13,
    isbn10: candidate.isbn10,
    categories: candidate.categories,
    coverUrl: candidate.coverUrl,
    pageCount: candidate.pageCount,
    language: candidate.language,
    description: candidate.description,
    source: candidate.source,
  };
}
