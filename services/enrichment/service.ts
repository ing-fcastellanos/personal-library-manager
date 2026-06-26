import { googleBooksByIsbn, googleBooksSearch } from "./google-books";
import { openLibraryByIsbn, openLibrarySearch } from "./open-library";
import { mergeCandidates } from "./merge";
import { rankCandidates } from "./rank";
import { toIsbn13 } from "./normalize";
import {
  readCache,
  writeCache,
  isbnKey,
  queryKey,
  ISBN_HIT_TTL_MS,
  SEARCH_HIT_TTL_MS,
  NEGATIVE_TTL_MS,
} from "./cache";
import type { Candidate } from "./types";

/**
 * Enrichment orchestration (#13). Exposes the two read paths consumed by
 * `GET /api/enrich` and (later) the AI flow of M3:
 *
 * - `enrichByIsbn` — canonical lookup, Google Books primary + Open Library
 *   complement, merged into at most one candidate (design D1/D2).
 * - `searchByText` — Google Books free-text search, falling back to Open Library
 *   search when Google Books returns nothing (#20), deterministically ranked to
 *   the top 5 (design D1/D4).
 *
 * Both consult the cache first (design D5) and degrade gracefully: a failing
 * source is treated as "no result" so a single source can still satisfy the
 * request. Sources are injectable via `deps` for network-free tests.
 */

export interface EnrichDeps {
  googleByIsbn?: typeof googleBooksByIsbn;
  openByIsbn?: typeof openLibraryByIsbn;
  googleSearch?: typeof googleBooksSearch;
  openSearch?: typeof openLibrarySearch;
}

const SEARCH_LIMIT = 5;

/** Runs a source call, returning `null` on any failure (graceful degradation). */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * Resolves canonical metadata for an ISBN. Returns `null` when the ISBN is
 * unusable or no source recognizes it (the route maps `null` to a 200 empty
 * result). Caches both hits (long TTL) and misses (short TTL).
 */
export async function enrichByIsbn(
  rawIsbn: string,
  deps: EnrichDeps = {},
): Promise<Candidate | null> {
  const isbn13 = toIsbn13(rawIsbn);
  if (!isbn13) return null;

  const key = isbnKey(isbn13);
  const cached = await readCache(key);
  if (cached !== null) return cached[0] ?? null;

  const googleByIsbn = deps.googleByIsbn ?? googleBooksByIsbn;
  const openByIsbn = deps.openByIsbn ?? openLibraryByIsbn;
  const [gb, ol] = await Promise.all([
    safe(() => googleByIsbn(isbn13)),
    safe(() => openByIsbn(isbn13)),
  ]);

  const merged = mergeCandidates(gb, ol);
  await writeCache(
    key,
    merged ? [merged] : [],
    merged ? ISBN_HIT_TTL_MS : NEGATIVE_TTL_MS,
  );
  return merged;
}

/**
 * Resolves ranked candidates for a free-text title/author query (top 5). Caches
 * both ranked hits and empty results.
 */
export async function searchByText(
  query: string,
  deps: EnrichDeps = {},
): Promise<Candidate[]> {
  const key = queryKey(query);
  const cached = await readCache(key);
  if (cached !== null) return cached;

  const googleSearch = deps.googleSearch ?? googleBooksSearch;
  let found = (await safe(() => googleSearch(query))) ?? [];
  if (found.length === 0) {
    // Google Books returned nothing (or failed) — fall back to Open Library
    // search so a flaky/unavailable Google Books doesn't break text lookup (#20).
    const openSearch = deps.openSearch ?? openLibrarySearch;
    found = (await safe(() => openSearch(query))) ?? [];
  }
  const ranked = rankCandidates(query, found, SEARCH_LIMIT);

  await writeCache(
    key,
    ranked,
    ranked.length ? SEARCH_HIT_TTL_MS : NEGATIVE_TTL_MS,
  );
  return ranked;
}
