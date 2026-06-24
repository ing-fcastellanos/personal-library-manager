import type { Book } from "../../lib/types/book";
import type { ReadingStatus } from "../../lib/types/reading-event";

/**
 * Catalog search (#17). All filtering happens in memory over the household-scale
 * dataset (< 1000 books, design D1): the service loads books + copies +
 * readingEvents, joins them per book, then filters/sorts/paginates and computes
 * facets. These types are shared by the pure helpers and the service.
 */

export type CatalogSort = "title" | "year" | "author" | "addedAt";

export interface SearchParams {
  q?: string;
  /** categoryKey slug. */
  category?: string;
  /** authorKey slug. */
  author?: string;
  /** publisher display string (exact). */
  publisher?: string;
  /** shelfId. */
  shelf?: string;
  /** reading status, only applied with a reader (design D4). */
  status?: ReadingStatus;
  /** readerId the status filter is scoped to. */
  reader?: string;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}

/** A book joined with its copy-derived shelves and reader-derived statuses. */
export interface JoinedBook {
  book: Book;
  shelfIds: string[];
  /** readerId → the reading statuses that reader has for this book. */
  statusByReader: Record<string, ReadingStatus[]>;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  categories: FacetValue[];
  authors: FacetValue[];
  publishers: FacetValue[];
  shelves: FacetValue[];
}

export interface SearchResult {
  items: Book[];
  total: number;
  page: number;
  facets: Facets;
}
