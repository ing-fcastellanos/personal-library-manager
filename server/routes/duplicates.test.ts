import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Endpoint tests for `GET /api/books/duplicates` (#16). The duplicate service is
 * mocked so these exercise routing, the `isbn`/`title` validation, and param
 * parsing without an emulator (node lane).
 */

const findBookDuplicates = vi.fn();

vi.mock("../../services/duplicates/service", () => ({
  findBookDuplicates: (...args: unknown[]) => findBookDuplicates(...args),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const duplicatesRouter = (await import("./duplicates")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", duplicatesRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe("GET /api/books/duplicates", () => {
  it("returns 400 when neither isbn nor title is provided", async () => {
    const res = await fetch(`${baseUrl}/api/books/duplicates`);
    expect(res.status).toBe(400);
    expect(findBookDuplicates).not.toHaveBeenCalled();
  });

  it("returns 200 with the service result for an isbn query", async () => {
    findBookDuplicates.mockResolvedValueOnce({
      recommendation: "add-copy",
      matches: [{ book: { id: "b1" }, tier: "exact" }],
    });
    const res = await fetch(
      `${baseUrl}/api/books/duplicates?isbn=9780307474728`,
    );
    expect(res.status).toBe(200);
    expect(findBookDuplicates).toHaveBeenCalledWith({
      isbn: "9780307474728",
      title: undefined,
      authors: [],
    });
    const body = await res.json();
    expect(body.recommendation).toBe("add-copy");
  });

  it("parses repeated authors params into an array", async () => {
    findBookDuplicates.mockResolvedValueOnce({
      recommendation: "add-new",
      matches: [],
    });
    const res = await fetch(
      `${baseUrl}/api/books/duplicates?title=cien+anos&authors=gabo&authors=otro`,
    );
    expect(res.status).toBe(200);
    expect(findBookDuplicates).toHaveBeenCalledWith({
      isbn: undefined,
      title: "cien anos",
      authors: ["gabo", "otro"],
    });
  });
});
