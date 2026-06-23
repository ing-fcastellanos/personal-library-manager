import { getAdminStorage } from "../../lib/firebase/admin";

/**
 * Cover re-hosting (#13, design D6). When an enriched book is *persisted*, the
 * server downloads the candidate's external cover and uploads it to Firebase
 * Storage via the Admin SDK (which bypasses `storage.rules` — no client upload
 * path is opened, #3 stays closed). The stored `Book.coverUrl` then references
 * the internal Storage URL instead of the fragile external source URL.
 *
 * This is NOT invoked on the `?q=` search path — search responses keep the
 * external preview URL and trigger no upload (design D6).
 *
 * `deps` are injectable so this can be unit-tested without real network/Storage.
 */

const COVER_PREFIX = "covers";
const DEFAULT_TIMEOUT_MS = 8000;

export interface RehostCoverDeps {
  fetchImpl?: typeof fetch;
  storage?: ReturnType<typeof getAdminStorage>;
  timeoutMs?: number;
}

/** Maps a content type to a file extension; defaults to `jpg`. */
function extensionFor(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Downloads the cover at `externalUrl` and uploads it to
 * `covers/<isbn13>.<ext>` in the default bucket, returning the internal Storage
 * URL. Returns `null` if there is no URL or the download fails (the book can
 * still be persisted without a re-hosted cover).
 */
export async function rehostCover(
  externalUrl: string | null | undefined,
  isbn13: string,
  deps: RehostCoverDeps = {},
): Promise<string | null> {
  if (!externalUrl) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetchImpl(externalUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type");
    const buffer = Buffer.from(await res.arrayBuffer());

    const storage = deps.storage ?? getAdminStorage();
    const bucket = storage.bucket();
    const path = `${COVER_PREFIX}/${isbn13}.${extensionFor(contentType)}`;
    const file = bucket.file(path);
    await file.save(buffer, {
      contentType: contentType ?? "image/jpeg",
      resumable: false,
    });

    return `https://storage.googleapis.com/${bucket.name}/${path}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
