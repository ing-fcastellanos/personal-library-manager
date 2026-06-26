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
 * Endpoint tests for the AI settings API (#19b). The settings service and the
 * auth middleware are mocked so these exercise routing, validation, and the auth
 * gate without an emulator or real API keys (node lane).
 */

const readSettings = vi.fn();
const writeSettings = vi.fn();
const testEngine = vi.fn();
let authed = true;

vi.mock("../../services/ai/settings", () => ({
  readSettings: (...a: unknown[]) => readSettings(...a),
  writeSettings: (...a: unknown[]) => writeSettings(...a),
  testEngine: (...a: unknown[]) => testEngine(...a),
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
  const router = (await import("./ai-settings")).default;
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
  readSettings.mockReset();
  writeSettings.mockReset();
  testEngine.mockReset();
});

const req = (path: string, init?: RequestInit) =>
  fetch(`${baseUrl}/api${path}`, init);
const json = (method: string, body: unknown) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("GET /api/ai/settings", () => {
  it("returns config and engine status (no keys)", async () => {
    readSettings.mockResolvedValueOnce({
      config: { defaultEngine: "openai", fallbackEnabled: true },
      engines: [
        { engine: "openai", status: "connected" },
        { engine: "gemini", status: "not_configured" },
      ],
    });
    const res = await req("/ai/settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.defaultEngine).toBe("openai");
    expect(JSON.stringify(body)).not.toMatch(/apiKey|sk-/i);
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await req("/ai/settings");
    expect(res.status).toBe(401);
    expect(readSettings).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/ai/settings", () => {
  it("persists a valid change and returns updated config", async () => {
    writeSettings.mockResolvedValueOnce({
      defaultEngine: "gemini",
      fallbackEnabled: true,
    });
    const res = await req(
      "/ai/settings",
      json("PATCH", { defaultEngine: "gemini" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).defaultEngine).toBe("gemini");
    expect(writeSettings).toHaveBeenCalledWith({ defaultEngine: "gemini" });
  });

  it("rejects an unknown engine with 400", async () => {
    const res = await req(
      "/ai/settings",
      json("PATCH", { defaultEngine: "claude" }),
    );
    expect(res.status).toBe(400);
    expect(writeSettings).not.toHaveBeenCalled();
  });

  it("rejects an empty patch with 400", async () => {
    const res = await req("/ai/settings", json("PATCH", {}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await req(
      "/ai/settings",
      json("PATCH", { fallbackEnabled: false }),
    );
    expect(res.status).toBe(401);
    expect(writeSettings).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/test", () => {
  it("returns the probe status", async () => {
    testEngine.mockResolvedValueOnce("connected");
    const res = await req("/ai/test", json("POST", { engine: "openai" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("connected");
    expect(testEngine).toHaveBeenCalledWith("openai");
  });

  it("rejects an unknown engine with 400", async () => {
    const res = await req("/ai/test", json("POST", { engine: "claude" }));
    expect(res.status).toBe(400);
    expect(testEngine).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authed = false;
    const res = await req("/ai/test", json("POST", { engine: "openai" }));
    expect(res.status).toBe(401);
  });
});
