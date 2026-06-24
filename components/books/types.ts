export type SearchMode = "isbn" | "title";

/** Book-level metadata (from /api/enrich, all editable). */
export interface BookData {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  year?: string;
  isbn13?: string;
  isbn10?: string;
  categories: string[];
  language?: string;
  pages?: string;
  description?: string;
  /** Preview cover from metadata — not user-uploadable. */
  coverUrl?: string;
}

/** Copy-level (ejemplar) fields. */
export interface CopyData {
  shelfId?: string;
  condition?: string;
  acquiredAt?: string;
  notes?: string;
}

/** A ranked candidate when searching by title/author. */
export interface BookCandidate {
  id: string;
  title: string;
  authors: string[];
  year?: string;
  coverUrl?: string;
}

/** An existing library book, returned by the duplicate check. */
export interface ExistingBook {
  id: string;
  title: string;
  authors: string[];
  year?: string;
  coverUrl?: string;
  copies: number;
}

export interface Shelf {
  id: string;
  name: string;
}

export const CONDITIONS = [
  "Nuevo",
  "Bueno",
  "Aceptable",
  "Desgastado",
] as const;
export const LANGUAGES = [
  "Español",
  "Inglés",
  "Portugués",
  "Francés",
  "Otro",
] as const;

export const emptyBook: BookData = {
  title: "",
  authors: [],
  categories: [],
  language: "Español",
};
