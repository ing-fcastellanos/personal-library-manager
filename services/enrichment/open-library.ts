import {
  normalizeOpenLibrary,
  normalizeOpenLibrarySearchDoc,
  type OpenLibraryRecord,
  type OpenLibrarySearchDoc,
} from "./normalize";
import type { Candidate } from "./types";

/**
 * Open Library API client (#13, complement/fallback source — design D2). The
 * `jscmd=data` Books API returns author names, publishers, and cover URLs in a
 * single request (covers also available via covers.openlibrary.org). No API key
 * required. The caller handles caching (D5) and graceful degradation.
 *
 * `fetchImpl` is injectable for network-free orchestration and tests.
 */

const OPEN_LIBRARY_BOOKS_URL = "https://openlibrary.org/api/books";
const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const SEARCH_MAX_RESULTS = 10;
const DEFAULT_TIMEOUT_MS = 5000;

export interface OpenLibraryOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

type OpenLibraryBooksResponse = Record<string, OpenLibraryRecord>;

/** Looks up a single candidate by ISBN-13. Returns `null` if none is found. */
export async function openLibraryByIsbn(
  isbn13: string,
  options: OpenLibraryOptions = {},
): Promise<Candidate | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const bibkey = `ISBN:${isbn13}`;
    const url = `${OPEN_LIBRARY_BOOKS_URL}?bibkeys=${encodeURIComponent(bibkey)}&format=json&jscmd=data`;
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open Library responded ${res.status}`);
    }
    const body = (await res.json()) as OpenLibraryBooksResponse;
    return normalizeOpenLibrary(body[bibkey]);
  } finally {
    clearTimeout(timer);
  }
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[];
}

/**
 * Free-text search via `search.json`. Used as the text-search fallback when
 * Google Books returns nothing (#20). Returns all normalizable candidates
 * (unranked); the caller ranks and caps them.
 */
export async function openLibrarySearch(
  query: string,
  options: OpenLibraryOptions = {},
): Promise<Candidate[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const fields =
      "title,author_name,first_publish_year,isbn,cover_i,publisher,number_of_pages_median,language";
    const url = `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${SEARCH_MAX_RESULTS}&fields=${fields}`;
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open Library responded ${res.status}`);
    }
    const body = (await res.json()) as OpenLibrarySearchResponse;
    return (body.docs ?? [])
      .map((doc) => normalizeOpenLibrarySearchDoc(doc))
      .filter((c): c is Candidate => c != null);
  } finally {
    clearTimeout(timer);
  }
}
