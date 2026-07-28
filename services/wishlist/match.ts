import { sharedAuthorKeys } from "../../lib/text/similarity";
import { toIsbn13 } from "../enrichment/normalize";
import type { WishlistItem } from "../../lib/types/wishlist-item";

/**
 * Wishlist matching (#37, design D5). One "are these the same book?" cascade,
 * reused for dedup on add, grouping the household buy list, and deriving when a
 * reading fulfils a wish. Built on `lib/text/similarity` — the shared primitive
 * already consumed by enrichment ranking (#13) and the duplicate matcher (#16);
 * this is its third consumer. It does **not** reuse `services/duplicates/matcher`,
 * whose `classifyMatch` expects a `Book` on the right-hand side.
 *
 * The cascade prefers the strongest available signal:
 *   1. both sides linked to a book → identity by `bookId`
 *   2. both sides carry an ISBN    → identity by canonical ISBN-13
 *   3. otherwise                   → equal `titleKey` with a compatible-author guard
 */

/** The minimum shape needed to compare two things as "the same book". */
export interface BookRef {
  bookId?: string | null;
  isbn13?: string | null;
  titleKey?: string | null;
  authorKeys?: readonly string[];
}

export function sameBook(a: BookRef, b: BookRef): boolean {
  // 1. Both linked to a catalog book: authoritative.
  if (a.bookId && b.bookId) return a.bookId === b.bookId;

  // 2. Both carry an ISBN: same edition iff the canonical ISBN-13 matches.
  const isbnA = toIsbn13(a.isbn13 ?? null);
  const isbnB = toIsbn13(b.isbn13 ?? null);
  if (isbnA && isbnB) return isbnA === isbnB;

  // 3. Fall back to title, but only when the authors are compatible: equal title
  //    with disjoint authors is a different book (same rule the duplicate matcher
  //    uses), so a shared title alone never merges two distinct works.
  if (a.titleKey && b.titleKey && a.titleKey === b.titleKey) {
    const authorsA = a.authorKeys ?? [];
    const authorsB = b.authorKeys ?? [];
    const bothHaveAuthors = authorsA.length > 0 && authorsB.length > 0;
    if (bothHaveAuthors && sharedAuthorKeys(authorsA, authorsB) === 0) {
      return false;
    }
    return true;
  }

  return false;
}

/** One distinct wanted book and every reader who wants it. */
export interface WishlistGroup {
  /** The first item seen for this book; its snapshot represents the group. */
  representative: WishlistItem;
  items: WishlistItem[];
  readerIds: string[];
}

/**
 * Groups items that refer to the same book (via {@link sameBook}) so a title wanted
 * by several readers appears once. Genuinely different books that happen to share a
 * title stay in separate groups.
 */
export function groupWishlistItems(
  items: readonly WishlistItem[],
): WishlistGroup[] {
  const groups: WishlistGroup[] = [];
  for (const item of items) {
    const group = groups.find((g) => sameBook(g.representative, item));
    if (group) {
      group.items.push(item);
      if (!group.readerIds.includes(item.readerId)) {
        group.readerIds.push(item.readerId);
      }
    } else {
      groups.push({
        representative: item,
        items: [item],
        readerIds: [item.readerId],
      });
    }
  }
  return groups;
}
