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
 * Endpoint tests for the reading-events API's audit coverage (#40) — this route
 * had zero audit coverage before this change. Repositories and auth are mocked
 * so these exercise routing and `recordChange` calls without an emulator (node
 * lane) — `services/audit/diff` runs for real (pure).
 */
const listReadingEvents = vi.fn();
const getReadingEvent = vi.fn();
const updateReadingEvent = vi.fn();
const deleteReadingEvent = vi.fn();
const listEventsByBook = vi.fn();
const listEventsByReader = vi.fn();
const createReadingEvent = vi.fn();
const recordChange = vi.fn();
let authed = true;

class ReferenceNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(field);
  }
}

vi.mock("../../services/reading-events/repository", () => ({
  listReadingEvents: (...a: unknown[]) => listReadingEvents(...a),
  getReadingEvent: (...a: unknown[]) => getReadingEvent(...a),
  updateReadingEvent: (...a: unknown[]) => updateReadingEvent(...a),
  deleteReadingEvent: (...a: unknown[]) => deleteReadingEvent(...a),
  listEventsByBook: (...a: unknown[]) => listEventsByBook(...a),
  listEventsByReader: (...a: unknown[]) => listEventsByReader(...a),
}));
vi.mock("../../services/reading-events/service", () => ({
  createReadingEvent: (...a: unknown[]) => createReadingEvent(...a),
  ReferenceNotFoundError,
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
  const router = (await import("./reading-events")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", router);
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

function post(body: unknown) {
  return fetch(`${baseUrl}/api/reading-events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patch(id: string, body: unknown) {
  return fetch(`${baseUrl}/api/reading-events/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function del(id: string) {
  return fetch(`${baseUrl}/api/reading-events/${id}`, { method: "DELETE" });
}

describe("reading-events API audit logging (#40)", () => {
  it("logs a create", async () => {
    createReadingEvent.mockResolvedValueOnce({
      id: "e1",
      bookTitle: "Rayuela",
    });
    const res = await post({ readerId: "r1", bookId: "b1" });
    expect(res.status).toBe(201);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "readingEvent",
        entityId: "e1",
        entityLabel: "Rayuela · lectura",
      }),
    );
  });

  it("logs an update with the changed field names", async () => {
    getReadingEvent.mockResolvedValueOnce({
      id: "e1",
      bookTitle: "Rayuela",
      rating: 3,
    });
    updateReadingEvent.mockResolvedValueOnce({
      id: "e1",
      bookTitle: "Rayuela",
    });
    const res = await patch("e1", { rating: 5 });
    expect(res.status).toBe(200);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "readingEvent",
        entityId: "e1",
        entityLabel: "Rayuela · lectura",
        changedFields: ["rating"],
      }),
    );
  });

  it("does not log a no-op update", async () => {
    getReadingEvent.mockResolvedValueOnce({
      id: "e1",
      bookTitle: "Rayuela",
      rating: 3,
    });
    updateReadingEvent.mockResolvedValueOnce({
      id: "e1",
      bookTitle: "Rayuela",
    });
    await patch("e1", { rating: 3 });
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ changedFields: [] }),
    );
  });

  it("logs a delete", async () => {
    getReadingEvent.mockResolvedValueOnce({ id: "e1", bookTitle: "Rayuela" });
    deleteReadingEvent.mockResolvedValueOnce(true);
    const res = await del("e1");
    expect(res.status).toBe(204);
    expect(recordChange).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        entityType: "readingEvent",
        entityId: "e1",
        entityLabel: "Rayuela · lectura",
      }),
    );
  });

  it("rejects writes without a session (401)", async () => {
    authed = false;
    expect((await post({ readerId: "r1", bookId: "b1" })).status).toBe(401);
    expect(createReadingEvent).not.toHaveBeenCalled();
  });
});
