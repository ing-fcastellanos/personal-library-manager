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
import { apiErrorHandler } from "./error-handler";

/**
 * Tests the central API error backstop (#65): errors escaping a handler are logged
 * and answered with a generic 500, and only under `/api`.
 */
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use("/api", express.json());
  app.post("/api/throws", () => {
    throw new Error("boom");
  });
  // A non-/api route that also throws, guarded by no error handler of ours.
  app.get("/web/throws", () => {
    throw new Error("web boom");
  });
  app.use("/api", apiErrorHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("apiErrorHandler", () => {
  it("logs and returns 500 for a malformed JSON body (a parse error the handler never sees)", async () => {
    const res = await fetch(`${baseUrl}/api/throws`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal" });
    expect(errSpy).toHaveBeenCalled();
    expect(String(errSpy.mock.calls[0][0])).toContain("POST /api/throws");
  });

  it("logs and returns 500 for a synchronous throw in a handler", async () => {
    const res = await fetch(`${baseUrl}/api/throws`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal" });
    expect(errSpy).toHaveBeenCalled();
  });

  it("does not intercept non-/api (web) routes", async () => {
    const res = await fetch(`${baseUrl}/web/throws`);
    // Falls through to Express's default handler, not our JSON backstop.
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type") ?? "").not.toContain(
      "application/json",
    );
  });
});
