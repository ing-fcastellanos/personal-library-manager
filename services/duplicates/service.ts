import {
  findBooksByIsbn13,
  findBooksByTitleKey,
  findBooksByAuthorKey,
} from "../books/repository";
import { listCopiesByBook } from "../copies/repository";
import { normalizeCandidate, classifyMatch } from "./matcher";
import type { Book } from "../../lib/types/book";
import type {
  DuplicateCandidate,
  DuplicateMatch,
  DuplicateResult,
  DuplicateTier,
  Recommendation,
} from "./types";

/**
 * Duplicate detection hook (#16, design D1/D2). Gathers a small candidate set
 * cheaply by equality (ISBN-13 / titleKey / authorKey — all auto-indexed),
 * de-duplicates by book id, classifies each with the pure matcher, attaches the
 * existing-copy count, and recommends an action. Read-only: it creates nothing.
 *
 * Reusable by manual add (#14) and AI batch add (#21). Queries are injectable via
 * `deps` for network-free tests.
 */

export interface DuplicateDeps {
  findByIsbn13?: typeof findBooksByIsbn13;
  findByTitleKey?: typeof findBooksByTitleKey;
  findByAuthorKey?: typeof findBooksByAuthorKey;
  countCopies?: (bookId: string) => Promise<number>;
}

const TIER_RANK: Record<DuplicateTier, number> = { exact: 0, strong: 1 };

export async function findBookDuplicates(
  candidate: DuplicateCandidate,
  deps: DuplicateDeps = {},
): Promise<DuplicateResult> {
  const norm = normalizeCandidate(candidate);
  const findByIsbn13 = deps.findByIsbn13 ?? findBooksByIsbn13;
  const findByTitleKey = deps.findByTitleKey ?? findBooksByTitleKey;
  const findByAuthorKey = deps.findByAuthorKey ?? findBooksByAuthorKey;
  const countCopies =
    deps.countCopies ??
    (async (bookId: string) => (await listCopiesByBook(bookId)).length);

  const [byIsbn, byTitle, byAuthor] = await Promise.all([
    norm.isbn13 ? findByIsbn13(norm.isbn13) : Promise.resolve([]),
    norm.titleKey ? findByTitleKey(norm.titleKey) : Promise.resolve([]),
    norm.authorKeys.length
      ? findByAuthorKey(norm.authorKeys[0])
      : Promise.resolve([]),
  ]);

  // De-duplicate the union by book id.
  const unique = new Map<string, Book>();
  for (const book of [...byIsbn, ...byTitle, ...byAuthor]) {
    if (!unique.has(book.id)) unique.set(book.id, book);
  }

  const matches: DuplicateMatch[] = [];
  for (const book of unique.values()) {
    const classification = classifyMatch(norm, book);
    if (!classification) continue;
    matches.push({
      book: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        isbn13: book.isbn13 ?? null,
      },
      tier: classification.tier,
      score: classification.score,
      existingCopies: await countCopies(book.id),
      suggestedAction: classification.suggestedAction,
    });
  }

  // Exact matches first, then by descending score.
  matches.sort(
    (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.score - a.score,
  );

  const recommendation: Recommendation =
    matches[0]?.suggestedAction ?? "add-new";
  return { recommendation, matches };
}
