import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createWriteRateLimit } from "./rate-limit";

/**
 * Tests the write rate limiter (#42) with a tiny `limit` — the real 600/min
 * default is deliberately generous and would take forever to actually trip
 * in a test.
 */
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use("/api", createWriteRateLimit({ limit: 2 }));
  app.post("/api/thing", (req, res) => res.status(201).json({ ok: true }));
  app.get("/api/thing", (req, res) => res.json({ ok: true }));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

function post() {
  return fetch(`${baseUrl}/api/thing`, { method: "POST" });
}

describe("writeRateLimit", () => {
  it("allows requests up to the limit", async () => {
    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);
  });

  it("rejects a write beyond the limit with 429", async () => {
    expect((await post()).status).toBe(429);
  });

  it("never limits GET requests, even past the write limit", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/thing`);
      expect(res.status).toBe(200);
    }
  });
});
