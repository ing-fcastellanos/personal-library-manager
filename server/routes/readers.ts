import { Router } from "express";
import { readerUpdateSchema } from "../../lib/types/reader";
import {
  listReaders,
  getReader,
  updateReader,
} from "../../services/readers/repository";

/**
 * Reader profile API (server-mediated, ADR-0009).
 * TODO(#7): protect the write routes with requireAuth once sessions exist.
 */
const router = Router();

router.get("/readers", async (_req, res) => {
  try {
    res.json(await listReaders());
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.get("/readers/:id", async (req, res) => {
  try {
    const reader = await getReader(req.params.id);
    if (!reader) return res.status(404).json({ error: "not found" });
    res.json(reader);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/readers/:id", async (req, res) => {
  const parsed = readerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const reader = await updateReader(req.params.id, parsed.data);
    if (!reader) return res.status(404).json({ error: "not found" });
    res.json(reader);
  } catch {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
