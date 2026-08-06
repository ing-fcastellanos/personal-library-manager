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
 * Endpoint tests for `POST /api/books/intake` (#14, audit coverage #40). The
 * intake service, audit log, and auth middleware are mocked so these exercise
 * routing, validation, and the auth gate without an emulator (node lane).
 */

const intakeBook = vi.fn();
const recordChange = vi.fn();
let authed = true;

vi.mock("../../services/intake/service", () => ({
  intakeBook: (...args: unknown[]) => intakeBook(...args),
}));

vi.mock("../../services/audit/repository", () => ({
  recordChange: (...args: unknown[]) => recordChange(...args),
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
  const intakeRouter = (await import("./intake")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", intakeRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  intakeBook.mockReset();
  recordChange.mockReset();
});

async function post(body: unknown) {
  return fetch(`${baseUrl}/api/books/intake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/books/intake", () => {
  it("creates a book and copy on a valid body (201)", async () => {
    intakeBook.mockResolvedValueOnce({
      book: { id: "b1", title: "Cien Años de Soledad" },
      copy: { id: "c1", bookId: "b1" },
    });
    const res = await post({
      book: { title: "Cien Años de Soledad" },
      copy: { condition: "good" },
      coverSourceUrl: "https://example.com/cover.jpg",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.book.id).toBe("b1");
    expect(body.copy.bookId).toBe("b1");
    expect(intakeBook).toHaveBeenCalledOnce();
    // Both the book and the copy it creates are logged (#40 design D4).
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "book",
        entityId: "b1",
        entityLabel: "Cien Años de Soledad",
      }),
    );
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "copy",
        entityId: "c1",
      }),
    );
  });

  it("rejects an invalid book with 400 and does not call the service", async () => {
    const res = await post({ book: { title: "" } });
    expect(res.status).toBe(400);
    expect(intakeBook).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with 401", async () => {
    authed = false;
    const res = await post({ book: { title: "Valid" } });
    expect(res.status).toBe(401);
    expect(intakeBook).not.toHaveBeenCalled();
  });
});
