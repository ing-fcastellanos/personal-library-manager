import { listBooks } from "../books/repository";
import { listCopies } from "../copies/repository";
import { listReadingEvents } from "../reading-events/repository";
import { listShelves } from "../shelves/repository";
import { joinCatalog } from "./join";
import { filterCatalog } from "./filter";
import { sortCatalog } from "./sort";
import { computeFacets } from "./facets";
import type { SearchParams, SearchResult } from "./types";

/**
 * Catalog search orchestration (#17, design D1). Loads the household-scale
 * dataset (books + copies + readingEvents + shelves), joins it, then
 * filters/sorts/paginates and computes facets — all in memory. Repository
 * loaders are injectable for network-free tests.
 */

export interface CatalogDeps {
  loadBooks?: typeof listBooks;
  loadCopies?: typeof listCopies;
  loadEvents?: typeof listReadingEvents;
  loadShelves?: typeof listShelves;
}

const DEFAULT_LIMIT = 24;

export async function searchCatalog(
  params: SearchParams,
  deps: CatalogDeps = {},
): Promise<SearchResult> {
  const [books, copies, events, shelves] = await Promise.all([
    (deps.loadBooks ?? listBooks)(),
    (deps.loadCopies ?? listCopies)(),
    (deps.loadEvents ?? listReadingEvents)(),
    (deps.loadShelves ?? listShelves)(),
  ]);

  const joined = joinCatalog(books, copies, events);
  const filtered = filterCatalog(joined, params);
  const sorted = sortCatalog(filtered, params.sort ?? "title");

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit).map((j) => j.book);

  return {
    items,
    total: sorted.length,
    page,
    // Facets reflect the whole catalog so the panel never empties (design D5).
    facets: computeFacets(joined, shelves),
  };
}
