import { describe, it, expect } from "vitest";
import {
  isCopyLoaned,
  openLoans,
  isOverdue,
  loansByBorrower,
  loanStateForBook,
} from "./views";
import type { Loan } from "../../lib/types/loan";
import type { Copy } from "../../lib/types/copy";

function loan(o: Partial<Loan>): Loan {
  return {
    id: "l",
    copyId: "c1",
    borrowerName: "Juan",
    borrowerKey: "juan",
    loanedAt: "2026-07-01T00:00:00.000Z",
    dueDate: null,
    returnedAt: null,
    notes: null,
    bookId: "b1",
    bookTitle: "Rayuela",
    bookAuthors: [],
    coverUrl: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...o,
  };
}

function copy(o: Partial<Copy>): Copy {
  return {
    id: "c1",
    bookId: "b1",
    shelfId: null,
    condition: null,
    acquiredAt: null,
    notes: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...o,
  };
}

describe("isCopyLoaned / openLoans", () => {
  it("is on loan with an open loan, not once returned", () => {
    expect(isCopyLoaned("c1", [loan({})])).toBe(true);
    expect(
      isCopyLoaned("c1", [loan({ returnedAt: "2026-07-10T00:00:00.000Z" })]),
    ).toBe(false);
    expect(
      openLoans([loan({}), loan({ id: "l2", returnedAt: "x" })]),
    ).toHaveLength(1);
  });
});

describe("isOverdue", () => {
  const today = "2026-07-29T00:00:00.000Z";
  it("is overdue only when a due date has passed and it is not returned", () => {
    expect(
      isOverdue(loan({ dueDate: "2026-07-01T00:00:00.000Z" }), today),
    ).toBe(true);
    expect(
      isOverdue(loan({ dueDate: "2026-08-15T00:00:00.000Z" }), today),
    ).toBe(false);
    expect(isOverdue(loan({ dueDate: null }), today)).toBe(false);
    expect(
      isOverdue(
        loan({
          dueDate: "2026-07-01T00:00:00.000Z",
          returnedAt: "2026-07-05T00:00:00.000Z",
        }),
        today,
      ),
    ).toBe(false);
  });
});

describe("loansByBorrower", () => {
  it("groups open loans by borrower key", () => {
    const groups = loansByBorrower([
      loan({ id: "l1", borrowerKey: "juan", borrowerName: "Juan" }),
      loan({
        id: "l2",
        borrowerKey: "juan",
        borrowerName: "Juan",
        copyId: "c2",
      }),
      loan({ id: "l3", borrowerKey: "ana", borrowerName: "Ana", copyId: "c3" }),
      loan({ id: "l4", borrowerKey: "sol", returnedAt: "x", copyId: "c4" }),
    ]);
    const juan = groups.find((g) => g.borrowerKey === "juan");
    expect(juan?.loans).toHaveLength(2);
    expect(groups.map((g) => g.borrowerKey)).not.toContain("sol"); // returned
  });
});

describe("loanStateForBook", () => {
  it("counts loaned copies of a book and flags overdue", () => {
    const copies = [
      copy({ id: "c1" }),
      copy({ id: "c2" }),
      copy({ id: "cOther", bookId: "b2" }),
    ];
    const loans = [
      loan({ id: "l1", copyId: "c1", dueDate: "2026-07-01T00:00:00.000Z" }),
    ];
    const state = loanStateForBook(
      "b1",
      copies,
      loans,
      "2026-07-29T00:00:00.000Z",
    );
    expect(state.copyCount).toBe(2);
    expect(state.loanedCount).toBe(1);
    expect(state.overdue).toBe(true);
  });

  it("reports no loans when all copies are in", () => {
    const state = loanStateForBook("b1", [copy({ id: "c1" })], []);
    expect(state).toEqual({ copyCount: 1, loanedCount: 0, overdue: false });
  });
});
