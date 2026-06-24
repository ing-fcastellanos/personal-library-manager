import { z } from "zod";

/**
 * Book/Edition domain entity (ADR-0007, data-model #5).
 *
 * One `book` document is a canonical **edition** (≈ one ISBN), keyed by a Firestore
 * auto-id — ISBNs are indexed fields, not the document key, so books without an ISBN
 * are still representable (Decision B). `authors`/`categories` hold display strings;
 * `authorKeys`/`categoryKeys`/`titleKey` hold normalized slugs for filtering,
 * grouping ("unique authors") and prefix search — the normalization algorithm lives
 * in metadata enrichment (#13); this only fixes the field shape (Decision F).
 * `workKey` is an optional soft-grouping slug for editions of the same work (#38).
 */
export const bookSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  subtitle: z.string().nullish(),
  authors: z.array(z.string()).default([]),
  authorKeys: z.array(z.string()).default([]),
  publisher: z.string().nullish(),
  publishedYear: z.number().int().nullish(),
  isbn13: z.string().nullish(),
  isbn10: z.string().nullish(),
  categories: z.array(z.string()).default([]),
  categoryKeys: z.array(z.string()).default([]),
  coverUrl: z.string().nullish(),
  pageCount: z.number().int().nullish(),
  language: z.string().nullish(),
  description: z.string().nullish(),
  /** Soft-grouping slug for editions/translations of the same work (#38). */
  workKey: z.string().nullish(),
  /** Lowercased title key for prefix search (Firestore has no full-text, #17). */
  titleKey: z.string().nullish(),
  /** Where the metadata came from: 'google-books' | 'open-library' | 'manual' | 'ai'. */
  source: z.string().nullish(),
  /**
   * Whether the current cover came from metadata enrichment or was uploaded by a
   * reader (#15). A `"user"` cover is preserved by re-enrichment.
   */
  coverSource: z.enum(["metadata", "user"]).nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Book = z.infer<typeof bookSchema>;

/**
 * Fields accepted when creating a book. The server manages id/timestamps and the
 * derived `*Keys`/`titleKey` slugs (#12/#13).
 */
export const bookCreateSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().nullish(),
  authors: z.array(z.string()).optional(),
  publisher: z.string().nullish(),
  publishedYear: z.number().int().nullish(),
  isbn13: z.string().nullish(),
  isbn10: z.string().nullish(),
  categories: z.array(z.string()).optional(),
  coverUrl: z.string().nullish(),
  pageCount: z.number().int().nullish(),
  language: z.string().nullish(),
  description: z.string().nullish(),
  workKey: z.string().nullish(),
  source: z.string().nullish(),
  coverSource: z.enum(["metadata", "user"]).nullish(),
});
export type BookCreateInput = z.infer<typeof bookCreateSchema>;

/** Fields accepted when updating a book. */
export const bookUpdateSchema = bookCreateSchema.partial();
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
