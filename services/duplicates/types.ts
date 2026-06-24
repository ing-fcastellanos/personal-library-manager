/**
 * Duplicate detection (#16). Shapes for the `findBookDuplicates` hook and the
 * `GET /api/books/duplicates` pre-check. Detection only *recommends* — executing
 * an action reuses existing catalog endpoints (POST /api/copies, PATCH/POST
 * /api/books), so nothing here creates a `Book` or `Copy` (design D1/D4).
 */

/** Match strength: `exact` by ISBN, `strong` by title + compatible authorship. */
export type DuplicateTier = "exact" | "strong";

/** Per-match suggestion, derived from the Book/Copy model (design D4). */
export type SuggestedAction = "add-copy" | "add-new-edition" | "review";

/** Overall recommendation; `add-new` when there are no matches. */
export type Recommendation = SuggestedAction | "add-new";

/** Raw candidate to check (any ISBN form; display title/authors). */
export interface DuplicateCandidate {
  isbn?: string | null;
  title?: string | null;
  authors?: string[];
}

/** Candidate after normalization to canonical/slug keys for matching. */
export interface NormalizedCandidate {
  isbn13: string | null;
  titleKey: string;
  authorKeys: string[];
}

/** Compact view of a matched existing book. */
export interface MatchedBook {
  id: string;
  title: string;
  authors: string[];
  isbn13: string | null;
}

/** A single duplicate match with its tier, score, copy count, and suggestion. */
export interface DuplicateMatch {
  book: MatchedBook;
  tier: DuplicateTier;
  score: number;
  existingCopies: number;
  suggestedAction: SuggestedAction;
}

/** Result of a duplicate check: matches plus an overall recommendation. */
export interface DuplicateResult {
  recommendation: Recommendation;
  matches: DuplicateMatch[];
}
