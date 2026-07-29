import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Endpoint tests for the loans API (#39). The service/repository and the auth
 * middleware are mocked so these exercise routing, validation, and the auth gate
 * without an emulator (node lane).
 */
const listLoans = vi.fn();
const distinctBorrowerNames = vi.fn();
const createLoan = vi.fn();
const returnLoan = vi.fn();
const deleteLoan = vi.fn();
let authed = true;

class ReferenceNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(field);
    this.name = "ReferenceNotFoundError";
  }
}
class CopyAlreadyOnLoanError extends Error {}

vi.mock("../../services/loans/repository", () => ({
  listLoans: (...a: unknown[]) => listLoans(...a),
  getLoan: vi.fn(),
  deleteLoan: (...a: unknown[]) => deleteLoan(...a),
  listLoansByCopy: vi.fn(),
  distinctBorrowerNames: (...a: unknown[]) => distinctBorrowerNames(...a),
}));

vi.mock("../../services/loans/service", () => ({
  createLoan: (...a: unknown[]) => createLoan(...a),
  returnLoan: (...a: unknown[]) => returnLoan(...a),
  ReferenceNotFoundError,
  CopyAlreadyOnLoanError,
}));

vi.mock("../middleware/require-auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    if (authed) return next();
    res.status(401).json({ error: "unauthenticated" });
  },
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const loansRouter = (await import("./loans")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", loansRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  vi.clearAllMocks();
});

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validLend = {
  copyId: "c1",
  borrowerName: "Juan",
  loanedAt: "2026-07-29T00:00:00.000Z",
};

describe("loans API", () => {
  it("serves reads without a session", async () => {
    authed = false;
    listLoans.mockResolvedValueOnce([{ id: "l1" }]);
    distinctBorrowerNames.mockResolvedValueOnce(["Juan"]);
    expect((await fetch(`${baseUrl}/api/loans`)).status).toBe(200);
    expect(await (await fetch(`${baseUrl}/api/borrowers`)).json()).toEqual([
      "Juan",
    ]);
  });

  it("rejects lending without a session (401)", async () => {
    authed = false;
    expect((await post("/api/loans", validLend)).status).toBe(401);
    expect(createLoan).not.toHaveBeenCalled();
  });

  it("rejects an invalid lend body (400)", async () => {
    const res = await post("/api/loans", { copyId: "", borrowerName: "" });
    expect(res.status).toBe(400);
    expect(createLoan).not.toHaveBeenCalled();
  });

  it("maps an already-on-loan copy to 409", async () => {
    createLoan.mockRejectedValueOnce(new CopyAlreadyOnLoanError());
    const res = await post("/api/loans", validLend);
    expect(res.status).toBe(409);
  });

  it("maps an unknown copy to 400", async () => {
    createLoan.mockRejectedValueOnce(new ReferenceNotFoundError("copyId"));
    const res = await post("/api/loans", validLend);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unknown copyId" });
  });

  it("lends a valid copy (201)", async () => {
    createLoan.mockResolvedValueOnce({ id: "l1", copyId: "c1" });
    const res = await post("/api/loans", validLend);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("l1");
  });

  it("returns a loan (200) and 404 when missing", async () => {
    returnLoan.mockResolvedValueOnce({ id: "l1", returnedAt: "x" });
    expect(
      (
        await post("/api/loans/l1/return", {
          returnedAt: "2026-08-01T00:00:00.000Z",
        })
      ).status,
    ).toBe(200);
    returnLoan.mockResolvedValueOnce(null);
    expect(
      (
        await post("/api/loans/nope/return", {
          returnedAt: "2026-08-01T00:00:00.000Z",
        })
      ).status,
    ).toBe(404);
  });

  it("rejects return/delete without a session (401)", async () => {
    authed = false;
    expect(
      (await post("/api/loans/l1/return", { returnedAt: "x" })).status,
    ).toBe(401);
    const del = await fetch(`${baseUrl}/api/loans/l1`, { method: "DELETE" });
    expect(del.status).toBe(401);
  });
});
