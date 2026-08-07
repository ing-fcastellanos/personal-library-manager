/**
 * Outcome model for a restore run (#93) — mirrors `components/books/import-summary.ts`'s
 * shape (grouped outcomes, retry-able failures) but generic across the 8 restorable
 * entity types instead of just books.
 */
export type RestoreEntityType =
  | "reader"
  | "shelf"
  | "book"
  | "copy"
  | "series"
  | "readingEvent"
  | "wishlistItem"
  | "loan";

export type RestoreResult =
  "created" | "updated" | "deleted" | "skipped" | "failed";

export interface RestoreOutcome {
  entityType: RestoreEntityType;
  /** Display label — a title/name, not an id. */
  label: string;
  result: RestoreResult;
  /** The entity's id in the backup file (or, during cleanup, its current live id). */
  oldId: string;
  /** The newly created/matched id, when applicable. */
  newId?: string;
  reason?: string;
}

export const ENTITY_LABEL: Record<RestoreEntityType, string> = {
  reader: "Lector",
  shelf: "Estante",
  book: "Libro",
  copy: "Ejemplar",
  series: "Serie",
  readingEvent: "Lectura",
  wishlistItem: "Deseo",
  loan: "Préstamo",
};

/** Display order + labels for the result groups shown in the summary. */
export const RESULT_GROUPS: { result: RestoreResult; label: string }[] = [
  { result: "created", label: "Creados" },
  { result: "updated", label: "Actualizados" },
  { result: "deleted", label: "Reemplazados (borrados)" },
  { result: "failed", label: "Fallidos" },
  { result: "skipped", label: "Omitidos" },
];

export interface OutcomeGroup {
  result: RestoreResult;
  label: string;
  items: RestoreOutcome[];
}

/** Groups outcomes by result (in display order); empty groups are omitted. */
export function groupRestoreOutcomes(
  outcomes: RestoreOutcome[],
): OutcomeGroup[] {
  return RESULT_GROUPS.map(({ result, label }) => ({
    result,
    label,
    items: outcomes.filter((o) => o.result === result),
  })).filter((g) => g.items.length > 0);
}

/** A creation run succeeded in full only when nothing failed (skips are expected/OK). */
export function creationSucceeded(outcomes: RestoreOutcome[]): boolean {
  return outcomes.every((o) => o.result !== "failed");
}
