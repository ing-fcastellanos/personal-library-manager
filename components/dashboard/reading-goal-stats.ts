import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { eventDate } from "@/components/reading/history";

/**
 * Annual reading-goal helpers (#30). Goals live in `Reader.preferences.readingGoals`
 * (a year-keyed map, e.g. `{ "2026": 24 }`) — no new backend field or endpoint.
 * `PATCH /api/readers/:id` replaces the entire `preferences` object on write (no
 * server-side deep merge), so every write here goes through `withReadingGoal`,
 * which reads the reader's current `preferences` and returns the full merged
 * object to PATCH — never a bare `{ readingGoals }` that would wipe other keys.
 */

/** `YYYY` for a given date (or `now`, default the real current date). */
function currentYear(now: Date = new Date()): string {
  return String(now.getFullYear());
}

/** Count of a reader's `finished` events whose date falls in the given year. */
export function finishedThisYear(
  events: ReadingEvent[],
  readerId: string,
  now: Date = new Date(),
): number {
  const year = currentYear(now);
  return events.filter(
    (e) =>
      e.status === "finished" &&
      e.readerId === readerId &&
      eventDate(e).slice(0, 4) === year,
  ).length;
}

/**
 * Calendar months elapsed in the year so far (January through the current
 * month, inclusive) — deliberately every calendar month, not just "active"
 * ones, so idle months pull the projection down (see design.md Decision).
 */
function monthsElapsedInYear(now: Date = new Date()): number {
  return now.getMonth() + 1;
}

/**
 * Projected year-end total at the reader's pace so far this year:
 * `finished / monthsElapsed * 12`. Returns `null` when `finished` is 0 (nothing
 * to project from) — never a misleading 0.
 */
export function projectedTotal(
  finished: number,
  now: Date = new Date(),
): number | null {
  if (finished <= 0) return null;
  return (finished / monthsElapsedInYear(now)) * 12;
}

/** Reads a reader's goal for the given year (default current), or `null` if unset/malformed. */
export function readingGoalFor(
  reader: Pick<Reader, "preferences">,
  year: string = currentYear(),
): number | null {
  const goals = reader.preferences?.readingGoals;
  if (typeof goals !== "object" || goals === null) return null;
  const value = (goals as Record<string, unknown>)[year];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Builds the full merged `preferences` object to PATCH: preserves every other
 * preference key and every other year's goal, only setting `[year]`.
 */
export function withReadingGoal(
  reader: Pick<Reader, "preferences">,
  goal: number,
  year: string = currentYear(),
): Record<string, unknown> {
  const existingGoals =
    typeof reader.preferences?.readingGoals === "object" &&
    reader.preferences.readingGoals !== null
      ? (reader.preferences.readingGoals as Record<string, unknown>)
      : {};
  return {
    ...reader.preferences,
    readingGoals: { ...existingGoals, [year]: goal },
  };
}
