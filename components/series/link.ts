import type { SeriesVolume } from "@/lib/types/series";

/**
 * Pure helpers for editing a series' volume list client-side (#38). Volumes are
 * always replaced as a whole array (design D5) — these functions compute the
 * next array from the current one, they don't talk to the network.
 */

export interface VolumeSnapshot {
  title: string;
  authors: string[];
  isbn13?: string | null;
  coverUrl?: string | null;
  bookId?: string | null;
}

/** The position a newly-added volume should default to: one past the highest. */
export function nextPosition(volumes: readonly SeriesVolume[]): number {
  return volumes.reduce((max, v) => Math.max(max, v.position), 0) + 1;
}

/**
 * Places `snapshot` at `position`: fills an existing volume at that position
 * (whether it was a missing placeholder or already linked — the reader chose
 * this position explicitly) or inserts a new one. Result stays sorted.
 */
export function reconcileVolumes(
  volumes: readonly SeriesVolume[],
  position: number,
  snapshot: VolumeSnapshot,
): SeriesVolume[] {
  const volume: SeriesVolume = {
    position,
    title: snapshot.title,
    authors: snapshot.authors,
    isbn13: snapshot.isbn13 ?? null,
    coverUrl: snapshot.coverUrl ?? null,
    bookId: snapshot.bookId ?? null,
  };
  const idx = volumes.findIndex((v) => v.position === position);
  const next =
    idx === -1
      ? [...volumes, volume]
      : volumes.map((v, i) => (i === idx ? volume : v));
  return [...next].sort((a, b) => a.position - b.position);
}

/** Removes the volume at `position`. */
export function removeVolume(
  volumes: readonly SeriesVolume[],
  position: number,
): SeriesVolume[] {
  return volumes.filter((v) => v.position !== position);
}

/**
 * Swaps a volume's position with its neighbor in reading order ("mover arriba"/
 * "mover abajo" — no drag-and-drop, consistent with the rest of the app).
 */
export function moveVolume(
  volumes: readonly SeriesVolume[],
  position: number,
  direction: "up" | "down",
): SeriesVolume[] {
  const sorted = [...volumes].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((v) => v.position === position);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return sorted;
  const a = sorted[idx];
  const b = sorted[swapWith];
  sorted[idx] = { ...a, position: b.position };
  sorted[swapWith] = { ...b, position: a.position };
  return sorted.sort((x, y) => x.position - y.position);
}

/** Freeform "a, b, c" author text → a trimmed, non-empty string array. */
export function parseAuthors(raw: string): string[] {
  return raw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}
