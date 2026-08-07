import { randomUUID } from "node:crypto";
import { getAdminStorage, storageObjectUrl } from "../../lib/firebase/admin";
import { normalizeCoverImage } from "../covers/normalize";

/**
 * Cover re-hosting (#13, design D6). When an enriched book is *persisted*, the
 * server downloads the candidate's external cover and uploads it to Firebase
 * Storage via the Admin SDK (which bypasses `storage.rules` — no client upload
 * path is opened, #3 stays closed). The stored `Book.coverUrl` then references
 * the internal Storage URL instead of the fragile external source URL. Resized
 * and normalized to WebP before storing (#50) — a source image that can't be
 * decoded falls into the same "no re-hosted cover" outcome as a download
 * failure, since it's normalized inside the same try/catch.
 *
 * This is NOT invoked on the `?q=` search path — search responses keep the
 * external preview URL and trigger no upload (design D6).
 *
 * `deps` are injectable so this can be unit-tested without real network/Storage.
 */

const COVER_PREFIX = "covers";
const DEFAULT_TIMEOUT_MS = 8000;
const OUTPUT_CONTENT_TYPE = "image/webp";

export interface RehostCoverDeps {
  fetchImpl?: typeof fetch;
  storage?: ReturnType<typeof getAdminStorage>;
  timeoutMs?: number;
}

/**
 * Downloads the cover at `externalUrl` and uploads it to
 * `covers/<isbn13>.webp` in the default bucket, returning the internal Storage
 * URL. Returns `null` if there is no URL, the download fails, or the
 * downloaded bytes can't be decoded as an image (the book can still be
 * persisted without a re-hosted cover).
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
    const buffer = Buffer.from(await res.arrayBuffer());
    const normalized = await normalizeCoverImage(buffer);

    const storage = deps.storage ?? getAdminStorage();
    const bucket = storage.bucket();
    const path = `${COVER_PREFIX}/${isbn13}.webp`;
    const file = bucket.file(path);
    const token = randomUUID();
    await file.save(normalized, {
      contentType: OUTPUT_CONTENT_TYPE,
      resumable: false,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    return storageObjectUrl(bucket.name, path, token);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
