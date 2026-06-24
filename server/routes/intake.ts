import { Router } from "express";
import { z } from "zod";
import { bookCreateSchema } from "../../lib/types/book";
import { copyCreateSchema } from "../../lib/types/copy";
import { intakeBook } from "../../services/intake/service";
import { ReferenceNotFoundError } from "../../services/copies/service";
import { requireAuth } from "../middleware/require-auth";

/**
 * Manual book intake API (#14, server-mediated — ADR-0009). Creates a `Book` and
 * an owned `Copy` in one authenticated call and best-effort re-hosts the cover
 * (design D1/D2). Persisting reuses the catalog repositories; this endpoint only
 * orchestrates them.
 *
 *   POST /api/books/intake
 *   { book: BookCreateInput, copy?: {shelfId?,…}, coverSourceUrl?: string }
 */
const router = Router();

const intakeSchema = z.object({
  book: bookCreateSchema,
  copy: copyCreateSchema.omit({ bookId: true }).optional(),
  coverSourceUrl: z.string().url().nullish(),
});

router.post("/books/intake", requireAuth, async (req, res) => {
  const parsed = intakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const result = await intakeBook({
      book: parsed.data.book,
      copy: parsed.data.copy,
      coverSourceUrl: parsed.data.coverSourceUrl ?? null,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    res.status(500).json({ error: "internal" });
  }
});

export default router;
