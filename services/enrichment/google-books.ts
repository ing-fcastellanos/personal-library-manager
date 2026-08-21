import { normalizeGoogleVolume, type GoogleVolumeInfo } from "./normalize";
import type { Candidate } from "./types";

/**
 * Google Books API client (#13, primary source — design D2). No API key is
 * required for the volume search endpoint. The caller is responsible for caching
 * (design D5) and for degrading gracefully when this client throws.
 *
 * `fetchImpl` is injectable so the orchestration and tests can run without real
 * network access.
 */

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const DEFAULT_TIMEOUT_MS = 5000;
const SEARCH_MAX_RESULTS = 10;

export interface GoogleBooksOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Thrown when Google Books responds `429` (quota exceeded) — distinct from other
 * failures so the orchestration layer can retry it and only it (design D1).
 */
export class GoogleBooksRateLimitError extends Error {
  constructor() {
    super("Google Books responded 429 (rate limited)");
    this.name = "GoogleBooksRateLimitError";
  }
}

interface GoogleVolumesResponse {
  items?: { volumeInfo?: GoogleVolumeInfo }[];
}

async function fetchVolumes(
  query: string,
  options: GoogleBooksOptions,
): Promise<GoogleVolumeInfo[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    // An optional API key lifts the strict anonymous quota and improves
    // reliability (#20); the endpoint works without one when unset.
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=${SEARCH_MAX_RESULTS}${keyParam}`;
    const res = await fetchImpl(url, { signal: controller.signal });
    if (res.status === 429) {
      throw new GoogleBooksRateLimitError();
    }
    if (!res.ok) {
      throw new Error(`Google Books responded ${res.status}`);
    }
    const body = (await res.json()) as GoogleVolumesResponse;
    return (body.items ?? [])
      .map((item) => item.volumeInfo)
      .filter((info): info is GoogleVolumeInfo => info != null);
  } finally {
    clearTimeout(timer);
  }
}

/** Looks up a single canonical candidate by ISBN-13. Returns `null` if none. */
export async function googleBooksByIsbn(
  isbn13: string,
  options: GoogleBooksOptions = {},
): Promise<Candidate | null> {
  const volumes = await fetchVolumes(`isbn:${isbn13}`, options);
  for (const info of volumes) {
    const candidate = normalizeGoogleVolume(info);
    if (candidate) return candidate;
  }
  return null;
}

/** Searches by free text and returns all normalizable candidates (unranked). */
export async function googleBooksSearch(
  query: string,
  options: GoogleBooksOptions = {},
): Promise<Candidate[]> {
  const volumes = await fetchVolumes(query, options);
  return volumes
    .map((info) => normalizeGoogleVolume(info))
    .filter((c): c is Candidate => c != null);
}

/** Quotes a field-restricted query part, stripping embedded `"` so a user-typed
 * value (e.g. a publisher name) can never break out of the query structure. */
function quoteField(field: string, value: string): string {
  const cleaned = value.replace(/"/g, "").trim();
  return `${field}:"${cleaned}"`;
}

/**
 * Builds a Google Books query restricted to the given fields (`intitle:`/
 * `inauthor:`/`inpublisher:`), omitting any part that isn't provided.
 */
export function fieldRestrictedQuery(parts: {
  title?: string;
  author?: string;
  publisher?: string;
}): string {
  const segments: string[] = [];
  if (parts.title) segments.push(quoteField("intitle", parts.title));
  if (parts.author) segments.push(quoteField("inauthor", parts.author));
  if (parts.publisher)
    segments.push(quoteField("inpublisher", parts.publisher));
  return segments.join(" ");
}

/**
 * Searches for editions of `title` from a specific `publisher` (optionally
 * narrowed by the first author), returning every normalizable candidate
 * (unranked — the caller ranks/truncates).
 */
export async function googleBooksSearchByPublisher(
  title: string,
  authors: readonly string[],
  publisher: string,
  options: GoogleBooksOptions = {},
): Promise<Candidate[]> {
  const query = fieldRestrictedQuery({
    title,
    author: authors[0],
    publisher,
  });
  const volumes = await fetchVolumes(query, options);
  return volumes
    .map((info) => normalizeGoogleVolume(info))
    .filter((c): c is Candidate => c != null);
}
