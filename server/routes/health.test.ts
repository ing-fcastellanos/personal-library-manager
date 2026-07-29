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
 * Tests `/api/health/ready` readiness logging (#65): a failed connectivity check
 * logs its cause before responding 503; a successful check is silent.
 */
const listCollections = vi.fn();
vi.mock("../../lib/firebase/admin", () => ({
  getAdminFirestore: () => ({ listCollections }),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const healthRouter = (await import("./health")).default;
  const app = express();
  app.use("/api", healthRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/health/ready", () => {
  it("logs the cause and responds 503 when Firestore is unreachable", async () => {
    listCollections.mockRejectedValueOnce(new Error("no database"));
    const res = await fetch(`${baseUrl}/api/health/ready`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable" });
    expect(errSpy).toHaveBeenCalled();
    expect(String(errSpy.mock.calls[0][0])).toContain("/api/health/ready");
  });

  it("responds 200 and logs nothing when Firestore is reachable", async () => {
    listCollections.mockResolvedValueOnce([]);
    const res = await fetch(`${baseUrl}/api/health/ready`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ready" });
    expect(errSpy).not.toHaveBeenCalled();
  });
});
