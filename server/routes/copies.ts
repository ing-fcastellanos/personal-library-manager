import { Router } from "express";
import { copyCreateSchema, copyUpdateSchema } from "../../lib/types/copy";
import {
  listCopies,
  getCopy,
  updateCopy,
  deleteCopy,
  listCopiesByBook,
} from "../../services/copies/repository";
import {
  createCopy,
  ReferenceNotFoundError,
} from "../../services/copies/service";
import { recordChange } from "../../services/audit/repository";
import { changedFields } from "../../services/audit/diff";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";

/**
 * Copy API (server-mediated, ADR-0009). Reads are public; writes require a valid
 * session (ADR-0006). Create validates the referenced book/shelf exist (#12 D3).
 */
const router = Router();

router.get("/copies", async (_req, res) => {
  try {
    res.json(await listCopies());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

// Relationship read: copies of a book (#12).
router.get("/books/:bookId/copies", async (req, res) => {
  try {
    res.json(await listCopiesByBook(req.params.bookId as string));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/copies/:id", async (req, res) => {
  try {
    const copy = await getCopy(req.params.id);
    if (!copy) return res.status(404).json({ error: "not found" });
    res.json(copy);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/copies", requireAuth, async (req, res) => {
  const parsed = copyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createCopy(parsed.data));
  } catch (err) {
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/copies/:id", requireAuth, async (req, res) => {
  const parsed = copyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const id = req.params.id as string;
    const existing = await getCopy(id);
    if (!existing) return res.status(404).json({ error: "not found" });
    const copy = await updateCopy(id, parsed.data);
    if (!copy) return res.status(404).json({ error: "not found" });
    // Minimal change log (#15 D7).
    await recordChange({
      entity: "copy",
      entityId: id,
      changedFields: changedFields(
        existing as unknown as Record<string, unknown>,
        parsed.data as Record<string, unknown>,
      ),
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json(copy);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/copies/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteCopy(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
