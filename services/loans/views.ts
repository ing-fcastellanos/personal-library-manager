import type { Loan } from "../../lib/types/loan";
import type { Copy } from "../../lib/types/copy";

/**
 * Derived loan views (#39, design D5). Pure in-memory computations over the loans —
 * on-loan and overdue state are never stored. Reused server- and client-side, the
 * same approach `services/catalog` takes.
 */

/** A loan is open (its copy is out) when it has no return date. */
export function isOpen(loan: Loan): boolean {
  return !loan.returnedAt;
}

/** Whether a copy is currently on loan. */
export function isCopyLoaned(copyId: string, loans: readonly Loan[]): boolean {
  return loans.some((l) => l.copyId === copyId && isOpen(l));
}

/** Every currently-open loan (a book that is out). */
export function openLoans(loans: readonly Loan[]): Loan[] {
  return loans.filter(isOpen);
}

/**
 * A loan is overdue when it has a due date in the past and is not returned. `today`
 * is an ISO date/time string; comparison is lexicographic (ISO sorts as dates).
 */
export function isOverdue(loan: Loan, today: string): boolean {
  return isOpen(loan) && !!loan.dueDate && loan.dueDate < today;
}

/** One borrower and the books they currently hold. */
export interface BorrowerGroup {
  borrowerKey: string;
  borrowerName: string;
  loans: Loan[];
}

/**
 * Open loans grouped by borrower (normalized key), most-recently-lent first within a
 * group and groups ordered by their most recent loan — for the "currently out" view.
 */
export function loansByBorrower(loans: readonly Loan[]): BorrowerGroup[] {
  const groups = new Map<string, BorrowerGroup>();
  for (const loan of openLoans(loans)) {
    let group = groups.get(loan.borrowerKey);
    if (!group) {
      group = {
        borrowerKey: loan.borrowerKey,
        borrowerName: loan.borrowerName,
        loans: [],
      };
      groups.set(loan.borrowerKey, group);
    }
    group.loans.push(loan);
  }
  for (const group of groups.values()) {
    group.loans.sort((a, b) => b.loanedAt.localeCompare(a.loanedAt));
  }
  return [...groups.values()].sort((a, b) =>
    b.loans[0].loanedAt.localeCompare(a.loans[0].loanedAt),
  );
}

/** Per-book loan state for the catalog browse badge. */
export interface BookLoanState {
  copyCount: number;
  loanedCount: number;
  overdue: boolean;
}

/**
 * How many of a book's copies are out (design D8): `loanedCount` of `copyCount`, and
 * whether any open loan for the book is overdue. Pass `today` (ISO) to compute overdue.
 */
export function loanStateForBook(
  bookId: string,
  copies: readonly Copy[],
  loans: readonly Loan[],
  today?: string,
): BookLoanState {
  const bookCopyIds = new Set(
    copies.filter((c) => c.bookId === bookId).map((c) => c.id),
  );
  const bookLoans = loans.filter((l) => bookCopyIds.has(l.copyId));
  const loanedCopyIds = new Set(bookLoans.filter(isOpen).map((l) => l.copyId));
  const overdue = today ? bookLoans.some((l) => isOverdue(l, today)) : false;
  return {
    copyCount: bookCopyIds.size,
    loanedCount: loanedCopyIds.size,
    overdue,
  };
}
