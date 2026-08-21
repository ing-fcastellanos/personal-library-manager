import { Router } from "express";
import { z } from "zod";
import { getBook, updateBook } from "../../services/books/repository";
import {
  uploadCover,
  CoverValidationError,
} from "../../services/covers/service";
import { enrichByIsbn } from "../../services/enrichment/service";
import { rehostCover } from "../../services/enrichment/cover";
import { recordChange } from "../../services/audit/repository";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/**
 * Cover upload API (#15, server-mediated — ADR-0009; `source` extended for #20).
 * Replaces a book's cover with a supplied image, stored via the Admin SDK.
 * Defaults to `coverSource: "user"` so re-enrichment won't overwrite it (design
 * D4/D5); the add-by-photo flow instead passes `source: "ai-photo"`, since a
 * captured photo was never a deliberate cover choice and stays eligible for
 * replacement by a re-enrich diff. The elevated JSON body limit for this path
 * is configured in `server/index.ts`.
 *
 *   POST /api/books/:id/cover  { imageBase64, contentType, source? }
 */
const router = Router();

const coverSchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
  source: z.enum(["user", "ai-photo"]).optional(),
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
    await updateBook(id, {
      coverUrl,
      coverSource: parsed.data.source ?? "user",
    });
    await recordChange({
      action: "update",
      entityType: "book",
      entityId: id,
      entityLabel: existing.title,
      changedFields: ["coverUrl", "coverSource"],
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json({ coverUrl });
  } catch (err) {
    if (err instanceof CoverValidationError) {
      return res.status(400).json({ error: err.message });
    }
    respondInternal(res, req, err);
  }
});

/**
 * Stock cover from the identification/enrichment source (Google Books, with
 * Open Library as complement — same providers `GET /api/enrich` uses). Looks
 * up the book's ISBN, re-hosts the source's cover to Firebase Storage (so the
 * book never depends on a fragile external URL), and stores it with
 * `coverSource: "metadata"` — eligible for later replacement, same as any
 * other enrichment-sourced cover.
 *
 *   POST /api/books/:id/cover/from-source
 */
router.post("/books/:id/cover/from-source", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  try {
    const existing = await getBook(id);
    if (!existing) return res.status(404).json({ error: "not found" });
    if (!existing.isbn13) {
      return res.status(400).json({ error: "book has no isbn" });
    }

    const candidate = await enrichByIsbn(existing.isbn13);
    if (!candidate?.coverUrl) {
      return res.status(404).json({ error: "no source cover found" });
    }

    const coverUrl = await rehostCover(candidate.coverUrl, existing.isbn13);
    if (!coverUrl) {
      return res.status(502).json({ error: "could not fetch source cover" });
    }

    await updateBook(id, { coverUrl, coverSource: "metadata" });
    await recordChange({
      action: "update",
      entityType: "book",
      entityId: id,
      entityLabel: existing.title,
      changedFields: ["coverUrl", "coverSource"],
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json({ coverUrl });
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
