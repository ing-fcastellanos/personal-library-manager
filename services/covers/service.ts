import { randomUUID } from "node:crypto";
import { getAdminStorage, storageObjectUrl } from "../../lib/firebase/admin";
import { normalizeCoverImage } from "./normalize";

/**
 * User cover upload (#15, design D4). Validates and stores a reader-supplied cover
 * image in Firebase Storage via the Admin SDK (server-mediated — `storage.rules`
 * stays closed, #3 untouched). Resized and normalized to WebP before storing (#50).
 * The Storage client is injectable for tests.
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const COVER_PREFIX = "covers";
const OUTPUT_CONTENT_TYPE = "image/webp";

/** Thrown on an unsupported type, oversized, or undecodable image; routes map this to a 400. */
export class CoverValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoverValidationError";
  }
}

export interface UploadCoverDeps {
  storage?: ReturnType<typeof getAdminStorage>;
}

/**
 * Uploads a base64 image as the book's cover at `covers/<bookId>.webp` (replacing
 * any previous one) and returns its internal Storage URL. Throws
 * `CoverValidationError` for a non-image type, an image larger than 5 MB, or bytes
 * that can't be decoded as an image.
 */
export async function uploadCover(
  bookId: string,
  imageBase64: string,
  contentType: string,
  deps: UploadCoverDeps = {},
): Promise<string> {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new CoverValidationError("unsupported content type");
  }
  const buffer = Buffer.from(imageBase64, "base64");
  if (buffer.length === 0) {
    throw new CoverValidationError("empty image");
  }
  if (buffer.length > MAX_BYTES) {
    throw new CoverValidationError("image too large");
  }

  let normalized: Buffer;
  try {
    normalized = await normalizeCoverImage(buffer);
  } catch {
    throw new CoverValidationError("undecodable image");
  }

  const storage = deps.storage ?? getAdminStorage();
  const bucket = storage.bucket();
  const path = `${COVER_PREFIX}/${bookId}.webp`;
  const token = randomUUID();
  await bucket.file(path).save(normalized, {
    contentType: OUTPUT_CONTENT_TYPE,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return storageObjectUrl(bucket.name, path, token);
}
