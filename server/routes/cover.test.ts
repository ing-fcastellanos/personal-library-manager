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
 * Endpoint tests for `POST /api/books/:id/cover` (#15). The cover service, books
 * repository, audit, and auth middleware are mocked so these exercise routing,
 * validation, and the auth gate without an emulator (node lane).
 */

class CoverValidationError extends Error {}
const uploadCover = vi.fn();
const getBook = vi.fn();
const updateBook = vi.fn();
const recordChange = vi.fn();
const enrichByIsbn = vi.fn();
const rehostCover = vi.fn();
let authed = true;

vi.mock("../../services/covers/service", () => ({
  uploadCover: (...a: unknown[]) => uploadCover(...a),
  CoverValidationError,
}));
vi.mock("../../services/books/repository", () => ({
  getBook: (...a: unknown[]) => getBook(...a),
  updateBook: (...a: unknown[]) => updateBook(...a),
}));
vi.mock("../../services/audit/repository", () => ({
  recordChange: (...a: unknown[]) => recordChange(...a),
}));
vi.mock("../../services/enrichment/service", () => ({
  enrichByIsbn: (...a: unknown[]) => enrichByIsbn(...a),
}));
vi.mock("../../services/enrichment/cover", () => ({
  rehostCover: (...a: unknown[]) => rehostCover(...a),
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
  const coverRouter = (await import("./cover")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", coverRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  uploadCover.mockReset();
  getBook.mockReset();
  updateBook.mockReset();
  recordChange.mockReset();
  enrichByIsbn.mockReset();
  rehostCover.mockReset();
});

async function post(id: string, body: unknown) {
  return fetch(`${baseUrl}/api/books/${id}/cover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postFromSource(id: string) {
  return fetch(`${baseUrl}/api/books/${id}/cover/from-source`, {
    method: "POST",
  });
}

const validBody = { imageBase64: "Zm9v", contentType: "image/png" };

describe("POST /api/books/:id/cover", () => {
  it("uploads and returns the new coverUrl (200)", async () => {
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    uploadCover.mockResolvedValueOnce("https://storage/covers/b1.png");
    updateBook.mockResolvedValueOnce({ id: "b1" });
    const res = await post("b1", validBody);
    expect(res.status).toBe(200);
    expect((await res.json()).coverUrl).toBe("https://storage/covers/b1.png");
    expect(updateBook).toHaveBeenCalledWith("b1", {
      coverUrl: "https://storage/covers/b1.png",
      coverSource: "user",
    });
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "book",
        entityId: "b1",
        entityLabel: "Rayuela",
        changedFields: ["coverUrl", "coverSource"],
      }),
    );
  });

  it("marks the cover ai-photo when the caller says so (#20)", async () => {
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela" });
    uploadCover.mockResolvedValueOnce("https://storage/covers/b1.png");
    updateBook.mockResolvedValueOnce({ id: "b1" });
    const res = await post("b1", { ...validBody, source: "ai-photo" });
    expect(res.status).toBe(200);
    expect(updateBook).toHaveBeenCalledWith("b1", {
      coverUrl: "https://storage/covers/b1.png",
      coverSource: "ai-photo",
    });
  });

  it("rejects an invalid body with 400", async () => {
    const res = await post("b1", { contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(uploadCover).not.toHaveBeenCalled();
  });

  it("rejects an unknown source value with 400", async () => {
    const res = await post("b1", { ...validBody, source: "metadata" });
    expect(res.status).toBe(400);
    expect(uploadCover).not.toHaveBeenCalled();
  });

  it("maps a CoverValidationError to 400", async () => {
    getBook.mockResolvedValueOnce({ id: "b1" });
    uploadCover.mockRejectedValueOnce(
      new CoverValidationError("image too large"),
    );
    const res = await post("b1", validBody);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the book does not exist", async () => {
    getBook.mockResolvedValueOnce(null);
    const res = await post("missing", validBody);
    expect(res.status).toBe(404);
    expect(uploadCover).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await post("b1", validBody);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/books/:id/cover/from-source", () => {
  it("fetches the source cover, re-hosts it, and marks coverSource metadata", async () => {
    getBook.mockResolvedValueOnce({
      id: "b1",
      title: "Rayuela",
      isbn13: "9780307474728",
    });
    enrichByIsbn.mockResolvedValueOnce({
      coverUrl: "https://books.google.com/cover.jpg",
    });
    rehostCover.mockResolvedValueOnce(
      "https://storage/covers/9780307474728.webp",
    );
    updateBook.mockResolvedValueOnce({ id: "b1" });

    const res = await postFromSource("b1");
    expect(res.status).toBe(200);
    expect((await res.json()).coverUrl).toBe(
      "https://storage/covers/9780307474728.webp",
    );
    expect(enrichByIsbn).toHaveBeenCalledWith("9780307474728");
    expect(rehostCover).toHaveBeenCalledWith(
      "https://books.google.com/cover.jpg",
      "9780307474728",
    );
    expect(updateBook).toHaveBeenCalledWith("b1", {
      coverUrl: "https://storage/covers/9780307474728.webp",
      coverSource: "metadata",
    });
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "book",
        entityId: "b1",
        changedFields: ["coverUrl", "coverSource"],
      }),
    );
  });

  it("returns 404 when the book does not exist", async () => {
    getBook.mockResolvedValueOnce(null);
    const res = await postFromSource("missing");
    expect(res.status).toBe(404);
    expect(enrichByIsbn).not.toHaveBeenCalled();
  });

  it("returns 400 when the book has no isbn", async () => {
    getBook.mockResolvedValueOnce({ id: "b1", title: "Rayuela", isbn13: null });
    const res = await postFromSource("b1");
    expect(res.status).toBe(400);
    expect(enrichByIsbn).not.toHaveBeenCalled();
  });

  it("returns 404 when the source has no cover", async () => {
    getBook.mockResolvedValueOnce({
      id: "b1",
      title: "Rayuela",
      isbn13: "9780307474728",
    });
    enrichByIsbn.mockResolvedValueOnce({ coverUrl: null });
    const res = await postFromSource("b1");
    expect(res.status).toBe(404);
    expect(rehostCover).not.toHaveBeenCalled();
  });

  it("returns 502 when re-hosting the source cover fails", async () => {
    getBook.mockResolvedValueOnce({
      id: "b1",
      title: "Rayuela",
      isbn13: "9780307474728",
    });
    enrichByIsbn.mockResolvedValueOnce({
      coverUrl: "https://books.google.com/cover.jpg",
    });
    rehostCover.mockResolvedValueOnce(null);
    const res = await postFromSource("b1");
    expect(res.status).toBe(502);
    expect(updateBook).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await postFromSource("b1");
    expect(res.status).toBe(401);
  });
});
