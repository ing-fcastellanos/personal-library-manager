import sharp from "sharp";

const MAX_WIDTH = 600;
const WEBP_QUALITY = 80;

/**
 * Cover image normalization (#50), shared by `uploadCover` and `rehostCover` —
 * the two places that write to `covers/` in Storage. Resizes to a 600px max
 * width (aspect ratio preserved, never upscaled — `withoutEnlargement`) and
 * always re-encodes to WebP, regardless of the input format.
 *
 * Lets `sharp`'s decode error propagate uncaught for an undecodable buffer —
 * each caller maps that to its own existing failure semantics (a validation
 * error for a direct upload, a silent `null` for a best-effort re-host).
 */
export async function normalizeCoverImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
