import { describe, it, expect } from "vitest";
import {
  hashPin,
  verifyPin,
  isLocked,
  recordFailure,
  recordSuccess,
} from "./pin";

describe("PIN hashing", () => {
  it("verifies a correct PIN and rejects a wrong one", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
    expect(verifyPin("0000", stored)).toBe(false);
  });

  it("uses a random salt (same PIN → different hashes)", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });

  it("rejects a malformed stored value", () => {
    expect(verifyPin("1234", "not-a-valid-hash")).toBe(false);
  });
});

describe("PIN rate limiting", () => {
  it("locks after 5 consecutive failures and resets on success", () => {
    const key = `reader-${Math.random()}`;
    expect(isLocked(key)).toBe(false);

    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(isLocked(key)).toBe(false); // 4 failures: not yet locked

    recordFailure(key); // 5th failure
    expect(isLocked(key)).toBe(true);

    recordSuccess(key);
    expect(isLocked(key)).toBe(false);
  });

  it("tracks keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordFailure(a);
    expect(isLocked(a)).toBe(true);
    expect(isLocked(b)).toBe(false);
  });
});
