import { z } from "zod";

/**
 * Loan domain entity (#39, add-loans design). One loan of a physical `copy` to an
 * **outside borrower** (not a household `reader`). Lives in its own top-level
 * collection so it keeps history (design D1); a copy is "on loan" iff it has a loan
 * with no `returnedAt` (derived, no stored flag — data-model Decision D). The
 * borrower is free text plus a normalized `borrowerKey` (derived server-side) that
 * groups a person's loans and dedupes the autocomplete (design D2). It carries a
 * denormalized book snapshot so loan lists render without a `copy → book` join
 * (Decision C).
 */
export const loanSchema = z.object({
  id: z.string(),
  copyId: z.string().min(1),
  borrowerName: z.string().min(1),
  borrowerKey: z.string(),
  loanedAt: z.string(),
  dueDate: z.string().nullish(),
  /** Absence denotes an **open** loan — the copy is currently out (design D3). */
  returnedAt: z.string().nullish(),
  notes: z.string().nullish(),
  // --- Denormalized book snapshot at lend time (design D4) ---
  bookId: z.string().nullish(),
  bookTitle: z.string().min(1),
  bookAuthors: z.array(z.string()).default([]),
  coverUrl: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Loan = z.infer<typeof loanSchema>;

/**
 * Fields accepted when lending. The server validates the copy, enforces the
 * one-open-loan invariant, derives `borrowerKey` + the book snapshot, and manages
 * id/timestamps. A new loan is always open (no `returnedAt`).
 */
export const loanCreateSchema = z.object({
  copyId: z.string().min(1),
  borrowerName: z.string().min(1),
  loanedAt: z.string().min(1),
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
});
export type LoanCreateInput = z.infer<typeof loanCreateSchema>;

/** Fields accepted when marking a loan returned. */
export const loanReturnSchema = z.object({
  returnedAt: z.string().min(1),
});
export type LoanReturnInput = z.infer<typeof loanReturnSchema>;
