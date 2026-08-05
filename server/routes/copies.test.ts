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
 * Endpoint tests for the copies API's audit coverage (#40). Repositories and auth
 * are mocked so these exercise routing and `recordChange` calls without an
 * emulator (node lane) — `services/audit/diff` runs for real (pure).
 */
const listCopies = vi.fn();
const getCopy = vi.fn();
const updateCopy = vi.fn();
const deleteCopy = vi.fn();
const listCopiesByBook = vi.fn();
const createCopy = vi.fn();
const copyHasLoans = vi.fn();
const getBook = vi.fn();
const recordChange = vi.fn();
let authed = true;

class ReferenceNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(field);
  }
}

vi.mock("../../services/copies/repository", () => ({
  listCopies: (...a: unknown[]) => listCopies(...a),
  getCopy: (...a: unknown[]) => getCopy(...a),
  updateCopy: (...a: unknown[]) => updateCopy(...a),
  deleteCopy: (...a: unknown[]) => deleteCopy(...a),
  listCopiesByBook: (...a: unknown[]) => listCopiesByBook(...a),
}));
vi.mock("../../services/copies/service", () => ({
  createCopy: (...a: unknown[]) => createCopy(...a),
  ReferenceNotFoundError,
}));
vi.mock("../../services/loans/repository", () => ({
  copyHasLoans: (...a: unknown[]) => copyHasLoans(...a),
}));
vi.mock("../../services/books/repository", () => ({
  getBook: (...a: unknown[]) => getBook(...a),
}));
vi.mock("../../services/audit/repository", () => ({
  recordChange: (...a: unknown[]) => recordChange(...a),
}));
vi.mock("../middleware/require-auth", () => ({
  requireAuth: (
    req: { reader?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    if (authed) {
      req.reader = { id: "r1" };
      return next();
    }
    res.status(401).json({ error: "unauthenticated" });
  },
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const copiesRouter = (await import("./copies")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", copiesRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  vi.clearAllMocks();
  copyHasLoans.mockResolvedValue(false);
});

function post(body: unknown) {
  return fetch(`${baseUrl}/api/copies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patch(id: string, body: unknown) {
  return fetch(`${baseUrl}/api/copies/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function del(id: string) {
  return fetch(`${baseUrl}/api/copies/${id}`, { method: "DELETE" });
}

describe("copies API audit logging (#40)", () => {
  it("logs a create with the owning book's title in the label", async () => {
    createCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1" });
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    const res = await post({ bookId: "b1" });
    expect(res.status).toBe(201);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "copy",
        entityId: "c1",
        entityLabel: "Rayuela · ejemplar",
      }),
    );
  });

  it("falls back to a generic label when the book can't be found", async () => {
    createCopy.mockResolvedValueOnce({ id: "c1", bookId: "gone" });
    getBook.mockResolvedValueOnce(null);
    await post({ bookId: "gone" });
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ entityLabel: "Ejemplar" }),
    );
  });

  it("logs an update with the changed field names", async () => {
    getCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1", condition: "A" });
    updateCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1" });
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    const res = await patch("c1", { condition: "B" });
    expect(res.status).toBe(200);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "copy",
        entityId: "c1",
        entityLabel: "Rayuela · ejemplar",
        changedFields: ["condition"],
      }),
    );
  });

  it("does not log a no-op update", async () => {
    getCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1", condition: "A" });
    updateCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1" });
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    await patch("c1", { condition: "A" });
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ changedFields: [] }),
    );
  });

  it("logs a delete", async () => {
    getCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1" });
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    deleteCopy.mockResolvedValueOnce(true);
    const res = await del("c1");
    expect(res.status).toBe(204);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        entityType: "copy",
        entityId: "c1",
        entityLabel: "Rayuela · ejemplar",
      }),
    );
  });

  it("does not log when blocked by an existing loan (409)", async () => {
    getCopy.mockResolvedValueOnce({ id: "c1", bookId: "b1" });
    copyHasLoans.mockResolvedValueOnce(true);
    const res = await del("c1");
    expect(res.status).toBe(409);
    expect(deleteCopy).not.toHaveBeenCalled();
    expect(recordChange).not.toHaveBeenCalled();
  });

  it("rejects writes without a session (401)", async () => {
    authed = false;
    expect((await post({ bookId: "b1" })).status).toBe(401);
    expect(createCopy).not.toHaveBeenCalled();
  });
});
