import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createCanonicalHostRedirect } from "./canonical-host";

let server: Server;
let port: number;

beforeAll(async () => {
  const app = express();
  app.use(createCanonicalHostRedirect("library.example.com"));
  app.get("/some/path", (req, res) => res.json({ ok: true }));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  port = (server.address() as AddressInfo).port;
});

afterAll(() => server.close());

/**
 * `fetch()` forbids setting the `Host` header (per the Fetch spec) — it's
 * silently dropped rather than erroring, which would make a Host-based test
 * pass for the wrong reason. Node's `http` module has no such restriction, so
 * it's used here to actually exercise the `Host`-header fallback path.
 */
function requestWithHost(
  path: string,
  host: string,
): Promise<{ status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, headers: { Host: host } },
      (res) => {
        resolve({
          status: res.statusCode ?? 0,
          location: res.headers.location,
        });
        res.resume();
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("createCanonicalHostRedirect", () => {
  it("redirects a raw *.run.app Host to the canonical domain, preserving path+query", async () => {
    const res = await requestWithHost(
      "/some/path?x=1",
      "personal-library-manager-a7kaufa4ua-uc.a.run.app",
    );
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://library.example.com/some/path?x=1");
  });

  it("prefers X-Forwarded-Host over Host when present", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/some/path`, {
      redirect: "manual",
      headers: { "X-Forwarded-Host": "library.example.com" },
    });
    expect(res.status).toBe(200);
  });

  it("does not redirect when already on the canonical host", async () => {
    const res = await requestWithHost("/some/path", "library.example.com");
    expect(res.status).toBe(200);
  });

  it("does not redirect an unrelated host (e.g. localhost)", async () => {
    const res = await requestWithHost("/some/path", "localhost:3000");
    expect(res.status).toBe(200);
  });

  it("no-ops entirely when CANONICAL_HOST is unset", async () => {
    const app = express();
    app.use(createCanonicalHostRedirect(undefined));
    app.get("/x", (req, res) => res.json({ ok: true }));
    const unconfigured: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const unconfiguredPort = (unconfigured.address() as AddressInfo).port;

    try {
      const res = await new Promise<{ status: number }>((resolve, reject) => {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: unconfiguredPort,
            path: "/x",
            headers: {
              Host: "personal-library-manager-a7kaufa4ua-uc.a.run.app",
            },
          },
          (r) => {
            resolve({ status: r.statusCode ?? 0 });
            r.resume();
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(res.status).toBe(200);
    } finally {
      unconfigured.close();
    }
  });
});
