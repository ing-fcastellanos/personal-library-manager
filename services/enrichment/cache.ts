import { getAdminFirestore } from "../../lib/firebase/admin";
import { slugify } from "../../lib/text/slug";
import type { Candidate } from "./types";

/**
 * Enrichment cache repository (#13, design D5). Caches normalized results in the
 * `enrichmentCache` collection keyed by a normalized key (`isbn:<isbn13>` or
 * `q:<slug>`) so repeated lookups avoid hitting the external sources. Negative
 * results (no candidates) are cached too, with a short TTL, so repeated misses
 * don't re-query the sources.
 *
 * Expiry is enforced in-code via `expiresAt` (lazy expiry): a `enrichmentCache`
 * Firestore TTL policy on `expiresAt` can be added as infra to reclaim storage,
 * but is not required for correctness and needs no composite index (reads are by
 * document id).
 */

const COLLECTION = "enrichmentCache";

/** TTLs (ms): canonical ISBN hits rarely change; misses expire quickly. */
export const ISBN_HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SEARCH_HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface CacheDoc {
  candidates: Candidate[];
  cachedAt: string;
  expiresAt: string;
}

function collection() {
  return getAdminFirestore().collection(COLLECTION);
}

/** Cache key for an ISBN lookup. */
export function isbnKey(isbn13: string): string {
  return `isbn:${isbn13}`;
}

/** Cache key for a free-text search, normalized so equivalent queries collide. */
export function queryKey(query: string): string {
  return `q:${slugify(query)}`;
}

/**
 * Reads a cache entry. Returns the cached candidates (possibly an empty array for
 * a cached negative result) when a non-expired entry exists, or `null` when there
 * is no entry or it has expired — signalling the caller to re-query the sources.
 */
export async function readCache(key: string): Promise<Candidate[] | null> {
  const doc = await collection().doc(key).get();
  if (!doc.exists) return null;
  const data = doc.data() as CacheDoc;
  if (new Date(data.expiresAt).getTime() <= Date.now()) return null;
  return data.candidates ?? [];
}

/** Writes (or overwrites) a cache entry with an expiry `ttlMs` in the future. */
export async function writeCache(
  key: string,
  candidates: Candidate[],
  ttlMs: number,
): Promise<void> {
  const now = Date.now();
  const entry: CacheDoc = {
    candidates,
    cachedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  await collection().doc(key).set(entry);
}
