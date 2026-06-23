import { describe, it, expect } from "vitest";
import { toClientReader, type Reader } from "./reader";

const base: Reader = {
  id: "r1",
  name: "Frank",
  preferences: {},
  createdAt: "2026-06-23T00:00:00.000Z",
  updatedAt: "2026-06-23T00:00:00.000Z",
};

describe("toClientReader", () => {
  it("strips the PIN hash and reports hasPin = true when set", () => {
    const out = toClientReader({ ...base, pinHash: "scrypt$salt$hash" });
    expect(out.pinHash).toBeUndefined();
    expect(out.hasPin).toBe(true);
    expect("pinHash" in out && out.pinHash !== undefined).toBe(false);
  });

  it("reports hasPin = false when no PIN is set", () => {
    const out = toClientReader({ ...base, pinHash: null });
    expect(out.pinHash).toBeUndefined();
    expect(out.hasPin).toBe(false);
  });

  it("preserves the other public fields", () => {
    const out = toClientReader({ ...base, email: "frank@example.com" });
    expect(out.id).toBe("r1");
    expect(out.name).toBe("Frank");
    expect(out.email).toBe("frank@example.com");
  });
});
