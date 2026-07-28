import { z } from "zod";

/** Lifecycle of a wishlist item. "acquired" and "read" are derived, not stored (design D9). */
export const wishlistStatusSchema = z.enum(["wanted", "dismissed"]);
export type WishlistStatus = z.infer<typeof wishlistStatusSchema>;

/** Relative importance a reader assigns to a wish; orders both views (design D8). */
export const wishlistPrioritySchema = z.enum(["high", "normal", "low"]);
export type WishlistPriority = z.infer<typeof wishlistPrioritySchema>;

/** Which entry point created the wish — distinct from `book.source` metadata provenance (design D7). */
export const wishlistAddedViaSchema = z.enum([
  "manual",
  "isbn",
  "ai",
  "catalog",
]);
export type WishlistAddedVia = z.infer<typeof wishlistAddedViaSchema>;

/**
 * WishlistItem domain entity (#37, add-wishlist design). A per-reader record of a
 * book someone wants, kept in its own top-level collection so it never pollutes the
 * catalog (design D1). `readerId` is required; `bookId` is **optional** because a
 * wish may predate any catalogued edition (design D2). It carries a denormalized
 * book **snapshot** (`bookTitle`, `bookAuthors`, `isbn13`, `coverUrl`) so both
 * wishlist views render without a join, plus normalized `titleKey`/`authorKeys` so
 * an item with no `bookId` is still matchable and groupable (design D6). It stores
 * no acquired/read flag — ownership is derived from copies and reading status from
 * reading events (design D3/D4), consistent with data-model Decision D.
 */
export const wishlistItemSchema = z.object({
  id: z.string(),
  readerId: z.string().min(1),
  bookId: z.string().nullish(),
  status: wishlistStatusSchema.default("wanted"),
  priority: wishlistPrioritySchema.default("normal"),
  addedVia: wishlistAddedViaSchema,
  // --- Denormalized snapshot of the wanted book (design D2) ---
  bookTitle: z.string().min(1),
  bookAuthors: z.array(z.string()).default([]),
  isbn13: z.string().nullish(),
  coverUrl: z.string().nullish(),
  // --- Normalized match keys, derived server-side (design D6) ---
  titleKey: z.string().nullish(),
  authorKeys: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;

/**
 * Fields accepted when creating a wishlist item. The client supplies the book
 * snapshot (needed for the no-`bookId` case); the server derives `titleKey`/
 * `authorKeys` and manages id/timestamps.
 */
export const wishlistItemCreateSchema = z.object({
  readerId: z.string().min(1),
  bookId: z.string().nullish(),
  // Optional on input; the service applies the "wanted"/"normal" defaults.
  status: wishlistStatusSchema.optional(),
  priority: wishlistPrioritySchema.optional(),
  addedVia: wishlistAddedViaSchema,
  bookTitle: z.string().min(1),
  bookAuthors: z.array(z.string()).optional(),
  isbn13: z.string().nullish(),
  coverUrl: z.string().nullish(),
});
export type WishlistItemCreateInput = z.infer<typeof wishlistItemCreateSchema>;

/** Fields accepted when updating a wishlist item (re-prioritize or dismiss). */
export const wishlistItemUpdateSchema = z.object({
  status: wishlistStatusSchema.optional(),
  priority: wishlistPrioritySchema.optional(),
});
export type WishlistItemUpdateInput = z.infer<typeof wishlistItemUpdateSchema>;
