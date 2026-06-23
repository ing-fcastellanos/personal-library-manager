import { z } from "zod";

/**
 * Shelf domain entity (ADR-0007, data-model #5).
 *
 * A physical location (estante/librero). `Copy.shelfId` references it. Base for the
 * shelf map (#18) and the per-shelf QR (#33).
 */
export const shelfSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  location: z.string().nullish(),
  description: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Shelf = z.infer<typeof shelfSchema>;

/** Fields accepted when creating a shelf (server manages id/timestamps). */
export const shelfCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().nullish(),
  description: z.string().nullish(),
});
export type ShelfCreateInput = z.infer<typeof shelfCreateSchema>;

/** Fields accepted when updating a shelf. */
export const shelfUpdateSchema = shelfCreateSchema.partial();
export type ShelfUpdateInput = z.infer<typeof shelfUpdateSchema>;
