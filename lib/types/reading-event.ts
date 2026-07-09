import { z } from "zod";

/** A reading event's lifecycle status. */
export const readingStatusSchema = z.enum(["finished", "reading", "abandoned"]);
export type ReadingStatus = z.infer<typeof readingStatusSchema>;

/**
 * ReadingEvent domain entity (ADR-0007, data-model #5).
 *
 * One reading of a book by a reader: N events → 1 reader and 1 book. `readerId` and
 * `bookId` are required; `copyId` is **optional** because imported readings (#35) or
 * books not physically owned have no `Copy` (Decision C). It carries a denormalized
 * **snapshot** of the book at event time (`bookTitle`, `bookAuthors`, `isbn13`,
 * `coverUrl`) so history (#26), recent-reads (#29) and CSV export (#34) never join.
 * Per-reader read/pending status is derived from these events (Decision D).
 * `publishPending` (#34) is a manual, opt-in reminder that the reader still wants to
 * publish this reading to Goodreads — never set automatically.
 */
export const readingEventSchema = z.object({
  id: z.string(),
  readerId: z.string().min(1),
  bookId: z.string().min(1),
  copyId: z.string().nullish(),
  status: readingStatusSchema,
  dateStarted: z.string().nullish(),
  dateFinished: z.string().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  review: z.string().nullish(),
  publishPending: z.boolean().default(false),
  // --- Denormalized snapshot of the book at event time (Decision C) ---
  bookTitle: z.string().min(1),
  bookAuthors: z.array(z.string()).default([]),
  isbn13: z.string().nullish(),
  coverUrl: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReadingEvent = z.infer<typeof readingEventSchema>;

/**
 * Fields accepted when creating a reading event. The server fills the book snapshot
 * (from `bookId`) and manages id/timestamps.
 */
export const readingEventCreateSchema = z.object({
  readerId: z.string().min(1),
  bookId: z.string().min(1),
  copyId: z.string().nullish(),
  status: readingStatusSchema.default("finished"),
  dateStarted: z.string().nullish(),
  dateFinished: z.string().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  review: z.string().nullish(),
});
export type ReadingEventCreateInput = z.infer<typeof readingEventCreateSchema>;

/** Fields accepted when updating a reading event (e.g. edit rating/review later). */
export const readingEventUpdateSchema = z.object({
  status: readingStatusSchema.optional(),
  dateStarted: z.string().nullish(),
  dateFinished: z.string().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  review: z.string().nullish(),
  publishPending: z.boolean().optional(),
});
export type ReadingEventUpdateInput = z.infer<typeof readingEventUpdateSchema>;
