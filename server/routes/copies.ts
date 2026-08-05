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
import { copyHasLoans } from "../../services/loans/repository";
import { getBook } from "../../services/books/repository";
import { recordChange } from "../../services/audit/repository";
import { changedFields } from "../../services/audit/diff";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/** "<book title> · ejemplar", falling back to a generic label if the book is gone. */
async function copyLabel(bookId: string): Promise<string> {
  const book = await getBook(bookId);
  return book ? `${book.title} · ejemplar` : "Ejemplar";
}

/**
 * Copy API (server-mediated, ADR-0009). Reads are public; writes require a valid
 * session (ADR-0006). Create validates the referenced book/shelf exist (#12 D3).
 */
const router = Router();

router.get("/copies", async (req, res) => {
  try {
    res.json(await listCopies());
  } catch (err) {
    respondInternal(res, req, err);
  }
});

// Relationship read: copies of a book (#12).
router.get("/books/:bookId/copies", async (req, res) => {
  try {
    res.json(await listCopiesByBook(req.params.bookId as string));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/copies/:id", async (req, res) => {
  try {
    const copy = await getCopy(req.params.id);
    if (!copy) return res.status(404).json({ error: "not found" });
    res.json(copy);
  } catch (err) {
    respondInternal(res, req, err);
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
    const copy = await createCopy(parsed.data);
    await recordChange({
      action: "create",
      entityType: "copy",
      entityId: copy.id,
      entityLabel: await copyLabel(copy.bookId),
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.status(201).json(copy);
  } catch (err) {
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    respondInternal(res, req, err);
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
    // Minimal change log (#15 D7, extended #40).
    await recordChange({
      action: "update",
      entityType: "copy",
      entityId: id,
      entityLabel: await copyLabel(existing.bookId),
      changedFields: changedFields(
        existing as unknown as Record<string, unknown>,
        parsed.data as Record<string, unknown>,
      ),
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json(copy);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.delete("/copies/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const existing = await getCopy(id);
    if (!existing) return res.status(404).json({ error: "not found" });
    // Block deletion while the copy has any loan (open or history) so loan history
    // is never orphaned and a lent-out copy can't be discarded (#39 design D7).
    if (await copyHasLoans(id)) {
      return res.status(409).json({ error: "copy has loans" });
    }
    const deleted = await deleteCopy(id);
    if (!deleted) return res.status(404).json({ error: "not found" });
    await recordChange({
      action: "delete",
      entityType: "copy",
      entityId: id,
      entityLabel: await copyLabel(existing.bookId),
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.status(204).end();
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;
