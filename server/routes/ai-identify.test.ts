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
 * Endpoint tests for `POST /api/ai/identify` (#20). The identify service and the
 * auth middleware are mocked so these exercise routing, validation, the auth gate,
 * and error mapping without an emulator or real API keys (node lane).
 */

class NoEngineAvailableError extends Error {}
const identifyAndEnrich = vi.fn();
let authed = true;

vi.mock("../../services/ai/identify", () => ({
  identifyAndEnrich: (...a: unknown[]) => identifyAndEnrich(...a),
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
  const router = (await import("./ai-identify")).default;
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
  identifyAndEnrich.mockReset();
});

function post(body: unknown) {
  return fetch(`${baseUrl}/api/ai/identify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { imageBase64: "Zm9vYmFy", contentType: "image/jpeg" };

describe("POST /api/ai/identify", () => {
  it("returns the identify result (200)", async () => {
    identifyAndEnrich.mockResolvedValueOnce({
      aiConfidence: 0.8,
      sourceProvider: "openai",
      best: { title: "Dune" },
      alternatives: [{ title: "Dune Messiah" }],
    });
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.best.title).toBe("Dune");
    expect(body.alternatives).toHaveLength(1);
  });

  it("rejects a missing image with 400", async () => {
    const res = await post({ contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(identifyAndEnrich).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type with 400", async () => {
    const res = await post({
      imageBase64: "Zm9v",
      contentType: "application/pdf",
    });
    expect(res.status).toBe(400);
    expect(identifyAndEnrich).not.toHaveBeenCalled();
  });

  it("maps NoEngineAvailableError to 503", async () => {
    identifyAndEnrich.mockRejectedValueOnce(new NoEngineAvailableError());
    const res = await post(validBody);
    expect(res.status).toBe(503);
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await post(validBody);
    expect(res.status).toBe(401);
    expect(identifyAndEnrich).not.toHaveBeenCalled();
  });
});
