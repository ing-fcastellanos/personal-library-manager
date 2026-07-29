import { describe, it, expect } from "vitest";
import { loanSchema } from "./loan";

const base = {
  id: "l1",
  copyId: "c1",
  borrowerName: "Juan",
  borrowerKey: "juan",
  loanedAt: "2026-07-29T00:00:00.000Z",
  bookTitle: "Rayuela",
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("loanSchema", () => {
  it("accepts a valid open loan", () => {
    const parsed = loanSchema.parse(base);
    expect(parsed.copyId).toBe("c1");
    expect(parsed.returnedAt ?? null).toBeNull();
    expect(parsed.bookAuthors).toEqual([]);
  });

  it("rejects a missing copyId", () => {
    expect(() => loanSchema.parse({ ...base, copyId: "" })).toThrow();
  });

  it("accepts a loan with no returnedAt (open) and a returned one", () => {
    expect(loanSchema.parse(base).returnedAt ?? null).toBeNull();
    const returned = loanSchema.parse({
      ...base,
      returnedAt: "2026-08-01T00:00:00.000Z",
    });
    expect(returned.returnedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("has no readerId and no stored on-loan flag", () => {
    const parsed = loanSchema.parse({ ...base, readerId: "r1", onLoan: true });
    expect(parsed).not.toHaveProperty("readerId");
    expect(parsed).not.toHaveProperty("onLoan");
  });
});
