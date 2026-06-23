import { z } from "zod";

/**
 * Copy domain entity (ADR-0007, data-model #5).
 *
 * A `copy` is a **physical owned ejemplar**: N copies → 1 book. It references its
 * `bookId` (required) and an optional `shelfId` (an unshelved copy is valid). It
 * carries no per-reader read status — read state lives only in `readingEvents`
 * (Decision D). `condition` is an open string for now (enum deferred to #12/#15).
 */
export const copySchema = z.object({
  id: z.string(),
  bookId: z.string().min(1),
  shelfId: z.string().nullish(),
  condition: z.string().nullish(),
  acquiredAt: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Copy = z.infer<typeof copySchema>;

/** Fields accepted when creating a copy (server manages id/timestamps). */
export const copyCreateSchema = z.object({
  bookId: z.string().min(1),
  shelfId: z.string().nullish(),
  condition: z.string().nullish(),
  acquiredAt: z.string().nullish(),
  notes: z.string().nullish(),
});
export type CopyCreateInput = z.infer<typeof copyCreateSchema>;

/** Fields accepted when updating a copy. */
export const copyUpdateSchema = copyCreateSchema.partial();
export type CopyUpdateInput = z.infer<typeof copyUpdateSchema>;
