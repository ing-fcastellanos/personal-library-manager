import { slugify } from "../../lib/text/slug";
import { tokenize, countOverlap } from "../../lib/text/similarity";
import type { Candidate } from "./types";

/**
 * Deterministic candidate ranking for the `?q=` search path (design D4). A pure,
 * I/O-free weighted score compares the slug-normalized query against each
 * candidate's `titleKey`/`authorKeys` and rewards completeness. Candidates with
 * no title or no authors are discarded. Ties preserve the source's original
 * order. Unit-tested in the emulator-free lane.
 */

const WEIGHTS = {
  titleExact: 40,
  titlePartialPerToken: 8,
  titlePartialMax: 20,
  authorMatch: 25,
  hasIsbn13: 10,
  hasCover: 5,
  hasYear: 3,
} as const;

const DEFAULT_LIMIT = 5;

/**
 * Scores a single candidate against the (slug-normalized) query. Exported so the
 * ranking is transparent and unit-testable in isolation. Tokenization and
 * token-overlap come from the shared `lib/text/similarity` primitives (#16 D5).
 */
export function scoreCandidate(
  querySlug: string,
  candidate: Candidate,
): number {
  const queryTokens = new Set(tokenize(querySlug));
  let score = 0;

  // Title: exact slug match beats partial token overlap.
  if (candidate.titleKey && candidate.titleKey === querySlug) {
    score += WEIGHTS.titleExact;
  } else {
    const overlap = countOverlap(tokenize(candidate.titleKey), queryTokens);
    if (overlap > 0) {
      score += Math.min(
        WEIGHTS.titlePartialMax,
        overlap * WEIGHTS.titlePartialPerToken,
      );
    }
  }

  // Author: any author token present in the query.
  const authorTokens = candidate.authorKeys.flatMap((k) => tokenize(k));
  if (authorTokens.some((t) => t.length >= 3 && queryTokens.has(t))) {
    score += WEIGHTS.authorMatch;
  }

  if (candidate.isbn13) score += WEIGHTS.hasIsbn13;
  if (candidate.coverUrl) score += WEIGHTS.hasCover;
  if (candidate.publishedYear) score += WEIGHTS.hasYear;

  return score;
}

/**
 * Ranks candidates best-match-first, discarding any without a title or authors,
 * and returns the top `limit` (default 5). Sorting is stable: equal scores keep
 * the source's original ordering (design D4 tie-break).
 */
export function rankCandidates(
  query: string,
  candidates: readonly Candidate[],
  limit: number = DEFAULT_LIMIT,
): Candidate[] {
  const querySlug = slugify(query);
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(
      ({ candidate }) =>
        candidate.title.length > 0 && candidate.authors.length > 0,
    )
    .map((entry) => ({
      ...entry,
      score: scoreCandidate(querySlug, entry.candidate),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
