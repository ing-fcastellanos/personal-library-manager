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
 * Endpoint tests for the books API's audit coverage (#40). Repositories and auth
 * are mocked so these exercise routing and `recordChange` calls without an
 * emulator (node lane) — `services/audit/diff` runs for real (pure).
 */
const listBooks = vi.fn();
const getBook = vi.fn();
const createBook = vi.fn();
const updateBook = vi.fn();
const deleteBook = vi.fn();
const bookHasCopies = vi.fn();
const bookHasEvents = vi.fn();
const unlinkWishlistItemsByBook = vi.fn();
const recordChange = vi.fn();
let authed = true;

vi.mock("../../services/books/repository", () => ({
  listBooks: (...a: unknown[]) => listBooks(...a),
  getBook: (...a: unknown[]) => getBook(...a),
  createBook: (...a: unknown[]) => createBook(...a),
  updateBook: (...a: unknown[]) => updateBook(...a),
  deleteBook: (...a: unknown[]) => deleteBook(...a),
}));
vi.mock("../../services/copies/repository", () => ({
  bookHasCopies: (...a: unknown[]) => bookHasCopies(...a),
}));
vi.mock("../../services/reading-events/repository", () => ({
  bookHasEvents: (...a: unknown[]) => bookHasEvents(...a),
}));
vi.mock("../../services/wishlist/repository", () => ({
  unlinkWishlistItemsByBook: (...a: unknown[]) =>
    unlinkWishlistItemsByBook(...a),
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
  const booksRouter = (await import("./books")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", booksRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  vi.clearAllMocks();
  bookHasCopies.mockResolvedValue(false);
  bookHasEvents.mockResolvedValue(false);
});

function post(body: unknown) {
  return fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patch(id: string, body: unknown) {
  return fetch(`${baseUrl}/api/books/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function del(id: string) {
  return fetch(`${baseUrl}/api/books/${id}`, { method: "DELETE" });
}

describe("books API audit logging (#40)", () => {
  it("logs a create", async () => {
    createBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    const res = await post({ title: "Rayuela" });
    expect(res.status).toBe(201);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "book",
        entityId: "b1",
        entityLabel: "Rayuela",
      }),
    );
  });

  it("logs an update with the changed field names", async () => {
    getBook.mockResolvedValueOnce({
      id: "b1",
      title: "Rayuela",
      publisher: "A",
    });
    updateBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    const res = await patch("b1", { publisher: "B" });
    expect(res.status).toBe(200);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "book",
        entityId: "b1",
        entityLabel: "Rayuela",
        changedFields: ["publisher"],
      }),
    );
  });

  it("does not log a no-op update (same value resent)", async () => {
    getBook.mockResolvedValueOnce({
      id: "b1",
      title: "Rayuela",
      publisher: "A",
    });
    updateBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    const res = await patch("b1", { publisher: "A" });
    expect(res.status).toBe(200);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ changedFields: [] }),
    );
  });

  it("logs a delete", async () => {
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    deleteBook.mockResolvedValueOnce(true);
    const res = await del("b1");
    expect(res.status).toBe(204);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        entityType: "book",
        entityId: "b1",
        entityLabel: "Rayuela",
      }),
    );
  });

  it("does not log or call the service when blocked by copies/events (409)", async () => {
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    bookHasCopies.mockResolvedValueOnce(true);
    const res = await del("b1");
    expect(res.status).toBe(409);
    expect(deleteBook).not.toHaveBeenCalled();
    expect(recordChange).not.toHaveBeenCalled();
  });

  it("rejects writes without a session (401)", async () => {
    authed = false;
    expect((await post({ title: "X" })).status).toBe(401);
    expect(createBook).not.toHaveBeenCalled();
  });
});
