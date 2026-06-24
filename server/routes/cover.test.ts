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
  recordChange: vi.fn().mockResolvedValue(undefined),
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
});

async function post(id: string, body: unknown) {
  return fetch(`${baseUrl}/api/books/${id}/cover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { imageBase64: "Zm9v", contentType: "image/png" };

describe("POST /api/books/:id/cover", () => {
  it("uploads and returns the new coverUrl (200)", async () => {
    getBook.mockResolvedValueOnce({ id: "b1" });
    uploadCover.mockResolvedValueOnce("https://storage/covers/b1.png");
    updateBook.mockResolvedValueOnce({ id: "b1" });
    const res = await post("b1", validBody);
    expect(res.status).toBe(200);
    expect((await res.json()).coverUrl).toBe("https://storage/covers/b1.png");
    expect(updateBook).toHaveBeenCalledWith("b1", {
      coverUrl: "https://storage/covers/b1.png",
      coverSource: "user",
    });
  });

  it("rejects an invalid body with 400", async () => {
    const res = await post("b1", { contentType: "image/png" });
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
