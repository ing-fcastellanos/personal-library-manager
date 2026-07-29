import { slugify } from "../../lib/text/slug";
import type { Loan, LoanCreateInput } from "../../lib/types/loan";
import { getCopy } from "../copies/repository";
import { getBook } from "../books/repository";
import {
  createLoan as insertLoan,
  openLoanForCopy,
  getLoan,
  updateLoan,
} from "./repository";

/**
 * Thrown when a loan references a `copyId` that does not exist. Routes map this to
 * a 400 (mirrors the reading-events / wishlist services).
 */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly field: "copyId") {
    super(`referenced ${field} does not exist`);
    this.name = "ReferenceNotFoundError";
  }
}

/** Thrown when lending a copy that already has an open loan (design D3 invariant). */
export class CopyAlreadyOnLoanError extends Error {
  constructor(public readonly openLoan: Loan) {
    super(`copy ${openLoan.copyId} is already on loan`);
    this.name = "CopyAlreadyOnLoanError";
  }
}

function borrowerKeyFor(name: string): string {
  return slugify(name) || name.trim().toLowerCase();
}

/**
 * Lends a copy: validates the copy exists and is not already out (one open loan per
 * copy), derives the `borrowerKey` and the book snapshot from `copy → book`, then
 * inserts an open loan (no `returnedAt`).
 */
export async function createLoan(input: LoanCreateInput): Promise<Loan> {
  const copy = await getCopy(input.copyId);
  if (!copy) throw new ReferenceNotFoundError("copyId");

  const open = await openLoanForCopy(input.copyId);
  if (open) throw new CopyAlreadyOnLoanError(open);

  const book = copy.bookId ? await getBook(copy.bookId) : null;
  return insertLoan({
    copyId: input.copyId,
    borrowerName: input.borrowerName,
    borrowerKey: borrowerKeyFor(input.borrowerName),
    loanedAt: input.loanedAt,
    dueDate: input.dueDate ?? null,
    returnedAt: null,
    notes: input.notes ?? null,
    bookId: copy.bookId ?? null,
    bookTitle: book?.title ?? "Sin título",
    bookAuthors: book?.authors ?? [],
    coverUrl: book?.coverUrl ?? null,
  });
}

/** Marks a loan returned by recording the return date. Returns null if not found. */
export async function returnLoan(
  loanId: string,
  returnedAt: string,
): Promise<Loan | null> {
  if (!(await getLoan(loanId))) return null;
  return updateLoan(loanId, { returnedAt });
}
