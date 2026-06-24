import { Router } from "express";
import { z } from "zod";
import { getBook, updateBook } from "../../services/books/repository";
import {
  uploadCover,
  CoverValidationError,
} from "../../services/covers/service";
import { recordChange } from "../../services/audit/repository";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";

/**
 * User cover upload API (#15, server-mediated — ADR-0009). Replaces a book's
 * cover with a reader-supplied image, stored via the Admin SDK and marked
 * `coverSource: "user"` so re-enrichment won't overwrite it (design D4/D5). The
 * elevated JSON body limit for this path is configured in `server/index.ts`.
 *
 *   POST /api/books/:id/cover  { imageBase64, contentType }
 */
const router = Router();

const coverSchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

router.post("/books/:id/cover", requireAuth, async (req, res) => {
  const parsed = coverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  const id = req.params.id as string;
  try {
    const existing = await getBook(id);
    if (!existing) return res.status(404).json({ error: "not found" });

    const coverUrl = await uploadCover(
      id,
      parsed.data.imageBase64,
      parsed.data.contentType,
    );
    await updateBook(id, { coverUrl, coverSource: "user" });
    await recordChange({
      entity: "book",
      entityId: id,
      changedFields: ["coverUrl", "coverSource"],
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json({ coverUrl });
  } catch (err) {
    if (err instanceof CoverValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "internal" });
  }
});

export default router;
