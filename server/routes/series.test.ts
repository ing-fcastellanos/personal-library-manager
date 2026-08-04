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
 * Endpoint tests for the series API (#38). The repository and the auth
 * middleware are mocked so these exercise routing, validation, and the auth
 * gate without an emulator (node lane).
 */
const listSeries = vi.fn();
const getSeries = vi.fn();
const createSeries = vi.fn();
const updateSeries = vi.fn();
const deleteSeries = vi.fn();
let authed = true;

vi.mock("../../services/series/repository", () => ({
  listSeries: (...a: unknown[]) => listSeries(...a),
  getSeries: (...a: unknown[]) => getSeries(...a),
  createSeries: (...a: unknown[]) => createSeries(...a),
  updateSeries: (...a: unknown[]) => updateSeries(...a),
  deleteSeries: (...a: unknown[]) => deleteSeries(...a),
}));

vi.mock("../middleware/require-auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    if (authed) return next();
    res.status(401).json({ error: "unauthenticated" });
  },
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const seriesRouter = (await import("./series")).default;
  const app = express();
  app.use("/api", express.json());
  app.use("/api", seriesRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());
beforeEach(() => {
  authed = true;
  vi.clearAllMocks();
});

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patch(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validSeries = {
  name: "El Señor de los Anillos",
  volumes: [{ position: 1, title: "La Comunidad del Anillo" }],
};

describe("series API", () => {
  it("serves reads without a session", async () => {
    authed = false;
    listSeries.mockResolvedValueOnce([{ id: "s1" }]);
    expect((await fetch(`${baseUrl}/api/series`)).status).toBe(200);
    getSeries.mockResolvedValueOnce({ id: "s1" });
    expect((await fetch(`${baseUrl}/api/series/s1`)).status).toBe(200);
  });

  it("404s reading an unknown series", async () => {
    getSeries.mockResolvedValueOnce(null);
    expect((await fetch(`${baseUrl}/api/series/nope`)).status).toBe(404);
  });

  it("rejects creating without a session (401)", async () => {
    authed = false;
    expect((await post("/api/series", validSeries)).status).toBe(401);
    expect(createSeries).not.toHaveBeenCalled();
  });

  it("rejects an invalid create body (400)", async () => {
    const res = await post("/api/series", { name: "", volumes: [] });
    expect(res.status).toBe(400);
    expect(createSeries).not.toHaveBeenCalled();
  });

  it("creates a valid series (201)", async () => {
    createSeries.mockResolvedValueOnce({ id: "s1", ...validSeries });
    const res = await post("/api/series", validSeries);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("s1");
  });

  it("updates a series (200) and 404s when missing", async () => {
    updateSeries.mockResolvedValueOnce({ id: "s1", name: "LOTR" });
    expect((await patch("/api/series/s1", { name: "LOTR" })).status).toBe(200);
    updateSeries.mockResolvedValueOnce(null);
    expect((await patch("/api/series/nope", { name: "x" })).status).toBe(404);
  });

  it("rejects update/delete without a session (401)", async () => {
    authed = false;
    expect((await patch("/api/series/s1", { name: "x" })).status).toBe(401);
    const del = await fetch(`${baseUrl}/api/series/s1`, { method: "DELETE" });
    expect(del.status).toBe(401);
  });

  it("deletes a series (204) and 404s when missing", async () => {
    deleteSeries.mockResolvedValueOnce(true);
    expect(
      (await fetch(`${baseUrl}/api/series/s1`, { method: "DELETE" })).status,
    ).toBe(204);
    deleteSeries.mockResolvedValueOnce(false);
    expect(
      (await fetch(`${baseUrl}/api/series/nope`, { method: "DELETE" })).status,
    ).toBe(404);
  });
});
