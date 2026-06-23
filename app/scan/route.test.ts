import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "./route";

function scan(query: string) {
  return GET({ url: `http://localhost/scan${query}` } as NextRequest);
}

describe("/scan resolver", () => {
  it("maps each action to its app route", () => {
    expect(scan("?action=dashboard").headers.get("Location")).toBe("/");
    expect(scan("?action=add").headers.get("Location")).toBe("/agregar");
    expect(scan("?action=finish").headers.get("Location")).toBe("/leido");
  });

  it("falls back to the dashboard for an unknown or missing action", () => {
    expect(scan("?action=bogus").headers.get("Location")).toBe("/");
    expect(scan("").headers.get("Location")).toBe("/");
  });

  it("emits a relative Location with a 307 status", () => {
    const res = scan("?action=add");
    expect(res.status).toBe(307);
    const loc = res.headers.get("Location");
    expect(loc?.startsWith("/")).toBe(true);
    expect(loc).not.toMatch(/^https?:\/\//);
  });

  it("preserves and encodes the shelf parameter", () => {
    expect(scan("?action=add&shelf=3").headers.get("Location")).toBe(
      "/agregar?shelf=3",
    );
    expect(scan("?action=add&shelf=a b").headers.get("Location")).toBe(
      "/agregar?shelf=a%20b",
    );
  });
});
