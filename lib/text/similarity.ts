/**
 * Shared title/author similarity primitives (#16, design D5). One definition of
 * how normalized `titleKey`/`authorKeys` slugs are tokenized and compared, reused
 * by both the enrichment ranking (#13 `services/enrichment/rank.ts`) and the
 * duplicate matcher (#16). Pure and deterministic — unit-tested in the
 * emulator-free lane.
 */

/** Splits a slug into its non-empty hyphen-separated tokens. */
export function tokenize(slug: string | null | undefined): string[] {
  return slug ? slug.split("-").filter(Boolean) : [];
}

/**
 * Counts how many tokens of `tokens` appear in `pool` (by occurrence, not
 * distinct), e.g. for title token-overlap scoring.
 */
export function countOverlap(
  tokens: readonly string[],
  pool: ReadonlySet<string>,
): number {
  return tokens.filter((t) => pool.has(t)).length;
}

/** Jaccard similarity (0–1) of two token lists, treated as sets. */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Number of distinct `authorKeys` shared between two items. */
export function sharedAuthorKeys(
  a: readonly string[],
  b: readonly string[],
): number {
  const setB = new Set(b);
  let shared = 0;
  for (const key of new Set(a)) {
    if (setB.has(key)) shared += 1;
  }
  return shared;
}

export interface TitleAuthor {
  titleKey?: string | null;
  authorKeys?: readonly string[];
}

/** Relative weights of the title vs author dimensions in the combined score. */
const TITLE_WEIGHT = 0.7;
const AUTHOR_WEIGHT = 0.3;

/**
 * Combined title/author similarity (0–1): a weighted blend of title-token Jaccard
 * and author-key Jaccard. When either side has no authors the author dimension is
 * unknown and contributes 0 (so a title-only match scores below a title+author
 * match) without penalizing the title signal.
 */
export function titleAuthorSimilarity(a: TitleAuthor, b: TitleAuthor): number {
  const titleSim = jaccard(tokenize(a.titleKey), tokenize(b.titleKey));
  const authorsA = a.authorKeys ?? [];
  const authorsB = b.authorKeys ?? [];
  const authorSim =
    authorsA.length === 0 || authorsB.length === 0
      ? 0
      : jaccard(authorsA, authorsB);
  return TITLE_WEIGHT * titleSim + AUTHOR_WEIGHT * authorSim;
}
