import { describe, it, expect } from "vitest";
import {
  createLoan,
  returnLoan,
  ReferenceNotFoundError,
  CopyAlreadyOnLoanError,
} from "./service";
import { openLoanForCopy } from "./repository";
import { createBook } from "../books/repository";
import { createCopy } from "../copies/repository";

/**
 * Emulator-backed tests for the loans service (#39): copy validation, borrowerKey +
 * snapshot derivation, the one-open-loan invariant, and return.
 */
describe("loans service (emulator)", () => {
  async function seedCopy() {
    const book = await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      coverUrl: "https://example.test/cover.jpg",
    });
    const copy = await createCopy({ bookId: book.id });
    return { book, copy };
  }

  it("validates the copy, derives the borrower key and the book snapshot", async () => {
    const { book, copy } = await seedCopy();
    const loan = await createLoan({
      copyId: copy.id,
      borrowerName: "Juan Pérez",
      loanedAt: "2026-07-29T00:00:00.000Z",
    });
    expect(loan.borrowerKey).toBe("juan-perez");
    expect(loan.bookId).toBe(book.id);
    expect(loan.bookTitle).toBe("Cien Años de Soledad");
    expect(loan.coverUrl).toBe("https://example.test/cover.jpg");
    expect(loan.returnedAt ?? null).toBeNull();
  });

  it("rejects an unknown copy", async () => {
    await expect(
      createLoan({
        copyId: "nope",
        borrowerName: "X",
        loanedAt: "2026-07-29T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ReferenceNotFoundError);
  });

  it("rejects lending a copy that is already out, and allows it again after return", async () => {
    const { copy } = await seedCopy();
    const first = await createLoan({
      copyId: copy.id,
      borrowerName: "Ana",
      loanedAt: "2026-07-01T00:00:00.000Z",
    });
    await expect(
      createLoan({
        copyId: copy.id,
        borrowerName: "Otro",
        loanedAt: "2026-07-05T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(CopyAlreadyOnLoanError);

    await returnLoan(first.id, "2026-07-10T00:00:00.000Z");
    expect(await openLoanForCopy(copy.id)).toBeNull();

    // Now it can be lent again.
    const second = await createLoan({
      copyId: copy.id,
      borrowerName: "Sol",
      loanedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(second.id).not.toBe(first.id);
    expect((await openLoanForCopy(copy.id))?.id).toBe(second.id);
  });
});
