"use client";

import * as React from "react";
import type { Shelf } from "@/lib/types/shelf";

/**
 * Shelf data with per-shelf book counts (#18). Counts come from the catalog
 * facets (`GET /api/catalog/search` → `facets.shelves`, #17) — no new endpoint.
 * The shelf list is the source of truth (a brand-new shelf with no books does
 * not appear in the facets, so it merges in with a count of 0).
 */

export interface ShelfWithCount extends Shelf {
  bookCount: number;
}

interface FacetValue {
  value: string;
  count: number;
}

/** Pure merge of the full shelf list with facet counts (0 when absent). */
export function mergeShelfCounts(
  shelves: readonly Shelf[],
  facetShelves: readonly FacetValue[],
): ShelfWithCount[] {
  const counts = new Map(facetShelves.map((f) => [f.value, f.count]));
  return shelves.map((s) => ({ ...s, bookCount: counts.get(s.id) ?? 0 }));
}

export function useShelvesWithCounts() {
  const [shelves, setShelves] = React.useState<ShelfWithCount[] | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const [list, search] = await Promise.all([
        fetch("/api/shelves").then((r) => r.json() as Promise<Shelf[]>),
        fetch("/api/catalog/search").then(
          (r) => r.json() as Promise<{ facets?: { shelves?: FacetValue[] } }>,
        ),
      ]);
      setShelves(mergeShelfCounts(list ?? [], search.facets?.shelves ?? []));
    } catch {
      setShelves([]);
    }
  }, []);

  React.useEffect(() => {
    // `refresh` sets state only after awaiting the fetch (async), not
    // synchronously within the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { shelves, loading: shelves === null, refresh };
}
