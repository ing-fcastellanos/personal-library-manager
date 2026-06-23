"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { LockScreen } from "@/components/auth/lock-screen";

interface LockState {
  locked: boolean;
  lock: () => void;
  unlock: () => void;
}

const LockContext = React.createContext<LockState>({
  locked: false,
  lock: () => {},
  unlock: () => {},
});

export function useLock(): LockState {
  return React.useContext(LockContext);
}

const STORAGE_KEY = "plm:locked";

/**
 * Soft client-side lock for the shared shelf device (ADR-0013). Persisted in
 * sessionStorage so a refresh stays locked. Not a hardened boundary — the real
 * boundary is the session + server gating.
 */
export function LockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = React.useState(false);

  React.useEffect(() => {
    try {
      // Restore the lock flag from sessionStorage on mount (external-system sync).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocked(window.sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const lock = React.useCallback(() => {
    setLocked(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const unlock = React.useCallback(() => {
    setLocked(false);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <LockContext.Provider value={{ locked, lock, unlock }}>
      {children}
    </LockContext.Provider>
  );
}

/** Shows the lock screen over the app when locked and a reader is active. */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { locked, unlock } = useLock();
  const { reader, loading } = useAuth();

  // A lock without an authenticated reader is stale — clear it.
  React.useEffect(() => {
    if (!loading && !reader && locked) unlock();
  }, [loading, reader, locked, unlock]);

  if (locked && reader) {
    return <LockScreen reader={reader} onUnlock={unlock} />;
  }
  return <>{children}</>;
}
