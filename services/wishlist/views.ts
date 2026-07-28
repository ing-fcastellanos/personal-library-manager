import { slugify, arraySlugs } from "../../lib/text/slug";
import type {
  WishlistItem,
  WishlistPriority,
} from "../../lib/types/wishlist-item";
import type { ReadingEvent } from "../../lib/types/reading-event";
import type { Copy } from "../../lib/types/copy";
import type { Book } from "../../lib/types/book";
import { sameBook, groupWishlistItems, type WishlistGroup } from "./match";

/**
 * Derived wishlist views (#37, design D3/D4). Pure in-memory joins over the
 * household-scale dataset — the same approach `services/catalog` takes. Both lists
 * are computed, never stored, so they self-maintain: an item leaves the buy list
 * when a copy exists, and leaves the want-to-read list when the reader resolves it.
 */

/**
 * Reading statuses that resolve a wish and drop it from the want-to-read list.
 *
 * Settles the design.md open question: `finished` and `abandoned` are both terminal
 * for "want to read" — the reader has dealt with the book — so both remove it.
 * `reading` is active progress and keeps the item visible (a UI may highlight it).
 */
const RESOLVED_STATUSES: ReadonlySet<ReadingEvent["status"]> = new Set([
  "finished",
  "abandoned",
]);

const PRIORITY_RANK: Record<WishlistPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

/** A wishlist item projected to the shape {@link sameBook} compares on. */
function itemRef(item: WishlistItem) {
  return {
    bookId: item.bookId ?? null,
    isbn13: item.isbn13 ?? null,
    titleKey: item.titleKey ?? null,
    authorKeys: item.authorKeys ?? [],
  };
}

/**
 * Whether the household owns the book an item refers to: its `bookId` has a copy,
 * or — for a loose item — it matches (by ISBN/title) a book that has a copy. Shared
 * by {@link wantToBuy} and the "En casa" badge so both read ownership identically.
 */
export function isOwned(
  item: WishlistItem,
  copies: readonly Copy[],
  books: readonly Book[] = [],
): boolean {
  const ownedBookIds = new Set(copies.map((c) => c.bookId));
  if (item.bookId && ownedBookIds.has(item.bookId)) return true;
  const ref = itemRef(item);
  return books
    .filter((b) => ownedBookIds.has(b.id))
    .some((b) =>
      sameBook(ref, {
        bookId: b.id,
        isbn13: b.isbn13 ?? null,
        titleKey: b.titleKey ?? (slugify(b.title) || null),
        authorKeys: b.authorKeys ?? [],
      }),
    );
}

/** A reading event projected to the same comparable shape (it has no stored keys). */
function eventRef(event: ReadingEvent) {
  return {
    bookId: event.bookId ?? null,
    isbn13: event.isbn13 ?? null,
    titleKey: slugify(event.bookTitle) || null,
    authorKeys: arraySlugs(event.bookAuthors),
  };
}

/** High priority first, then most recently added. */
function byPriorityThenRecency(a: WishlistItem, b: WishlistItem): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

/**
 * The reader's "quiero leer" list: their `wanted` items minus any whose book they
 * have already resolved (finished or abandoned). Matching uses {@link sameBook} so
 * items with a null `bookId` are still recognised via ISBN or title+author keys.
 */
export function wantToReadFor(
  readerId: string,
  items: readonly WishlistItem[],
  events: readonly ReadingEvent[],
): WishlistItem[] {
  const resolved = events
    .filter((e) => e.readerId === readerId && RESOLVED_STATUSES.has(e.status))
    .map(eventRef);

  return items
    .filter((item) => item.readerId === readerId && item.status === "wanted")
    .filter((item) => {
      const ref = itemRef(item);
      return !resolved.some((r) => sameBook(ref, r));
    })
    .sort(byPriorityThenRecency);
}

/** One grouped buy-list entry, ordered so the group's highest priority leads. */
export interface BuyListGroup extends WishlistGroup {
  priority: WishlistPriority;
}

/**
 * The household "quiero comprar" list: every reader's `wanted` items for books the
 * household does not own, grouped so a book wanted by several readers appears once.
 * Ownership is derived from the existence of a copy (design D3): an item is owned
 * when its `bookId` has a copy, OR — for a loose item with no `bookId` — when it
 * matches an owned book by ISBN/title via {@link sameBook}. The `books` argument
 * supplies the snapshots needed for that match; without it, only `bookId`-linked
 * ownership is detected (so two readers' loose wishes for a book one of them just
 * bought would both correctly leave the list once `books` is provided).
 */
export function wantToBuy(
  items: readonly WishlistItem[],
  copies: readonly Copy[],
  books: readonly Book[] = [],
): BuyListGroup[] {
  const unowned = items.filter(
    (item) => item.status === "wanted" && !isOwned(item, copies, books),
  );

  return groupWishlistItems(unowned)
    .map((group) => {
      const priority = group.items
        .map((i) => i.priority)
        .reduce((best, p) =>
          PRIORITY_RANK[p] < PRIORITY_RANK[best] ? p : best,
        );
      return { ...group, priority };
    })
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        b.representative.createdAt.localeCompare(a.representative.createdAt),
    );
}
