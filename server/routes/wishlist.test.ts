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
 * Endpoint tests for the wishlist API (#37). The service/repository and the auth
 * middleware are mocked so these exercise routing, validation, and the auth gate
 * without an emulator (node lane).
 */

const listWishlistItems = vi.fn();
const listWishlistItemsByReader = vi.fn();
const createWishlistItem = vi.fn();
const acquireWishlistItem = vi.fn();
let authed = true;

class ReferenceNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(field);
    this.name = "ReferenceNotFoundError";
  }
}

vi.mock("../../services/wishlist/repository", () => ({
  listWishlistItems: (...a: unknown[]) => listWishlistItems(...a),
  listWishlistItemsByReader: (...a: unknown[]) =>
    listWishlistItemsByReader(...a),
  getWishlistItem: vi.fn(),
  updateWishlistItem: vi.fn(),
  deleteWishlistItem: vi.fn(),
}));

vi.mock("../../services/wishlist/service", () => ({
  createWishlistItem: (...a: unknown[]) => createWishlistItem(...a),
  acquireWishlistItem: (...a: unknown[]) => acquireWishlistItem(...a),
  ReferenceNotFoundError,
  WishlistItemNotFoundError: class extends Error {},
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
  const wishlistRouter = (await import("./wishlist")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", wishlistRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  vi.clearAllMocks();
});

describe("wishlist API", () => {
  it("serves the list read without a session", async () => {
    authed = false;
    listWishlistItems.mockResolvedValueOnce([{ id: "w1" }]);
    const res = await fetch(`${baseUrl}/api/wishlist-items`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "w1" }]);
  });

  it("serves the per-reader read", async () => {
    listWishlistItemsByReader.mockResolvedValueOnce([{ id: "w1" }]);
    const res = await fetch(`${baseUrl}/api/readers/r1/wishlist-items`);
    expect(res.status).toBe(200);
    expect(listWishlistItemsByReader).toHaveBeenCalledWith("r1");
  });

  it("rejects a create without a session (401)", async () => {
    authed = false;
    const res = await fetch(`${baseUrl}/api/wishlist-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        readerId: "r1",
        addedVia: "manual",
        bookTitle: "T",
      }),
    });
    expect(res.status).toBe(401);
    expect(createWishlistItem).not.toHaveBeenCalled();
  });

  it("rejects an invalid create body (400)", async () => {
    const res = await fetch(`${baseUrl}/api/wishlist-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ readerId: "", addedVia: "manual", bookTitle: "" }),
    });
    expect(res.status).toBe(400);
    expect(createWishlistItem).not.toHaveBeenCalled();
  });

  it("maps an unknown readerId to 400", async () => {
    createWishlistItem.mockRejectedValueOnce(
      new ReferenceNotFoundError("readerId"),
    );
    const res = await fetch(`${baseUrl}/api/wishlist-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        readerId: "nope",
        addedVia: "manual",
        bookTitle: "T",
      }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unknown readerId" });
  });

  it("creates a valid item (201)", async () => {
    createWishlistItem.mockResolvedValueOnce({ id: "w1", status: "wanted" });
    const res = await fetch(`${baseUrl}/api/wishlist-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        readerId: "r1",
        addedVia: "manual",
        bookTitle: "T",
      }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("w1");
  });

  it("returns the created book/copy on acquire (201)", async () => {
    acquireWishlistItem.mockResolvedValueOnce({
      item: { id: "w1", bookId: "b1" },
      book: { id: "b1" },
      copy: { id: "c1", bookId: "b1" },
    });
    const res = await fetch(`${baseUrl}/api/wishlist-items/w1/acquire`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ condition: "good" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.book.id).toBe("b1");
    expect(body.copy.bookId).toBe("b1");
  });

  it("rejects acquire without a session (401)", async () => {
    authed = false;
    const res = await fetch(`${baseUrl}/api/wishlist-items/w1/acquire`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
    expect(acquireWishlistItem).not.toHaveBeenCalled();
  });
});
