"use client";

import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { exchangeForSession } from "@/lib/auth/client";
import type { Reader } from "@/lib/types/reader";

interface AuthState {
  reader: Reader | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState>({
  reader: null,
  loading: true,
  refresh: async () => {},
});

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}

async function fetchMe(): Promise<Reader | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as { reader: Reader | null };
    return data.reader;
  } catch {
    return null;
  }
}

/**
 * Client auth state. Server is the source of truth (`/api/auth/me`); the Client
 * SDK is used only for the silent re-mint when the cookie lapsed (ADR-0012).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [reader, setReader] = React.useState<Reader | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setReader(await fetchMe());
  }, []);

  React.useEffect(() => {
    let active = true;
    // onAuthStateChanged can fire more than once in quick succession (initial
    // restore + a settled state right after) — each firing runs this async
    // chain independently, so a slower EARLIER firing can resolve AFTER a
    // faster LATER one and clobber its result. Only the most recently
    // *started* firing is allowed to write state; a stale one is dropped.
    let latestCall = 0;
    const unsub = onAuthStateChanged(getClientAuth(), async (user) => {
      const call = ++latestCall;
      let me = await fetchMe();
      if (!me && user) {
        // Remembered device: re-mint the server session from a fresh ID token.
        try {
          const idToken = await user.getIdToken();
          await exchangeForSession(idToken);
          me = await fetchMe();
        } catch {
          // fall through as signed-out
        }
      }
      if (active && call === latestCall) {
        setReader(me);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ reader, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
