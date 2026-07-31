import { z } from "zod";

/**
 * Series domain entity (#38, add-series-tracking design). A manually-curated,
 * ordered list of a saga's volumes. Lives in its own top-level collection; a
 * `book` carries no reference back (design D1) — membership is discovered by
 * scanning `series` for a volume whose `bookId` matches, the same in-memory join
 * `services/catalog` already uses for shelves and reading status. Distinct from
 * `book.workKey`, which groups editions of one volume rather than ordering
 * distinct volumes of a saga (design D1) — this change does not touch it.
 */
export const seriesVolumeSchema = z.object({
  position: z.number(),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  isbn13: z.string().nullish(),
  coverUrl: z.string().nullish(),
  /** Absence denotes a **missing** volume — the household doesn't have it (design D2). */
  bookId: z.string().nullish(),
});
export type SeriesVolume = z.infer<typeof seriesVolumeSchema>;

export const seriesSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  volumes: z.array(seriesVolumeSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Series = z.infer<typeof seriesSchema>;

/**
 * Fields accepted when creating a series. At least one volume — in practice the
 * book that prompted "Crear serie" — since a series with no volumes has nothing
 * to track. The server manages id/timestamps.
 */
export const seriesCreateSchema = z.object({
  name: z.string().min(1),
  volumes: z.array(seriesVolumeSchema).min(1),
});
export type SeriesCreateInput = z.infer<typeof seriesCreateSchema>;

/**
 * Fields accepted when editing a series. `volumes`, when present, replaces the
 * whole array (design D5) — rename, add/remove/reorder, and link/unlink a
 * volume's `bookId` are all expressed as "here is the new full list."
 */
export const seriesUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  volumes: z.array(seriesVolumeSchema).optional(),
});
export type SeriesUpdateInput = z.infer<typeof seriesUpdateSchema>;
