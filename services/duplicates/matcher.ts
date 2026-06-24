import { slugify, arraySlugs } from "../../lib/text/slug";
import {
  titleAuthorSimilarity,
  sharedAuthorKeys,
} from "../../lib/text/similarity";
import { toIsbn13 } from "../enrichment/normalize";
import type { Book } from "../../lib/types/book";
import type {
  DuplicateCandidate,
  DuplicateTier,
  NormalizedCandidate,
  SuggestedAction,
} from "./types";

/**
 * Pure duplicate-matching logic (#16, design D3/D4). Canonicalizes a candidate to
 * the same ISBN-13 / `titleKey` / `authorKeys` keys the catalog stores (#13), then
 * classifies an existing book as an `exact` (same ISBN) or `strong` (same title +
 * compatible authorship) match — or no match. Deterministic and unit-tested.
 */

/** Normalizes a raw candidate to the keys used for matching. */
export function normalizeCandidate(
  candidate: DuplicateCandidate,
): NormalizedCandidate {
  const authors = (candidate.authors ?? [])
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
  return {
    isbn13: toIsbn13(candidate.isbn),
    titleKey: candidate.title ? slugify(candidate.title) : "",
    authorKeys: arraySlugs(authors),
  };
}

export interface Classification {
  tier: DuplicateTier;
  score: number;
  suggestedAction: SuggestedAction;
}

/**
 * Classifies an existing `book` against a normalized candidate, or returns `null`
 * when it is not the same book.
 *
 * - EXACT: both sides canonicalize to the same ISBN-13 → `add-copy` (same edition).
 * - STRONG: equal `titleKey` and compatible authorship. When both sides have
 *   authors but share none, it is NOT a match (distinct same-titled books). A
 *   strong match with differing ISBNs suggests `add-new-edition`; with an ISBN
 *   missing on either side it suggests `review`.
 */
export function classifyMatch(
  candidate: NormalizedCandidate,
  book: Book,
): Classification | null {
  const bookIsbn13 = toIsbn13(book.isbn13);

  if (candidate.isbn13 && bookIsbn13 && candidate.isbn13 === bookIsbn13) {
    return { tier: "exact", score: 1, suggestedAction: "add-copy" };
  }

  if (
    candidate.titleKey &&
    book.titleKey &&
    candidate.titleKey === book.titleKey
  ) {
    const bookAuthors = book.authorKeys ?? [];
    const bothHaveAuthors =
      candidate.authorKeys.length > 0 && bookAuthors.length > 0;
    if (
      bothHaveAuthors &&
      sharedAuthorKeys(candidate.authorKeys, bookAuthors) === 0
    ) {
      return null; // same title, disjoint authors → different book
    }
    const score = titleAuthorSimilarity(
      { titleKey: candidate.titleKey, authorKeys: candidate.authorKeys },
      { titleKey: book.titleKey, authorKeys: bookAuthors },
    );
    const suggestedAction: SuggestedAction =
      candidate.isbn13 && bookIsbn13 ? "add-new-edition" : "review";
    return { tier: "strong", score, suggestedAction };
  }

  return null;
}
