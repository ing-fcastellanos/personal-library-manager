import { Router } from "express";
import { z } from "zod";
import { identifyAndEnrich } from "../../services/ai/identify";
import { NoEngineAvailableError } from "../../services/ai/types";
import { requireAuth } from "../middleware/require-auth";

/**
 * Photo identification API (#20, server-mediated — ADR-0009). Takes a base64
 * photo of a book, runs AI identification (#19) + server-side enrichment (#13),
 * and returns a best candidate plus ranked alternatives for the reader to confirm.
 * Auth-gated (a paid AI call). The elevated JSON body limit for this path is
 * configured in `server/index.ts`.
 *
 *   POST /api/ai/identify  { imageBase64, contentType }
 */
const router = Router();

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB (matches the route's JSON limit)

const identifySchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

router.post("/ai/identify", requireAuth, async (req, res) => {
  const parsed = identifySchema.safeParse(req.body);
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
  if (bytes > MAX_BYTES)
    return res.status(400).json({ error: "image too large" });

  try {
    const result = await identifyAndEnrich({
      base64: imageBase64,
      mimeType: contentType,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof NoEngineAvailableError) {
      return res.status(503).json({ error: "no AI engine available" });
    }
    res.status(500).json({ error: "internal" });
  }
});

export default router;
