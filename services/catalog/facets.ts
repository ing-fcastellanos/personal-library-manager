import type { Shelf } from "../../lib/types/shelf";
import type { Facets, FacetValue, JoinedBook } from "./types";

/**
 * Computes the available facet values with counts (#17, design D5) so the filter
 * panel populates itself. Facets are over the whole dataset (not the filtered
 * subset) to avoid a panel that empties out. Pure.
 */

/** Accumulates value→{label,count}, preserving the first-seen label. */
class FacetBuilder {
  private readonly map = new Map<string, { label: string; count: number }>();
  add(value: string, label: string) {
    const entry = this.map.get(value);
    if (entry) entry.count += 1;
    else this.map.set(value, { label, count: 1 });
  }
  build(): FacetValue[] {
    return [...this.map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }
}

export function computeFacets(
  joined: readonly JoinedBook[],
  shelves: readonly Shelf[],
): Facets {
  const shelfNames = new Map(shelves.map((s) => [s.id, s.name]));
  const categories = new FacetBuilder();
  const authors = new FacetBuilder();
  const publishers = new FacetBuilder();
  const shelfFacet = new FacetBuilder();

  for (const { book, shelfIds } of joined) {
    const catKeys = book.categoryKeys ?? [];
    catKeys.forEach((key, i) =>
      categories.add(key, book.categories?.[i] ?? key),
    );
    const authorKeys = book.authorKeys ?? [];
    authorKeys.forEach((key, i) => authors.add(key, book.authors?.[i] ?? key));
    if (book.publisher) publishers.add(book.publisher, book.publisher);
    for (const shelfId of shelfIds) {
      shelfFacet.add(shelfId, shelfNames.get(shelfId) ?? shelfId);
    }
  }

  return {
    categories: categories.build(),
    authors: authors.build(),
    publishers: publishers.build(),
    shelves: shelfFacet.build(),
  };
}
