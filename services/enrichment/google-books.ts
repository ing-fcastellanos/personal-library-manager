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
