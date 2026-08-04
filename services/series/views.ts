import type { Series, SeriesVolume } from "../../lib/types/series";

/**
 * Derived series views (#38, design D1/D3). Pure in-memory computations —
 * series membership is never stored on `book`; it's discovered by scanning the
 * loaded `series` list for a volume whose `bookId` matches, the same in-memory
 * join `services/catalog` already uses for shelves and reading status.
 */

/** Whether a volume is missing — the household doesn't have it (design D2). */
export function isMissing(volume: SeriesVolume): boolean {
  return !volume.bookId;
}

/** The series (if any) that has a volume linked to this book. */
export function seriesForBook(
  bookId: string,
  seriesList: readonly Series[],
): Series | null {
  return (
    seriesList.find((s) => s.volumes.some((v) => v.bookId === bookId)) ?? null
  );
}

/** How many of a series' volumes are owned, out of the total (design D3). */
export function volumeCounts(series: Series): { owned: number; total: number } {
  const owned = series.volumes.filter((v) => !isMissing(v)).length;
  return { owned, total: series.volumes.length };
}
