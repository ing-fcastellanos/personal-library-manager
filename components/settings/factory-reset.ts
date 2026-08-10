import type { Backup } from "./backup";
import { snapshotFromBackup, type CleanupSnapshot } from "./restore";
import type { RestoreOutcome } from "./restore-summary";

/**
 * Pure planning for the factory reset (#add-factory-reset).
 *
 * The deletion itself is the restore's cleanup phase (`runCleanup` in
 * `restore-run.ts`), reused verbatim: it already walks the entity types in the
 * reverse dependency order the integrity guards require (loans before copies,
 * copies before books), and it already excludes readers at the type level.
 * Those modules are named `restore-*` because that's where they were first
 * needed, but the cleanup phase is generic — it deletes a snapshot of the
 * library, with no knowledge of why. Importing them here rather than moving
 * them keeps a tested module untouched.
 *
 * Readers are deliberately absent from everything below, and not by
 * convention: `CleanupSnapshot` has no `readers` field, so a reset physically
 * cannot target them and the counts shown to the reader cannot list them.
 * That matters more than it looks — readers are the access allowlist (sign-in
 * resolves the authenticated email against `readers` and refuses an unknown
 * one), and there is no way to create one from the app (closed membership,
 * ADR-0012). Deleting them would lock the household out with no way back.
 */

/** How many of each entity a reset will delete. Mirrors `CleanupSnapshot` — so, no readers. */
export type ResetCounts = Record<keyof CleanupSnapshot, number>;

export interface ResetPlan {
  /** The ids to delete, in the shape `runCleanup` consumes. */
  snapshot: CleanupSnapshot;
  counts: ResetCounts;
  /** Total entities to delete — the progress denominator. */
  total: number;
}

/**
 * Builds the plan from a snapshot of the library as it is right now. Counts come
 * from the snapshot itself rather than from `entityCounts()` so they can never
 * drift from what will actually be deleted (`entityCounts` also reports readers,
 * which a reset must never touch).
 */
export function planFactoryReset(current: Backup): ResetPlan {
  const snapshot = snapshotFromBackup(current);
  const counts: ResetCounts = {
    books: snapshot.books.length,
    copies: snapshot.copies.length,
    readingEvents: snapshot.readingEvents.length,
    wishlistItems: snapshot.wishlistItems.length,
    loans: snapshot.loans.length,
    series: snapshot.series.length,
    shelves: snapshot.shelves.length,
  };
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { snapshot, counts, total };
}

/** Whether there is anything to delete — an already-empty library needs no confirmation. */
export function hasAnythingToDelete(plan: ResetPlan): boolean {
  return plan.total > 0;
}

/** True when every deletion succeeded. */
export function resetSucceeded(outcomes: RestoreOutcome[]): boolean {
  return outcomes.every((o) => o.result !== "failed");
}

/**
 * Whether a finished run left anything behind worth retrying.
 *
 * A reset is convergent: re-running it re-reads the library and deletes
 * whatever survived, so a retry resumes toward "empty" instead of restarting
 * from scratch. That's what makes a partial failure recoverable here without
 * the create-first ordering restore needs.
 */
export function needsRetry(outcomes: RestoreOutcome[]): boolean {
  return outcomes.some((o) => o.result === "failed");
}
