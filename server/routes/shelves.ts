import { Router } from "express";
import { shelfCreateSchema, shelfUpdateSchema } from "../../lib/types/shelf";
import {
  listShelves,
  getShelf,
  createShelf,
  updateShelf,
  deleteShelf,
} from "../../services/shelves/repository";
import { unshelveByShelf } from "../../services/copies/repository";
import { requireAuth } from "../middleware/require-auth";

/**
 * Shelf API (server-mediated, ADR-0009). Reads are public; writes require a
 * valid session (ADR-0006). Deleting a shelf desasociates its copies (#12 D3).
 */
const router = Router();

router.get("/shelves", async (_req, res) => {
  try {
    res.json(await listShelves());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/shelves/:id", async (req, res) => {
  try {
    const shelf = await getShelf(req.params.id);
    if (!shelf) return res.status(404).json({ error: "not found" });
    res.json(shelf);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.post("/shelves", requireAuth, async (req, res) => {
  const parsed = shelfCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createShelf(parsed.data));
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/shelves/:id", requireAuth, async (req, res) => {
  const parsed = shelfUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const shelf = await updateShelf(req.params.id as string, parsed.data);
    if (!shelf) return res.status(404).json({ error: "not found" });
    res.json(shelf);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/shelves/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    // Desasociate (don't block): unshelve any copies, then delete (#12 D3).
    await unshelveByShelf(id);
    const deleted = await deleteShelf(id);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
