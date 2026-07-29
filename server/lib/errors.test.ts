import { describe, it, expect, vi, afterEach } from "vitest";
import type { Request, Response } from "express";
import { respondInternal } from "./errors";

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

afterEach(() => vi.restoreAllMocks());

describe("respondInternal", () => {
  it("logs the request method + path and the error, then responds 500", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    const req = {
      method: "POST",
      originalUrl: "/api/wishlist-items",
    } as Request;
    const err = new Error("boom");

    respondInternal(res, req, err);

    expect(spy).toHaveBeenCalledWith("[POST /api/wishlist-items]", err);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "internal" });
  });

  it("passes the Error object (not just its message) so the stack is logged", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("with stack");
    respondInternal(
      mockRes(),
      { method: "GET", originalUrl: "/api/books" } as Request,
      err,
    );
    expect(spy.mock.calls[0][1]).toBe(err);
  });
});
