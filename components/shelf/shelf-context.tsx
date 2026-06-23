"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

interface ShelfState {
  /** The shelf id carried from a QR scan (`?shelf=`), if any. */
  shelf: string | null;
}

const ShelfContext = React.createContext<ShelfState>({ shelf: null });

export function useShelf(): ShelfState {
  return React.useContext(ShelfContext);
}

const STORAGE_KEY = "plm:shelf";

/**
 * Captures the `?shelf=` parameter arriving from a scan and exposes it via
 * `useShelf()` (#10). URL is the source of truth — since the login `next`
 * preserves the query, the value returns in the URL after sign-in — with a
 * sessionStorage backup. No preselection logic here (that is #18).
 */
export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shelf, setShelf] = React.useState<string | null>(null);

  // Syncs `shelf` from an external system (the URL / sessionStorage) on navigation —
  // the intended use of an effect, not a cascading-render bug.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("shelf");
    if (fromUrl) {
      setShelf(fromUrl);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, fromUrl);
      } catch {
        // ignore storage failures
      }
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) setShelf(stored);
    } catch {
      // ignore storage failures
    }
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <ShelfContext.Provider value={{ shelf }}>{children}</ShelfContext.Provider>
  );
}
