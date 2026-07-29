import { listBooks } from "../books/repository";
import { listCopies } from "../copies/repository";
import { listReadingEvents } from "../reading-events/repository";
import { listShelves } from "../shelves/repository";
import { listLoans } from "../loans/repository";
import { joinCatalog } from "./join";
import { filterCatalog } from "./filter";
import { sortCatalog } from "./sort";
import { computeFacets } from "./facets";
import type { SearchParams, SearchResult } from "./types";

/**
 * Catalog search orchestration (#17, design D1; #39, design D8). Loads the
 * household-scale dataset (books + copies + readingEvents + shelves + loans),
 * joins it, then filters/sorts/paginates and computes facets — all in memory.
 * Repository loaders are injectable for network-free tests.
 */

export interface CatalogDeps {
  loadBooks?: typeof listBooks;
  loadCopies?: typeof listCopies;
  loadEvents?: typeof listReadingEvents;
  loadShelves?: typeof listShelves;
  loadLoans?: typeof listLoans;
}

const DEFAULT_LIMIT = 24;

export async function searchCatalog(
  params: SearchParams,
  deps: CatalogDeps = {},
): Promise<SearchResult> {
  const [books, copies, events, shelves, loans] = await Promise.all([
    (deps.loadBooks ?? listBooks)(),
    (deps.loadCopies ?? listCopies)(),
    (deps.loadEvents ?? listReadingEvents)(),
    (deps.loadShelves ?? listShelves)(),
    (deps.loadLoans ?? listLoans)(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const joined = joinCatalog(books, copies, events, loans, today);
  const filtered = filterCatalog(joined, params);
  const sorted = sortCatalog(filtered, params.sort ?? "title");

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
  const start = (page - 1) * limit;
  const items = sorted
    .slice(start, start + limit)
    .map((j) => ({ ...j.book, loanState: j.loanState }));

  return {
    items,
    total: sorted.length,
    page,
    // Facets reflect the whole catalog so the panel never empties (design D5).
    facets: computeFacets(joined, shelves),
  };
}
