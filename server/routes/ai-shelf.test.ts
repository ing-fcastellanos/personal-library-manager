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
 * Endpoint tests for `POST /api/ai/identify-shelf` (#21a). The AI service and the
 * auth middleware are mocked so these exercise routing, validation, the auth gate,
 * and error mapping without an emulator or real API keys (node lane).
 */

class NoEngineAvailableError extends Error {}
const identifyBooksFromImage = vi.fn();
let authed = true;

vi.mock("../../services/ai/service", () => ({
  identifyBooksFromImage: (...a: unknown[]) => identifyBooksFromImage(...a),
}));
vi.mock("../../services/ai/types", () => ({ NoEngineAvailableError }));
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
  const router = (await import("./ai-shelf")).default;
  const app = express();
  app.use("/api", express.json({ limit: "8mb" }));
  app.use("/api", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  identifyBooksFromImage.mockReset();
});

function post(body: unknown) {
  return fetch(`${baseUrl}/api/ai/identify-shelf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { imageBase64: "Zm9vYmFy", contentType: "image/jpeg" };

describe("POST /api/ai/identify-shelf", () => {
  it("returns the identified books and the engine (200)", async () => {
    identifyBooksFromImage.mockResolvedValueOnce([
      { title: "Dune", sourceProvider: "openai", confidence: 0.9 },
      { title: "Hyperion", sourceProvider: "openai", confidence: 0.7 },
    ]);
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.books).toHaveLength(2);
    expect(body.sourceProvider).toBe("openai");
  });

  it("returns an empty list when nothing is recognized", async () => {
    identifyBooksFromImage.mockResolvedValueOnce([]);
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.books).toEqual([]);
    expect(body.sourceProvider).toBeNull();
  });

  it("rejects a missing image with 400", async () => {
    const res = await post({ contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(identifyBooksFromImage).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type with 400", async () => {
    const res = await post({
      imageBase64: "Zm9v",
      contentType: "application/pdf",
    });
    expect(res.status).toBe(400);
    expect(identifyBooksFromImage).not.toHaveBeenCalled();
  });

  it("maps NoEngineAvailableError to 503", async () => {
    identifyBooksFromImage.mockRejectedValueOnce(new NoEngineAvailableError());
    const res = await post(validBody);
    expect(res.status).toBe(503);
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await post(validBody);
    expect(res.status).toBe(401);
    expect(identifyBooksFromImage).not.toHaveBeenCalled();
  });
});
