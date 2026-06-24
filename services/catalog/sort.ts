import type { CatalogSort, JoinedBook } from "./types";

/**
 * Deterministic in-memory ordering (#17, design D6). Title/author ascending,
 * year/addedAt descending (newest first), with a stable id tie-break. Pure.
 */
function comparator(
  sort: CatalogSort,
): (a: JoinedBook, b: JoinedBook) => number {
  switch (sort) {
    case "year":
      return (a, b) =>
        (b.book.publishedYear ?? 0) - (a.book.publishedYear ?? 0);
    case "author":
      return (a, b) =>
        (a.book.authorKeys?.[0] ?? "").localeCompare(
          b.book.authorKeys?.[0] ?? "",
        );
    case "addedAt":
      return (a, b) => b.book.createdAt.localeCompare(a.book.createdAt);
    case "title":
    default:
      return (a, b) =>
        (a.book.titleKey ?? "").localeCompare(b.book.titleKey ?? "");
  }
}

export function sortCatalog(
  joined: readonly JoinedBook[],
  sort: CatalogSort,
): JoinedBook[] {
  const cmp = comparator(sort);
  return [...joined].sort(
    (a, b) => cmp(a, b) || a.book.id.localeCompare(b.book.id),
  );
}
