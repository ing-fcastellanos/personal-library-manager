"use client";

import * as React from "react";
import type { Reader } from "@/lib/types/reader";

/** Loads the household readers from the public `/api/readers` (#8). */
export function useReaders(): { readers: Reader[]; loading: boolean } {
  const [readers, setReaders] = React.useState<Reader[] | null>(null);

  React.useEffect(() => {
    fetch("/api/readers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Reader[]) => setReaders(data))
      .catch(() => setReaders([]));
  }, []);

  return { readers: readers ?? [], loading: readers === null };
}
