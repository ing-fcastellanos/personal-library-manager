import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-provider";

/**
 * Regression test for a race where `onAuthStateChanged` fires more than once
 * in quick succession (real Firebase behavior: an initial restored state,
 * then a settled one) and a slower EARLIER firing resolves its `fetchMe()`
 * chain AFTER a faster LATER firing — clobbering a correct "signed in" state
 * back to "signed out" even though the session is genuinely valid. Reported
 * live as "login succeeds server-side but the UI still shows logged out".
 */

let authStateCallback: ((user: unknown) => void) | undefined;

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    authStateCallback = cb;
    return () => {};
  },
}));

vi.mock("@/lib/firebase/client", () => ({
  getClientAuth: () => ({}),
}));

const exchangeForSession = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  exchangeForSession: (...args: unknown[]) => exchangeForSession(...args),
}));

function Probe() {
  const { reader, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{reader ? `signed in: ${reader.id}` : "signed out"}</div>;
}

describe("AuthProvider", () => {
  it("keeps the result of the most recently started onAuthStateChanged firing, even if an earlier one resolves later", async () => {
    // Two overlapping firings: the FIRST call's fetchMe() resolves slower
    // (after the second one has already started and finished), simulating
    // the exact out-of-order completion seen in production logs.
    let resolveFirstMe: (v: Response) => void;
    const firstMe = new Promise<Response>((resolve) => {
      resolveFirstMe = resolve;
    });
    const readerBody = { reader: { id: "reader-1", name: "Frank" } };
    let fetchMeCallCount = 0;

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.endsWith("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }
      // First call in flight → return the pending (slow) promise.
      if (fetchMeCallCount === 0) {
        fetchMeCallCount++;
        return firstMe;
      }
      // Every subsequent call resolves immediately with a signed-in reader.
      return Promise.resolve({
        ok: true,
        json: async () => readerBody,
      } as Response);
    }) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateCallback).toBeDefined());

    // First firing: user is null (server not caught up yet) → starts its
    // fetchMe(), which is the pending `firstMe` promise above.
    authStateCallback!(null);
    // Second firing: user is now signed in and fetchMe() resolves fast with
    // a real reader.
    authStateCallback!({ getIdToken: async () => "token" });

    await screen.findByText("signed in: reader-1");

    // Now let the FIRST (stale) firing's fetchMe() finally resolve with
    // "signed out" — it must NOT overwrite the already-correct state.
    resolveFirstMe!({
      ok: true,
      json: async () => ({ reader: null }),
    } as Response);

    // Give any (incorrect) state update a chance to land, then assert the
    // signed-in state held.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("signed in: reader-1")).toBeInTheDocument();
  });
});
