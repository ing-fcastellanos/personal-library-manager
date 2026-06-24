import { Router } from "express";
import { bookCreateSchema, bookUpdateSchema } from "../../lib/types/book";
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from "../../services/books/repository";
import { bookHasCopies } from "../../services/copies/repository";
import { bookHasEvents } from "../../services/reading-events/repository";
import { recordChange } from "../../services/audit/repository";
import { changedFields } from "../../services/audit/diff";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";

/**
 * Book API (server-mediated, ADR-0009). Reads are public; writes require a valid
 * session (ADR-0006). Derived slug fields are computed server-side (#12 D2).
 */
const router = Router();

router.get("/books", async (_req, res) => {
  try {
    res.json(await listBooks());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/books/:id", async (req, res) => {
  try {
    const book = await getBook(req.params.id);
    if (!book) return res.status(404).json({ error: "not found" });
    res.json(book);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/books", requireAuth, async (req, res) => {
  const parsed = bookCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createBook(parsed.data));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/books/:id", requireAuth, async (req, res) => {
  const parsed = bookUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const id = req.params.id as string;
    const existing = await getBook(id);
    if (!existing) return res.status(404).json({ error: "not found" });
    const book = await updateBook(id, parsed.data);
    if (!book) return res.status(404).json({ error: "not found" });
    // Minimal change log (#15 D7): record which fields changed and by whom.
    await recordChange({
      entity: "book",
      entityId: id,
      changedFields: changedFields(
        existing as unknown as Record<string, unknown>,
        parsed.data as Record<string, unknown>,
      ),
      readerId: (req as AuthedRequest).reader!.id,
    });
    res.json(book);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/books/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    // Block deletion while the book still has copies or reading events (#12 D3).
    if ((await bookHasCopies(id)) || (await bookHasEvents(id))) {
      return res
        .status(409)
        .json({ error: "book has copies or reading events" });
    }
    const deleted = await deleteBook(id);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
