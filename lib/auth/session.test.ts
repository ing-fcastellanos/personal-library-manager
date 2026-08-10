import { describe, it, expect } from "vitest";
import { sessionCookieName, sessionCookieOptions } from "./session";

/**
 * Guards an infrastructure constraint that is invisible from the code alone.
 *
 * Firebase Hosting fronts Cloud Run (`add-firebase-hosting-proxy`) and strips
 * every cookie from a forwarded request except one literally named
 * `__session`. A differently-named session cookie is set by the browser and
 * then silently dropped in transit, so sign-in "succeeds" while every
 * subsequent request looks signed-out — the exact failure this name change
 * fixed. Nothing in the type system or a local emulator run catches a rename;
 * this test is the only thing that does.
 */
describe("session cookie", () => {
  it("is named __session, the only name Firebase Hosting forwards", () => {
    expect(sessionCookieName).toBe("__session");
  });

  it("stays httpOnly and site-wide so the whole app sees the session", () => {
    const options = sessionCookieOptions(false);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
  });

  it("is Secure in production and relaxed in development", () => {
    expect(sessionCookieOptions(false).secure).toBe(true);
    expect(sessionCookieOptions(true).secure).toBe(false);
  });
});
