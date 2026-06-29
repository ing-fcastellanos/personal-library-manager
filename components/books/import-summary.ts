/**
 * AI import summary model + helpers (#22). The AI add flows (#20 single, #21 shelf)
 * emit an `ImportOutcome[]` describing what happened to each book, persist it to
 * `sessionStorage`, and navigate to `/agregar/resumen`, which groups and renders it
 * with per-item edit/undo/retry actions. Pure and unit-tested; the React layer does
 * the navigation and the undo/retry fetches.
 */

export type ImportResult =
  | "added"
  | "added_as_copy"
  | "skipped_duplicate"
  | "discarded"
  | "failed";

export interface ImportOutcome {
  title: string;
  author?: string;
  coverUrl?: string | null;
  result: ImportResult;
  /** Created book (added) — for edit and (with copyId) undo. */
  bookId?: string;
  /** Created copy (added / added_as_copy) — for undo. */
  copyId?: string;
  /** Ready-to-POST `/api/books/intake` body for a failed save, so it can be retried. */
  retry?: { payload: unknown };
}

export const IMPORT_KEY = "plm:lastImport";

/** Display order + labels for the result groups. */
export const RESULT_GROUPS: { result: ImportResult; label: string }[] = [
  { result: "added", label: "Agregados" },
  { result: "added_as_copy", label: "Agregados como copia" },
  { result: "failed", label: "Fallidos" },
  { result: "skipped_duplicate", label: "Duplicados omitidos" },
  { result: "discarded", label: "Descartados" },
];

export interface OutcomeGroup {
  result: ImportResult;
  label: string;
  items: { outcome: ImportOutcome; index: number }[];
}

/** Groups outcomes by result (in display order), keeping each item's index. */
export function groupOutcomes(outcomes: ImportOutcome[]): OutcomeGroup[] {
  return RESULT_GROUPS.map(({ result, label }) => ({
    result,
    label,
    items: outcomes
      .map((outcome, index) => ({ outcome, index }))
      .filter(({ outcome }) => outcome.result === result),
  })).filter((g) => g.items.length > 0);
}

/** Persists the import outcomes for the session (no-op when storage is unavailable). */
export function saveImport(outcomes: ImportOutcome[]): void {
  try {
    sessionStorage.setItem(IMPORT_KEY, JSON.stringify(outcomes));
  } catch {
    /* storage unavailable — summary just won't survive navigation */
  }
}

/** Loads the persisted import outcomes, or `null` when absent/corrupt. */
export function loadImport(): ImportOutcome[] | null {
  try {
    const raw = sessionStorage.getItem(IMPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ImportOutcome[]) : null;
  } catch {
    return null;
  }
}

/** Returns a copy of the list with the item at `index` marked as `discarded` (undone). */
export function markUndone(
  outcomes: ImportOutcome[],
  index: number,
): ImportOutcome[] {
  return outcomes.map((o, i) =>
    i === index
      ? {
          title: o.title,
          author: o.author,
          coverUrl: o.coverUrl,
          result: "discarded" as const,
        }
      : o,
  );
}

/** Flips a failed item to `added` with its new identifiers after a successful retry. */
export function markRetried(
  outcomes: ImportOutcome[],
  index: number,
  ids: { bookId: string; copyId?: string },
): ImportOutcome[] {
  return outcomes.map((o, i) =>
    i === index
      ? {
          title: o.title,
          author: o.author,
          coverUrl: o.coverUrl,
          result: "added" as const,
          bookId: ids.bookId,
          copyId: ids.copyId,
        }
      : o,
  );
}
