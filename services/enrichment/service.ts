import {
  googleBooksByIsbn,
  googleBooksSearch,
  GoogleBooksRateLimitError,
} from "./google-books";
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
  /** Backoff sleep, injectable so retry tests run without real waits. */
  delayImpl?: (ms: number) => Promise<void>;
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

/** Backoff delays (ms) between the 2 retries a rate-limited call gets (design D3). */
const RATE_LIMIT_RETRY_DELAYS_MS = [500, 1500];

async function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` on `GoogleBooksRateLimitError` with backoff, up to
 * `RATE_LIMIT_RETRY_DELAYS_MS.length` extra attempts. Any other error propagates
 * immediately — only a real 429 is worth waiting out (design D5).
 */
async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  delayImpl: (ms: number) => Promise<void>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (
        !(err instanceof GoogleBooksRateLimitError) ||
        attempt >= RATE_LIMIT_RETRY_DELAYS_MS.length
      ) {
        throw err;
      }
      await delayImpl(RATE_LIMIT_RETRY_DELAYS_MS[attempt]);
    }
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
  const delayImpl = deps.delayImpl ?? defaultDelay;
  const [gb, ol] = await Promise.all([
    safe(() => withRateLimitRetry(() => googleByIsbn(isbn13), delayImpl)),
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
  const delayImpl = deps.delayImpl ?? defaultDelay;
  let found =
    (await safe(() =>
      withRateLimitRetry(() => googleSearch(query), delayImpl),
    )) ?? [];
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
