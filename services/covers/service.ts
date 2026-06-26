import { getAdminStorage, storageObjectUrl } from "../../lib/firebase/admin";

/**
 * User cover upload (#15, design D4). Validates and stores a reader-supplied cover
 * image in Firebase Storage via the Admin SDK (server-mediated — `storage.rules`
 * stays closed, #3 untouched). Accepts the image as-is; resize/normalization is
 * deferred (#50). The Storage client is injectable for tests.
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const COVER_PREFIX = "covers";

/** Thrown on an unsupported type or oversized image; routes map this to a 400. */
export class CoverValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoverValidationError";
  }
}

export interface UploadCoverDeps {
  storage?: ReturnType<typeof getAdminStorage>;
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/**
 * Uploads a base64 image as the book's cover at `covers/<bookId>.<ext>` (replacing
 * any previous one) and returns its internal Storage URL. Throws
 * `CoverValidationError` for a non-image type or an image larger than 5 MB.
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

  const storage = deps.storage ?? getAdminStorage();
  const bucket = storage.bucket();
  const path = `${COVER_PREFIX}/${bookId}.${extensionFor(contentType)}`;
  await bucket.file(path).save(buffer, { contentType, resumable: false });
  return storageObjectUrl(bucket.name, path);
}
