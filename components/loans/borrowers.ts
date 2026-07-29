import type { Loan } from "@/lib/types/loan";

/** A previously-used borrower name and how many loans (open + history) it has. */
export interface BorrowerSuggestion {
  name: string;
  count: number;
}

/**
 * Distinct borrower display names derived from the loans already loaded
 * client-side, with a per-name loan count — for the lend form's autocomplete
 * (design D2). Pure; no separate fetch needed since callers already load
 * `/api/loans` to compute per-copy/per-book loan state.
 */
export function borrowerSuggestions(
  loans: readonly Loan[],
): BorrowerSuggestion[] {
  const counts = new Map<string, number>();
  for (const l of loans) {
    counts.set(l.borrowerName, (counts.get(l.borrowerName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
