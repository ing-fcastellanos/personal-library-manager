import type { DuplicateResult } from "@/services/duplicates/types";

/**
 * Shared "add to wishlist" helpers (#37). One definition of how the entry points
 * (manual, ISBN, photo/AI, catalog detail) create an item and run the non-blocking
 * "already owned" pre-check, so every surface behaves identically.
 */

export type WishAddedVia = "manual" | "isbn" | "ai" | "catalog";

/** The book snapshot an entry point has resolved (title required, rest optional). */
export interface WishSnapshot {
  bookTitle: string;
  bookAuthors?: string[];
  isbn13?: string | null;
  coverUrl?: string | null;
}

/** An existing catalog book the household already owns, for the owned-warning. */
export interface OwnedMatch {
  title: string;
  copies: number;
}

/** Creates a wishlist item. Returns whether it was created (never throws). */
export async function createWishItem(input: {
  readerId: string;
  addedVia: WishAddedVia;
  snapshot: WishSnapshot;
  bookId?: string | null;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/wishlist-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        readerId: input.readerId,
        addedVia: input.addedVia,
        bookId: input.bookId ?? null,
        bookTitle: input.snapshot.bookTitle,
        bookAuthors: input.snapshot.bookAuthors ?? [],
        isbn13: input.snapshot.isbn13 ?? null,
        coverUrl: input.snapshot.coverUrl ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Runs the existing duplicate pre-check (`/api/books/duplicates`, #16) and returns
 * the first match the household already owns a copy of — or `null`. Never throws; a
 * failed check resolves to `null` so it can never block the add.
 */
export async function checkOwned(
  snapshot: WishSnapshot,
): Promise<OwnedMatch | null> {
  try {
    const params = new URLSearchParams();
    if (snapshot.isbn13?.trim()) params.set("isbn", snapshot.isbn13.trim());
    if (snapshot.bookTitle.trim())
      params.set("title", snapshot.bookTitle.trim());
    for (const a of snapshot.bookAuthors ?? []) {
      if (a.trim()) params.append("authors", a.trim());
    }
    if (![...params.keys()].length) return null;
    const res = await fetch(`/api/books/duplicates?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as DuplicateResult;
    const owned = data.matches.find((m) => m.existingCopies > 0);
    return owned
      ? { title: owned.book.title, copies: owned.existingCopies }
      : null;
  } catch {
    return null;
  }
}
