import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Endpoint tests for `GET /api/enrich` (#13). The enrichment service is mocked so
 * these exercise routing, the `isbn` xor `q` validation, and branch dispatch
 * without any network access (node lane, no emulator).
 */

const enrichByIsbn = vi.fn();
const searchByText = vi.fn();

vi.mock("../../services/enrichment/service", () => ({
  enrichByIsbn: (...args: unknown[]) => enrichByIsbn(...args),
  searchByText: (...args: unknown[]) => searchByText(...args),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const enrichRouter = (await import("./enrich")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", enrichRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe("GET /api/enrich", () => {
  it("returns 400 when neither isbn nor q is provided", async () => {
    const res = await fetch(`${baseUrl}/api/enrich`);
    expect(res.status).toBe(400);
    expect(enrichByIsbn).not.toHaveBeenCalled();
    expect(searchByText).not.toHaveBeenCalled();
  });

  it("returns 400 when both isbn and q are provided", async () => {
    const res = await fetch(`${baseUrl}/api/enrich?isbn=9780307474728&q=cien`);
    expect(res.status).toBe(400);
  });

  it("dispatches to enrichByIsbn for ?isbn and returns a single candidate", async () => {
    enrichByIsbn.mockResolvedValueOnce({ title: "Cien Años de Soledad" });
    const res = await fetch(`${baseUrl}/api/enrich?isbn=978-0-307-47472-8`);
    expect(res.status).toBe(200);
    expect(enrichByIsbn).toHaveBeenCalledWith("978-0-307-47472-8");
    const body = await res.json();
    expect(body.candidate.title).toBe("Cien Años de Soledad");
  });

  it("dispatches to searchByText for ?q and returns ranked candidates", async () => {
    searchByText.mockResolvedValueOnce([{ title: "A" }, { title: "B" }]);
    const res = await fetch(`${baseUrl}/api/enrich?q=cien+anos+marquez`);
    expect(res.status).toBe(200);
    expect(searchByText).toHaveBeenCalledWith("cien anos marquez");
    const body = await res.json();
    expect(body.candidates).toHaveLength(2);
  });

  it("returns 200 with a null candidate when the ISBN is unknown", async () => {
    enrichByIsbn.mockResolvedValueOnce(null);
    const res = await fetch(`${baseUrl}/api/enrich?isbn=0000000000000`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate).toBeNull();
  });
});
