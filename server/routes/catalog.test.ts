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
 * Endpoint tests for `GET /api/catalog/search` (#17). The catalog service is
 * mocked so these exercise query-param parsing and the response shape without an
 * emulator (node lane).
 */

const searchCatalog = vi.fn();
vi.mock("../../services/catalog/service", () => ({
  searchCatalog: (...a: unknown[]) => searchCatalog(...a),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const catalogRouter = (await import("./catalog")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", catalogRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  searchCatalog.mockReset();
  searchCatalog.mockResolvedValue({ items: [], total: 0, page: 1, facets: {} });
});

describe("GET /api/catalog/search", () => {
  it("returns the service result (200)", async () => {
    searchCatalog.mockResolvedValueOnce({
      items: [{ id: "b1" }],
      total: 1,
      page: 1,
      facets: { categories: [], authors: [], publishers: [], shelves: [] },
    });
    const res = await fetch(`${baseUrl}/api/catalog/search`);
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(1);
  });

  it("parses and forwards filters, sort, and pagination", async () => {
    await fetch(
      `${baseUrl}/api/catalog/search?q=cien&category=novela&shelf=s1&status=reading&reader=r1&sort=addedAt&page=2&limit=10`,
    );
    expect(searchCatalog).toHaveBeenCalledWith({
      q: "cien",
      category: "novela",
      author: undefined,
      publisher: undefined,
      shelf: "s1",
      status: "reading",
      reader: "r1",
      sort: "addedAt",
      page: 2,
      limit: 10,
    });
  });

  it("drops an invalid sort and status", async () => {
    await fetch(`${baseUrl}/api/catalog/search?sort=bogus&status=nope`);
    expect(searchCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ sort: undefined, status: undefined }),
    );
  });
});
