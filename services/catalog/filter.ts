import { slugify } from "../../lib/text/slug";
import type { JoinedBook, SearchParams } from "./types";

/**
 * Combinable in-memory filtering (#17, design D3/D4). The free-text query is
 * normalized with `slugify` and matched against the book's `titleKey`,
 * `authorKeys`, and ISBN; the remaining filters intersect. The reading-status
 * filter only applies with a reader. Pure.
 */

/** Digits-only form of a query, for ISBN matching. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function matchesQuery(joined: JoinedBook, qSlug: string, raw: string): boolean {
  const b = joined.book;
  if ((b.titleKey ?? "").includes(qSlug)) return true;
  if ((b.authorKeys ?? []).some((k) => k.includes(qSlug))) return true;
  const qDigits = digits(raw);
  if (qDigits) {
    if ((b.isbn13 ?? "").includes(qDigits)) return true;
    if ((b.isbn10 ?? "").includes(qDigits)) return true;
  }
  return false;
}

export function filterCatalog(
  joined: readonly JoinedBook[],
  params: SearchParams,
): JoinedBook[] {
  const qSlug = params.q?.trim() ? slugify(params.q) : "";
  return joined.filter((j) => {
    if (qSlug && !matchesQuery(j, qSlug, params.q ?? "")) return false;
    if (
      params.category &&
      !(j.book.categoryKeys ?? []).includes(params.category)
    )
      return false;
    if (params.author && !(j.book.authorKeys ?? []).includes(params.author))
      return false;
    if (params.publisher && j.book.publisher !== params.publisher) return false;
    if (params.shelf && !j.shelfIds.includes(params.shelf)) return false;
    // Reading status is reader-scoped; ignored without a reader (design D4).
    if (params.status && params.reader) {
      const statuses = j.statusByReader[params.reader] ?? [];
      if (!statuses.includes(params.status)) return false;
    }
    return true;
  });
}
