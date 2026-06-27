import { Router } from "express";
import { z } from "zod";
import { identifyBooksFromImage } from "../../services/ai/service";
import { NoEngineAvailableError } from "../../services/ai/types";
import { requireAuth } from "../middleware/require-auth";

/**
 * Shelf identification API (#21a, server-mediated — ADR-0009). Takes a base64
 * photo of a whole shelf, runs AI multi-book identification (#19), and returns the
 * identified books. Per-book enrichment and duplicate detection are driven by the
 * client (21b) so the UI can show real progress and reuse `/api/enrich` +
 * `/api/books/duplicates`. Auth-gated (a paid AI call). The elevated JSON body
 * limit for this path is configured in `server/index.ts`.
 *
 *   POST /api/ai/identify-shelf  { imageBase64, contentType }
 */
const router = Router();

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB (matches the route's JSON limit)

const shelfSchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

router.post("/ai/identify-shelf", requireAuth, async (req, res) => {
  const parsed = shelfSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  const { imageBase64, contentType } = parsed.data;

  if (!ALLOWED_TYPES.has(contentType)) {
    return res.status(400).json({ error: "unsupported content type" });
  }
  const bytes = Buffer.from(imageBase64, "base64").length;
  if (bytes === 0) return res.status(400).json({ error: "empty image" });
  if (bytes > MAX_BYTES) {
    return res.status(400).json({ error: "image too large" });
  }

  try {
    const books = await identifyBooksFromImage({
      base64: imageBase64,
      mimeType: contentType,
    });
    res.json({ books, sourceProvider: books[0]?.sourceProvider ?? null });
  } catch (err) {
    if (err instanceof NoEngineAvailableError) {
      return res.status(503).json({ error: "no AI engine available" });
    }
    res.status(500).json({ error: "internal" });
  }
});

export default router;
