import { describe, it, expect } from "vitest";
import {
  createLoan,
  getLoan,
  listLoans,
  updateLoan,
  deleteLoan,
  listLoansByCopy,
  listLoansByBorrowerKey,
  openLoanForCopy,
  copyHasLoans,
  distinctBorrowerNames,
  type LoanData,
} from "./repository";

/**
 * Emulator-backed tests for the loans repository (#39): CRUD, relationship reads,
 * the open-loan lookup, the copy-delete guard, and the autocomplete source.
 */
describe("loans repository (emulator)", () => {
  function data(o: Partial<LoanData>): LoanData {
    return {
      copyId: "c1",
      borrowerName: "Juan Pérez",
      borrowerKey: "juan-perez",
      loanedAt: "2026-07-01T00:00:00.000Z",
      dueDate: null,
      returnedAt: null,
      notes: null,
      bookId: "b1",
      bookTitle: "Rayuela",
      bookAuthors: ["Julio Cortázar"],
      coverUrl: null,
      ...o,
    };
  }

  it("creates, reads, updates and deletes a loan", async () => {
    const created = await createLoan(data({}));
    expect(created.id).toBeTruthy();
    expect((await getLoan(created.id))?.borrowerName).toBe("Juan Pérez");

    const returned = await updateLoan(created.id, {
      returnedAt: "2026-07-10T00:00:00.000Z",
    });
    expect(returned?.returnedAt).toBe("2026-07-10T00:00:00.000Z");

    expect(await deleteLoan(created.id)).toBe(true);
    expect(await getLoan(created.id)).toBeNull();
  });

  it("serves relationship reads and the open-loan lookup", async () => {
    await createLoan(
      data({ copyId: "cx", borrowerKey: "ana", borrowerName: "Ana" }),
    );
    expect(await listLoansByCopy("cx")).toHaveLength(1);
    expect(await listLoansByBorrowerKey("ana")).toHaveLength(1);
    expect((await openLoanForCopy("cx"))?.copyId).toBe("cx");
    expect(await copyHasLoans("cx")).toBe(true);
    expect((await listLoans()).length).toBeGreaterThanOrEqual(1);
  });

  it("openLoanForCopy is null once every loan is returned", async () => {
    const l = await createLoan(data({ copyId: "cy" }));
    expect(await openLoanForCopy("cy")).not.toBeNull();
    await updateLoan(l.id, { returnedAt: "2026-07-10T00:00:00.000Z" });
    expect(await openLoanForCopy("cy")).toBeNull();
    // ...but the returned loan is still history → still guards deletion.
    expect(await copyHasLoans("cy")).toBe(true);
  });

  it("distinctBorrowerNames dedupes by key", async () => {
    await createLoan(
      data({ copyId: "cz1", borrowerKey: "sol", borrowerName: "Sol" }),
    );
    await createLoan(
      data({ copyId: "cz2", borrowerKey: "sol", borrowerName: "Sol" }),
    );
    const names = await distinctBorrowerNames();
    expect(names.filter((n) => n === "Sol")).toHaveLength(1);
  });
});
