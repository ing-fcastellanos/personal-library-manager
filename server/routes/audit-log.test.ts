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
 * Endpoint tests for the audit log read API (#40). `listAuditLog` is mocked so
 * these exercise routing and query-param parsing without an emulator (node lane).
 */
const listAuditLog = vi.fn();

vi.mock("../../services/audit/repository", () => ({
  listAuditLog: (...a: unknown[]) => listAuditLog(...a),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const router = (await import("./audit-log")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => vi.clearAllMocks());

describe("GET /api/audit-log", () => {
  it("returns the unfiltered list without a session", async () => {
    listAuditLog.mockResolvedValueOnce([{ id: "a1" }]);
    const res = await fetch(`${baseUrl}/api/audit-log`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "a1" }]);
    expect(listAuditLog).toHaveBeenCalledWith({
      entityType: undefined,
      entityId: undefined,
      limit: undefined,
    });
  });

  it("passes entityType and entityId through when both are given", async () => {
    listAuditLog.mockResolvedValueOnce([]);
    await fetch(`${baseUrl}/api/audit-log?entityType=book&entityId=b1`);
    expect(listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "book", entityId: "b1" }),
    );
  });

  it("ignores an unknown entityType", async () => {
    listAuditLog.mockResolvedValueOnce([]);
    await fetch(`${baseUrl}/api/audit-log?entityType=loan`);
    expect(listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: undefined }),
    );
  });

  it("respects limit", async () => {
    listAuditLog.mockResolvedValueOnce([]);
    await fetch(`${baseUrl}/api/audit-log?limit=5`);
    expect(listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });
});
